# CAP Purchase Request Service — SAP Fiori Workflow + AI Analysis

Application Node.js basée sur le **SAP Cloud Application Programming Model (CAP)**, conçue comme une **extension side-by-side** d'un backend SAP RAP (RESTful ABAP Programming Model).

Le projet implémente un workflow de demandes d'achat avec :

- Workflow d'approbation Fiori
- Autorisation par instance (Employé / Manager)
- Gestion Header / Items
- Actions métier `submit`, `approve` et `reject`
- Dashboard analytique interactif
- Analyse intelligente par IA avec **Groq / Llama 3.3 70B**
- API OData V4
- Architecture préparée pour la consommation d'un service SAP RAP OData V4

Le backend SAP RAP a été développé indépendamment :

**SAP RAP repository:**  
[https://github.com/Zouguari/Sap_purchase_request](https://github.com/Zouguari/Sap_purchase_request)

---

# 🏗️ Architecture

## Target Architecture

L'architecture cible du projet est basée sur une approche **SAP RAP + SAP CAP Side-by-Side Extension**.

```text
┌─────────────────────────────────────────────────────────┐
│                       SAP RAP                           │
│                Purchase Request Backend                 │
│                                                         │
│  • Business Logic                                       │
│  • Validations                                          │
│  • Authorization                                        │
│  • Draft Management                                     │
│  • Transaction Management                               │
│  • submit / approve / reject                            │
└────────────────────────────┬────────────────────────────┘
                             │
                         OData V4
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    SAP CAP — Node.js                    │
│                 Side-by-Side Extension                  │
│                                                         │
│  • Remote Service Integration                           │
│  • Service Orchestration                                │
│  • AI Analysis                                          │
│  • Analytics                                            │
└────────────────────────────┬────────────────────────────┘
                             │
                         OData V4
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    SAP Fiori / UI5                      │
│                    Dashboard                            │
└─────────────────────────────────────────────────────────┘
```

## Current Development Architecture

Le backend SAP RAP a été développé séparément et expose un service OData V4 :

`ZUI_PURCHASEREQUEST`

Le modèle du service RAP a été importé dans le projet CAP à partir du véritable `$metadata` du service OData V4.

Les fichiers correspondants sont présents dans :

```text
srv/external/
├── ZUI_PURCHASEREQUEST.csn
└── ZUI_PURCHASEREQUEST.edmx
```

Cependant, l'environnement SAP Practice utilisé pour le développement nécessite une authentification interactive IAS/OAuth et ne fournit actuellement pas les credentials Machine-to-Machine nécessaires pour qu'une application CAP locale consomme directement le service RAP.

La connectivité réseau vers le endpoint RAP a néanmoins été vérifiée.

Pour cette raison, la version publique actuelle utilise une implémentation locale SQLite alignée sur le contrat et le workflow du backend RAP.

```text
┌──────────────────────────────┐
│     RAP-aligned SQLite       │
│       Local Backend          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│             SAP CAP — Node.js                │
│                                              │
│  • OData V4                                  │
│  • Workflow                                  │
│  • Authorization                             │
│  • AI / Groq                                 │
│  • Analytics                                 │
└──────────────┬───────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────┐
│             SAP Fiori / UI5                  │
│               Dashboard                      │
└──────────────────────────────────────────────┘
```

### Why a local simulation?

The CAP service was designed to consume the real OData V4 service exposed by the SAP RAP backend (`ZUI_PURCHASEREQUEST`).

The RAP service metadata was imported from the actual `$metadata` document and is already available in `srv/external/`.

A real CAP → RAP integration was tested up to the authentication layer. Network connectivity to the RAP endpoint was confirmed, but the practice environment requires interactive IAS/OAuth authentication and does not currently provide the machine-to-machine credentials required by the local CAP application.

Rather than bypassing the security model or using browser sessions/cookies, the project currently uses a local RAP-aligned implementation for development and demonstration.

The target architecture remains:

**SAP RAP → OData V4 → SAP CAP → AI / Analytics → SAP Fiori**

Once a suitable machine-to-machine authentication mechanism is available, the CAP data-access layer can be switched to the real RAP Remote Service with minimal changes.

---

# 📸 Application Overview

### 1. Manager View — Purchase Request List

Vue globale des demandes d'achat pour le rôle Manager, avec :
- Liste des demandes
- KPI
- Filtres
- SAP Fiori ShellBar
- Accès aux détails

![Vue Manager - Liste globale](cap-purchase-request/screenshots/01-list-purchase-requests.png)

### 2. Employee View — Purchase Request Details

Un employé peut consulter ses propres demandes d'achat.

Les demandes des autres employés ne sont pas accessibles.

![Vue Employé - Consultation](cap-purchase-request/screenshots/02-detail-with-items.png)

### 3. Employee View — Submit Purchase Request

Un employé peut soumettre une demande avec le statut :

`NEW` → `SUBMITTED`

Une notification est générée après la soumission.

![Vue Employé - Soumission](cap-purchase-request/screenshots/03-submit-action.png)

### 4. Manager View — Approve / Reject

Le Manager peut traiter les demandes soumises :

`SUBMITTED` → `APPROVED`

ou :

`SUBMITTED` → `REJECTED`

Lors d'un rejet, un motif est obligatoire.

![Vue Manager - Approbation / Rejet](cap-purchase-request/screenshots/04-approve-reject-workflow.png)

### 5. AI-Powered Purchase Request Analysis

Le projet intègre une couche d'analyse intelligente utilisant :

```text
Groq API
   ↓
Llama 3.3 70B
```

L'analyse retourne notamment :
- Catégorie suggérée
- Niveau de risque
- Résumé
- Détection d'anomalie
- Justification
- Recommandation

![Analyse intelligente par IA](cap-purchase-request/screenshots/05-ai-analysis-fiori.png)

### 6. Interactive Analytics

Le dashboard contient plusieurs visualisations :
- Répartition des demandes par statut
- Montants par catégorie
- Top 5 des demandes

Les données sont recalculées dynamiquement en fonction des données accessibles au rôle courant.

![Vue analytique interactive](cap-purchase-request/screenshots/06-analytics-view.png)

---

# ⚙️ Fonctionnalités

## Purchase Request Workflow

Le modèle utilise une structure Header / Items :

```text
PurchaseRequest
      │
      └── PurchaseRequestItems
```

Fonctionnalités :
- Création de demandes d'achat
- Gestion des items
- Calcul automatique de `ItemAmount`
- Calcul automatique de `TotalAmount`
- Workflow basé sur une machine à états

Transitions :

```text
NEW
 │
 │ submit
 ▼
SUBMITTED
 │
 ├── approve ──► APPROVED
 │
 └── reject ───► REJECTED
```

Les transitions invalides sont rejetées côté serveur.

## 🔐 Instance-Based Authorization

Le service applique des règles d'autorisation côté serveur.

### Employee

Un employé :
- ne peut consulter que ses propres demandes ;
- peut créer une demande ;
- peut soumettre uniquement ses demandes `NEW` ;
- ne peut pas approuver ou rejeter une demande.

### Manager

Un manager :
- peut consulter les demandes accessibles ;
- peut approuver une demande `SUBMITTED` ;
- peut rejeter une demande `SUBMITTED` ;
- doit fournir un motif lors d'un rejet.

Ces règles sont implémentées côté serveur et ne reposent pas uniquement sur le masquage des boutons dans l'interface.

Le comportement est conçu pour être cohérent avec les règles métier du backend RAP d'origine.

## 🤖 AI Analysis — Groq / Llama 3.3 70B

Le service expose une action OData V4 :

`analyzeWithAI()`

Cette action est exécutée à la demande et fonctionne en lecture seule.

Elle analyse les informations d'une demande d'achat et retourne :

```json
{
  "category": "...",
  "riskLevel": "...",
  "summary": "...",
  "anomaly": "...",
  "recommendation": "..."
}
```

### Exemple de détection

Une demande contenant un article avec un prix inhabituellement élevé peut être signalée comme anomalie.

Exemple :
- **Product:** Enterprise Server
- **Price:** 50,000 EUR

Le modèle peut identifier cette valeur comme potentiellement anormale et fournir une justification.

L'IA est utilisée comme couche d'enrichissement et ne remplace pas les règles métier transactionnelles.

## 📊 Analytics

Le dashboard fournit plusieurs indicateurs :

- **Requests by Status:** `NEW`, `SUBMITTED`, `APPROVED`, `REJECTED`
- **Amounts by Category:** Agrégation des montants des demandes par catégorie.
- **Top 5 Purchase Requests:** Classement des demandes selon leur montant.

Les agrégations sont calculées dynamiquement à partir des données disponibles.

---

# 🔌 RAP Integration

Le projet est préparé pour consommer le service RAP :

`ZUI_PURCHASEREQUEST`

via OData V4.

### Service cible :

`/sap/opu/odata4/sap/zui_purchaserequest_o4/srvd/sap/zui_purchaserequest/0001/`

Le modèle importé contient notamment :
- `PurchaseRequest`
- `PurchaseRequestItem`
- `I_DraftAdministrativeData`

**PurchaseRequest** — Les principales clés du service RAP sont :
- `PrId`
- `IsActiveEntity`

**PurchaseRequestItem** — Les principales clés sont :
- `ItemId`
- `IsActiveEntity`

### RAP Actions

Les actions métier exposées par le service RAP sont :
- `submit()`
- `approve()`
- `reject(REJECT_REASON)`

Le mapping prévu côté CAP est notamment :

```text
CAP frontend
    │
    │ reason
    ▼
CAP handler
    │
    │ REJECT_REASON
    ▼
RAP reject()
```

Les règles métier finales restent dans RAP lorsque le Remote Service réel est utilisé.

---

# 🧩 CAP Side-by-Side Extension

Le rôle de CAP dans l'architecture cible n'est pas de remplacer RAP.

La séparation des responsabilités est :

| Layer | Responsibility |
| :--- | :--- |
| **SAP RAP** | Transactional business logic |
| **SAP RAP** | Validations |
| **SAP RAP** | Authorization |
| **SAP RAP** | Draft management |
| **SAP RAP** | Purchase Request persistence |
| **SAP CAP** | Side-by-side extension |
| **SAP CAP** | Orchestration |
| **SAP CAP** | AI analysis |
| **SAP CAP** | Analytics |
| **SAP Fiori/UI5** | User interface |

L'objectif est donc d'éviter de dupliquer les règles métier du backend RAP dans CAP.

---

# 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | SAP CAP / Node.js |
| **Enterprise Backend Target** | SAP RAP / ABAP Cloud |
| **Service Protocol** | OData V4 |
| **Frontend** | SAP Fiori / UI5 Web Components |
| **UI Theme** | SAP Fiori Horizon |
| **Charts** | Chart.js v4 |
| **Local Database** | SQLite |
| **AI Provider** | Groq API |
| **AI Model** | Llama 3.3 70B |
| **API Architecture** | OData V4 |
| **Target Integration** | SAP RAP Remote Service |

---

# 📁 Project Structure

```text
cap-purchase-request/
│
├── app/
│   └── dashboard/
│       ├── index.html
│       └── ...
│
├── db/
│   ├── schema.cds
│   └── data/
│       ├── ...
│       └── ...
│
├── srv/
│   ├── service.cds
│   ├── service.js
│   ├── ai-analysis.js
│   │
│   └── external/
│       ├── ZUI_PURCHASEREQUEST.csn
│       └── ZUI_PURCHASEREQUEST.edmx
│
├── package.json
├── .gitignore
├── .env
└── README.md
```

> **Security Note:** `.env` and other files containing credentials must never be committed to Git.

---

# 🚀 Running the Project

### 1. Clone the repository
```bash
git clone https://github.com/Zouguari/cap-purchase-request.git
cd cap-purchase-request
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Groq API

Create a `.env` file at the project root:

```env
GROQ_API_KEY=your_groq_api_key
```

*Do not commit this file. Make sure `.env` is included in `.gitignore`.*

### 4. Start CAP
```bash
npx cds watch
```

## 🌐 Local Endpoints

- **Dashboard:** [http://localhost:4004/dashboard/index.html](http://localhost:4004/dashboard/index.html)
- **CAP OData V4 Service:** [http://localhost:4004/odata/v4/purchase-request](http://localhost:4004/odata/v4/purchase-request)
- **OData Metadata:** [http://localhost:4004/odata/v4/purchase-request/$metadata](http://localhost:4004/odata/v4/purchase-request/$metadata)

---

# 🔄 Current vs Target Integration

### Current Development Mode
```text
SQLite
  │
  ▼
SAP CAP
  │
  ├── Workflow
  ├── Authorization
  ├── AI
  └── Analytics
  │
  ▼
Fiori/UI5
```

SQLite is currently used as a local development backend.

### Target Production Architecture
```text
SAP RAP
  │
  │ OData V4
  ▼
SAP CAP
  │
  ├── AI
  ├── Analytics
  └── Orchestration
  │
  ▼
Fiori/UI5
```

The target architecture is designed so that RAP remains the transactional system of record while CAP provides side-by-side capabilities.

---

# 🔐 Authentication Considerations

The real RAP endpoint is protected by SAP's authentication infrastructure.

The local development environment currently does not have the required machine-to-machine credentials to access the RAP OData service directly.

The project therefore does not use:
- browser cookies;
- interactive login automation;
- personal browser sessions;
- authentication bypasses;
- hardcoded credentials.

When a suitable authentication mechanism is available, the expected integration can use a secure mechanism such as:
- **Communication User**

or:
- **OAuth2 Client Credentials**

with credentials managed outside the Git repository.

---

# 🔭 Limitations & Future Improvements

### Current Limitations

1. **RAP Remote Service:** The real RAP service is not currently consumed at runtime because the development environment does not provide the required machine-to-machine authentication credentials. The RAP OData metadata has nevertheless already been imported and integrated into the project structure.
2. **AI Risk Calibration:** The AI risk classification can occasionally produce `Medium` for a request that could reasonably be classified as `Low`. Possible improvement: stronger system prompts, explicit thresholds, structured output validation, domain-specific rules combined with LLM analysis.
3. **Automated Tests:** Automated tests should be added for workflow transitions, authorization rules, `submit`, `approve`, `reject`, AI analysis, and analytics calculations.

---

# 🚧 Future Roadmap

### Phase 1 — Current
```text
SAP CAP
  │
  ├── SQLite
  ├── Fiori
  ├── Workflow
  ├── Authorization
  ├── Analytics
  └── AI
```

### Phase 2 — RAP Integration
```text
SAP RAP
   │
   │ OData V4
   ▼
SAP CAP Remote Service
   │
   ├── Orchestration
   ├── AI
   └── Analytics
```

### Phase 3 — Cloud Deployment

Potential target architecture:

```text
SAP BTP
│
├── SAP CAP
│
├── Destination Service
│
├── Authentication
│
└── SAP RAP / ABAP Cloud
```

---

# 🎯 Project Goals

This project demonstrates how SAP technologies can be combined in a modern enterprise architecture:

```text
SAP RAP
   │
   │ OData V4
   ▼
SAP CAP
   │
   ├── Side-by-Side Extension
   ├── AI
   ├── Analytics
   └── Orchestration
   │
   ▼
SAP Fiori / UI5
```

The project focuses on understanding the separation of responsibilities between ABAP Cloud/RAP and CAP, while adding AI capabilities without embedding AI logic into the transactional backend.

---

# 👨‍💻 Author

**Yassine Zouguari**  
Engineering Student — Information Systems

Main areas of interest:
- SAP ABAP Cloud
- SAP RAP
- SAP CAP
- SAP Fiori / UI5
- Enterprise Application Development
- AI-powered Enterprise Applications

---

# 📚 Related Project

**SAP RAP — Purchase Request Backend**  
[https://github.com/Zouguari/Sap_purchase_request](https://github.com/Zouguari/Sap_purchase_request)

The RAP repository contains the transactional backend and business logic, while this repository focuses on the CAP side-by-side extension, Fiori experience, analytics and AI capabilities.
