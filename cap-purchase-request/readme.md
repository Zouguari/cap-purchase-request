# CAP Purchase Request Service — Workflow SAP Fiori + Copilot IA

Application Node.js basée sur le SAP Cloud Application Programming Model (CAP), conçue pour étendre un backend SAP RAP (RESTful ABAP Programming Model) existant avec un workflow d'approbation Fiori, une autorisation par instance (Employé/Manager), une vue analytique interactive et une couche d'analyse intelligente propulsée par l'IA (Groq / Llama 3.3 70B).

Ce projet complète un backend RAP développé indépendamment ([voir le dépôt](https://github.com/Zouguari/Sap_purchase_request)), en démontrant comment SAP CAP peut être utilisé comme couche d'orchestration et d'intégration IA au-dessus d'un système SAP existant, sans dupliquer ni contourner sa logique métier.

---

## 🏗️ Architecture

```
┌───────────────────────────┐      ┌─────────────────────────────┐
│  CDS Model (db/schema.cds) │ ───► │  CAP Service (srv/service)  │
└───────────────────────────┘      └──────────────┬──────────────┘
                                                  │
                                                  ├──► 🤖 Groq AI API (Llama 3.3 70B)
                                                  │
                                                  ▼
┌───────────────────────────┐      ┌─────────────────────────────┐
│  SAP Fiori UI5 + Chart.js │ ◄─── │       OData V4 Endpoint     │
└───────────────────────────┘      └─────────────────────────────┘
```

> **Note d'architecture : pourquoi une simulation, et pas une connexion directe au RAP**  
> Le service CAP a été conçu pour se brancher directement sur le vrai service OData V4 exposé par le backend RAP (`ZUI_PURCHASEREQUEST`) — le modèle CDS a d'ailleurs été généré à partir du `$metadata` réel de ce service (`cds import`), et une première tentative d'intégration a été menée avec succès jusqu'à l'authentification.  
> Cette connexion nécessite cependant un accès SAP BTP Cockpit pour créer les identifiants OAuth machine-à-machine (*Communication Arrangement / Service Key*) — un accès non disponible dans le cadre d'un compte BTP Free Tier depuis mon pays de résidence.  
> Plutôt que d'attendre cet accès, j'ai choisi de simuler fidèlement le service RAP dans CAP (mêmes entités, mêmes champs, mêmes actions `submit`/`approve`/`reject`, mêmes règles de transition de statut) afin de :
> - comprendre en profondeur le fonctionnement de CAP (modèle CDS, services OData V4, actions liées, handlers Node.js) ;
> - construire et démontrer l'intégralité de la couche d'orchestration et d'IA sans dépendance externe ;
> - garder une architecture prête à être reconnectée au vrai RAP en ne changeant que la configuration de connexion, sans réécrire le service.

---

## 📸 Aperçu

### 1. Vue Manager — Liste globale des demandes d'achat
Vue globale des demandes d'achat pour le rôle Manager, avec cartes KPI, ShellBar SAP Fiori et filtres d'affichage.
![Vue Manager - Liste globale](screenshots/01-list-purchase-requests.png)

### 2. Vue Employé — Consultation d'une demande
Vue restreinte pour un Employé, ne visualisant que sa propre demande. Les boutons d'approbation/rejet sont masqués.
![Vue Employé - Consultation](screenshots/02-detail-with-items.png)

### 3. Vue Employé — Soumission d'une demande
Soumission d'une demande NEW par son demandeur, déclenchant la transition vers SUBMITTED avec notification.
![Vue Employé - Soumission](screenshots/03-submit-action.png)

### 4. Vue Manager — Approbation / Rejet
Validation d'une demande soumise par le Manager, avec confirmation de l'action.
![Vue Manager - Approbation / Rejet](screenshots/04-approve-reject-workflow.png)

### 5. Analyse intelligente par IA
Rapport d'analyse généré à la volée (Groq / Llama 3.3 70B), intégré dans le panneau Fiori : suggestion de catégorie, niveau de risque, détection d'anomalie et recommandation.
![Analyse intelligente par IA](screenshots/05-ai-analysis-fiori.png)

### 6. Vue analytique interactive
Onglet Analytics présentant 3 graphiques (répartition par statut, montants par catégorie, top 5 des demandes), calculés en temps réel selon le rôle actif.
![Vue analytique interactive](screenshots/06-analytics-view.png)

---

## ⚙️ Fonctionnalités

### Workflow métier
- Modèle header/items avec composition (`PurchaseRequests` → `PurchaseRequestItems`)
- Calcul automatique de `ItemAmount` et `TotalAmount`
- Machine à états : `NEW` → `SUBMITTED` → `APPROVED` ou `REJECTED` (motif obligatoire), avec rejet explicite de toute transition invalide

### Autorisation par instance (Employé/Manager)
- Un employé ne voit et ne peut soumettre que ses propres demandes, uniquement en statut `NEW`
- Seul un manager peut approuver ou rejeter
- Règles appliquées côté serveur (pas seulement masquées dans l'interface), reproduisant la logique `get_instance_authorizations` du backend RAP d'origine

### Analyse IA (Groq / Llama 3.3 70B)
- Action OData V4 liée `analyzeWithAI()`, exécutée à la demande, en lecture seule (aucune écriture en base)
- Retourne : catégorie suggérée, niveau de risque, résumé, détection d'anomalie avec justification, recommandation
- Validé sur cas réels : détection confirmée d'une anomalie de prix (ex. un article à 50 000 € correctement signalé comme suspect), et classification correcte d'une demande normale

### Vue analytique
- Répartition par statut, montants par catégorie, top 5 des demandes — recalculés dynamiquement selon le rôle et les données à jour

---

## 🛠️ Stack technique

| Composant | Technologie |
| :--- | :--- |
| **Backend** | SAP CAP (Cloud Application Programming Model) / Node.js |
| **Protocole de service** | OData V4, actions personnalisées (`submit`, `approve`, `reject`, `analyzeWithAI`) |
| **Base de données** | SQLite (in-memory, seed automatique via CSV) |
| **Design system UI** | SAP Fiori Horizon Theme, `@ui5/webcomponents` v2 |
| **Graphiques** | Chart.js v4 |
| **IA** | Groq API — `llama-3.3-70b-versatile` |

---

## 🚀 Lancer le projet

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la clé API (créer un fichier .env à la racine)
echo "GROQ_API_KEY=votre_cle_groq" > .env

# 3. Démarrer le serveur CAP
npx cds watch
```

- **Dashboard :** [http://localhost:4004/dashboard/index.html](http://localhost:4004/dashboard/index.html)
- **Endpoint OData V4 :** [http://localhost:4004/odata/v4/purchase-request](http://localhost:4004/odata/v4/purchase-request)

---

## 🔭 Limites connues & prochaines étapes

- Le niveau de risque IA n'est pas encore parfaitement calibré (une demande normale peut occasionnellement être classée Medium plutôt que Low) — piste d'amélioration : affiner le prompt système avec des seuils explicites.
- Connexion au backend RAP réel : dès obtention d'un accès BTP Cockpit (*Communication Arrangement / Service Key OAuth*), il suffira de mettre à jour la configuration `cds.requires.ZUI_PURCHASEREQUEST` — le modèle CDS a déjà été généré à partir du `$metadata` réel du service et est prêt à l'emploi.
- Tests automatisés à ajouter sur le workflow de transitions de statut.
