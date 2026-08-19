require('dotenv').config();

/**
 * Analyse une demande d'achat avec l'API Groq (Llama 3.3 70B avec fallbacks dynamiques)
 * @param {Object} pr - L'objet PurchaseRequest avec ses Items
 * @returns {Promise<Object>} Le résultat de l'analyse au format JSON
 */
async function analyzePurchaseRequest(pr) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY manquante dans les variables d'environnement (.env)");
    }

    const itemsSummary = (pr.Items || []).map((it, idx) => 
        `- Article ${idx + 1}: ${it.Product || 'N/A'} | Quantité: ${it.Quantity || 0} ${it.Unit || ''} | Prix unitaire: ${it.Price || 0} ${it.Currency || 'EUR'} | Sous-total: ${it.ItemAmount || 0} ${it.Currency || 'EUR'}`
    ).join('\n');

    const promptText = `
Voici la demande d'achat à analyser :
- N° Demande: ${pr.PrNumber || pr.ID || 'N/A'}
- Demandeur: ${pr.Requester || 'N/A'}
- Description: ${pr.Description || 'N/A'}
- Catégorie déclarée: ${pr.Category || 'N/A'}
- Priorité: ${pr.Priority || 'N/A'}
- Statut actuel: ${pr.Status || 'N/A'}
- Date demandée: ${pr.RequestedDate || 'N/A'}
- Montant Total: ${pr.TotalAmount || 0} ${pr.Currency || 'EUR'}

Articles inclus :
${itemsSummary || 'Aucun article spécifié.'}
`;

    const systemPrompt = `Tu es un expert senior en gestion des approvisionnements, contrôle de gestion et audit financier d'entreprise.
Analyse la demande d'achat fournie ci-dessous et retourne STRICTEMENT un objet JSON valide sans aucun texte ni markdown autour, respectant exactement ce schéma :

{
  "category_suggestion": "string (ex: IT, Fournitures, Services, Matériel, etc.)",
  "risk_level": "Low" | "Medium" | "High",
  "summary": "string (résumé clair et concis en 2 phrases maximum)",
  "anomaly_detected": boolean (true si incohérence de prix, quantité anormale ou risque détecté, sinon false),
  "anomaly_reason": "string ou null (explication précise de l'anomalie si anomaly_detected est true, sinon null)",
  "recommendation": "string (recommandation claire pour l'approbateur)"
}`;

    const modelsToTry = [
        'llama-3.3-70b-versatile',
        'groq/compound',
        'openai/gpt-oss-120b',
        'qwen/qwen3.6-27b',
        'groq/compound-mini'
    ];

    let lastError = null;

    for (const model of modelsToTry) {
        try {
            const bodyPayload = {
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: promptText }
                ],
                temperature: 0.2
            };

            if (!model.includes('compound')) {
                bodyPayload.response_format = { type: 'json_object' };
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(bodyPayload)
            });

            if (!response.ok) {
                const errBody = await response.text().catch(() => '');
                lastError = new Error(`Model ${model} returned HTTP ${response.status}: ${errBody}`);
                if (response.status === 404 || response.status === 400) {
                    continue;
                }
                throw lastError;
            }

            const data = await response.json();
            let content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;

            if (!content) {
                throw new Error(`Aucun contenu retourné par le modèle ${model}`);
            }

            content = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

            const result = JSON.parse(content);

            return {
                category_suggestion: result.category_suggestion || pr.Category || 'Général',
                risk_level: result.risk_level || 'Low',
                summary: result.summary || 'Analyse effectuée.',
                anomaly_detected: Boolean(result.anomaly_detected),
                anomaly_reason: result.anomaly_reason || null,
                recommendation: result.recommendation || 'Procéder selon le workflow standard.'
            };
        } catch (err) {
            lastError = err;
        }
    }

    console.error("[IA Service Error]", lastError ? lastError.message : "Erreur inconnue");
    throw new Error(`Échec de l'analyse IA : ${lastError ? lastError.message : "Impossible de contacter l'API Groq"}`);
}

module.exports = { analyzePurchaseRequest };
