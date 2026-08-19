# CAP Purchase Request Service (+ AI Copilot & SAP Fiori UI)

> Application Node.js basée sur **SAP Cloud Application Programming Model (CAP)** qui étend un backend SAP RAP (RESTful Application Programming) existant avec un workflow d'approbation Fiori, une simulation de rôles par instance (Employé/Manager) et une couche d'analyse intelligente propulsée par l'IA (Groq / Llama 3.3 70B).

---

## 🏗️ Architecture du Projet

```
┌───────────────────────────┐      ┌─────────────────────────────┐
│  CDS Model (db/schema.cds) │ ───► │  CAP Service (srv/service)  │
└───────────────────────────┘      └──────────────┬──────────────┘
                                                  │
                                                  ├──► 🤖 Groq AI API (Llama 3.3 70B)
                                                  │
                                                  ▼
┌───────────────────────────┐      ┌─────────────────────────────┐
│  SAP Fiori UI5 Web Comp.  │ ◄─── │       OData V4 Endpoint     │
└───────────────────────────┘      └─────────────────────────────┘
```

> **Note d'Architecture :** Le service CAP simule actuellement le service SAP RAP réel (`ZUI_PURCHASEREQUEST`) avec la même structure d'entités et les mêmes actions (`submit`, `approve`, `reject`). Il pourra être connecté directement au service RAP distant via SAP Cloud SDK sans modifier l'interface utilisateur.

---

## 📸 Aperçu & Captures d'Écran (Interface SAP Fiori)

### 1. Vue Manager — Liste Globale des Demandes d'Achat
Vue globale des demandes d'achat pour le rôle **Manager** avec cartes KPI, ShellBar SAP Fiori et filtres d'affichage.
![Vue Manager - Liste Globale](screenshots/01-list-purchase-requests.png)

### 2. Vue Employé — Consultation d'une Demande (`mlefevre`)
Vue restreinte pour un **Employé** (`mlefevre`) ne visualisant que sa propre demande. Les boutons d'approbation/rejet sont masqués.
![Vue Employé - Consultation](screenshots/02-detail-with-items.png)

### 3. Vue Employé — Action de Soumission (`zouguari`)
Soumission d'une demande d'achat `NEW` par son demandeur (`zouguari`), déclenchant la mise à jour à l'état `SUBMITTED` avec notification toast.
![Vue Employé - Action Soumettre](screenshots/03-submit-action.png)

### 4. Vue Manager — Action d'Approbation & Rejet
Validation d'une demande soumise par le **Manager** avec notification de confirmation `Action 'approve' exécutée avec succès !`.
![Vue Manager - Action Approuver/Rejeter](screenshots/04-approve-reject-workflow.png)

### 5. Analyse Intelligente par IA — Rapport SAP Fiori (Groq Llama 3.3 70B)
Rapport d'analyse généré à la volée par l'IA Groq intégré dans le panneau SAP Fiori avec suggestion de catégorie, résumé et recommandation.
![Rapport d'Analyse IA Fiori](screenshots/05-ai-analysis-fiori.png)

---

## 🤖 Analyse IA (Groq / Llama 3.3 70B)

### Principe de fonctionnement
Le service intègre une action OData V4 liée `analyzeWithAI()` exécutée à la demande. Elle extrait la demande d'achat et la totalité de ses articles associés, puis sollicite l'API **Groq** via le modèle `llama-3.3-70b-versatile`. 
*Cette analyse est effectuée en lecture seule, sans altération ni écriture en base de données.*

### Données analysées & retournées
L'IA génère un rapport structuré en JSON contenant :
- **Catégorie suggérée :** Reclassification intelligente selon la nature des produits.
- **Niveau de risque :** Évaluation globale (`Low`, `Medium`, `High`).
- **Résumé synthétique :** Explication synthétique en 2 phrases maximum.
- **Détection d'anomalie :** Booléen (`anomaly_detected`) accompagné de sa justification (`anomaly_reason`).
- **Recommandation décisionnelle :** Conseil clair pour l'approbateur.

### Exemple concret (Preuve de détection d'anomalie)
Test réalisé sur un cas suspect (Demande d'achat d'un stylo bille à **50 000,00 EUR**) :

```json
{
  "@odata.context": "../$metadata#AIAnalysisResult",
  "category_suggestion": "Fournitures de bureau",
  "risk_level": "High",
  "summary": "Demande d'achat pour un stylo bille bleu d'un montant total de 50 000 EUR. Le prix unitaire semble anormalement élevé.",
  "anomaly_detected": true,
  "anomaly_reason": "Le prix unitaire de 50 000 EUR pour un stylo bille est incohérent avec les tarifs habituels du marché.",
  "recommendation": "Vérifier la cohérence du prix avec les fournisseurs avant toute approbation."
}
```

---

## 🛠️ Stack Technique

- **Framework Backend :** SAP CAP (Cloud Application Programming Model) / Node.js
- **Design System UI :** SAP Fiori Horizon Theme (`--sapBrandColor`, `--sapBackgroundColor`, police Fiori 72)
- **Composants UI :** `@ui5/webcomponents` v2 (`ui5-shellbar`, `ui5-panel`, `ui5-object-status`, `ui5-badge`, `ui5-button`)
- **Moteur IA :** Groq API (Modèle LLM `llama-3.3-70b-versatile` / `groq/compound`)
- **Protocole de Service :** OData V4 (avec Actions personnalisées `submit`, `approve`, `reject`, `analyzeWithAI`)
- **Base de Données :** SQLite (In-Memory avec initialisation CSV automatique)

---

## ⚙️ Fonctionnalités Clés

- **Interface SAP Fiori Horizon :** ShellBar avec sélecteur de rôle, cartes KPI, tableaux réactifs et badges de statut Fiori `ui5-object-status` (`Positive`, `Critical`, `Negative`, `Informative`).
- **Simulation de Rôles & Autorisation par Instance :**
  - Mode **Employé** : l'utilisateur ne voit que ses propres demandes et ne peut soumettre que ses demandes à l'état `NEW`.
  - Mode **Manager** : accès global à toutes les demandes et droits d'approbation/rejet.
  - Sécurité backend : rejet HTTP 403 en cas de tentative d'action non autorisée.
- **Calcul Automatique des Montants :**
  - Recalcul dynamique de `ItemAmount` (`Quantity * Price`).
  - Agrégation automatique du `TotalAmount` global.

---

## ⚠️ Limites Connues

- **Calibrage de la sévérité du risque :** Le niveau de risque (`risk_level`) attribué par le modèle LLM peut parfois être évalué à `Medium` au lieu de `Low` sur certains achats standards ordinaires selon la formulation des descriptions.
- **Base de données In-Memory :** En mode développement local (`cds watch`), la base SQLite est réinitialisée au redémarrage à partir des fichiers CSV.

---

## 🚀 Comment Lancer le Projet

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration des variables d'environnement
Vérifiez ou créez le fichier `.env` à la racine :
```env
GROQ_API_KEY=votre_cle_groq_api
```

### 3. Démarrer le serveur CAP
```bash
npx cds watch
```

### 4. Accéder à l'application
- **Dashboard UI Fiori :** [http://localhost:4004/dashboard/index.html](http://localhost:4004/dashboard/index.html)
- **Endpoint OData V4 :** [http://localhost:4004/odata/v4/purchase-request](http://localhost:4004/odata/v4/purchase-request)

---

## 🔮 Prochaines Étapes

- **Connexion au backend SAP RAP distant :** Activation de la liaison OData V4 directe avec le service S/4HANA Cloud / BTP (`ZUI_PURCHASEREQUEST`) dès l'obtention des identifiants BTP définitifs. *(Toute l'architecture CDS, les entités et la couche d'orchestration sont déjà prêtes ; seule la configuration de connexion nécessitera une mise à jour).*
