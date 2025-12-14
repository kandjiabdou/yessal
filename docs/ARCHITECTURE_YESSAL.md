# Architecture Flux Financier - Vue d'ensemble

## Diagramme de l'architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION MANAGER                          │
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   Frontend   │──────│   API REST   │──────│  Prisma ORM  │ │
│  │  (React/Vue) │      │   Express    │      │              │ │
│  └──────────────┘      └──────────────┘      └──────┬───────┘ │
│                                                      │         │
└──────────────────────────────────────────────────────┼─────────┘
                                                       │
                              ┌────────────────────────┼───────────────────┐
                              │                        │                   │
                              ▼                        ▼                   ▼
                    ┌──────────────────┐    ┌──────────────────┐  ┌──────────────┐
                    │  DB Manager      │    │  DB Shared       │  │  DB Associé  │
                    │  ────────────    │    │  ────────────    │  │  (futur)     │
                    │  • users         │    │  • FluxFinancier │  │              │
                    │  • sitelavage    │    │                  │  │              │
                    │  • commandes     │    │  Partagée entre  │  │              │
                    │  • ...           │    │  Manager et      │  │              │
                    │                  │    │  Associé         │  │              │
                    └──────────────────┘    └──────────────────┘  └──────────────┘
                                                       ▲
┌──────────────────────────────────────────────────────┼─────────┐
│                    APPLICATION ASSOCIÉ (futur)       │         │
│                                                      │         │
│  ┌──────────────┐      ┌──────────────┐      ┌──────┴───────┐ │
│  │   Frontend   │──────│   API REST   │──────│  Prisma ORM  │ │
│  │  (React/Vue) │      │   Express    │      │              │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Flux de données

### 1. Création d'un flux financier (Manager)

⚠️ **Important** : Un flux financier **doit obligatoirement avoir au moins une pièce jointe** (preuve).

```
Manager Frontend
    │
    │ POST /api/flux-financier
    │ { type: "depense", montant: 50000, ... }
    ▼
API Manager (Express)
    │
    │ authenticate() → Vérifier JWT
    │ authorize(['ASSOCIE']) → Vérifier rôle
    ▼
FluxFinancierController.createFlux()
    │
    │ Validation des données
    │ - Type = depense ou recette uniquement
    │ - Montant > 0
    │ - Date valide
    ▼
FluxFinancierService.createFlux()
    │
    │ 1. Vérifier laverie existe (Prisma Manager)
    │ 2. Vérifier user existe (Prisma Manager)
    │ 3. Enrichir les données:
    │    - devise = FCFA
    │    - sourceApp = manager
    │    - statut = pending
    │    - status = pending
    │    - laverieName = nom de la laverie
    ▼
Prisma Shared Client
    │
    │ INSERT INTO FluxFinancier
    ▼
DB Shared (MySQL)
    │
    │ Flux créé avec succès
    ▼
Manager Frontend
    │
    │ Upload fichiers → File Service
    │ POST /api/flux-financier/:id/preuves (pour chaque fichier)
    │ ⚠️ Au moins 1 preuve obligatoire
    ▼
Réponse au Frontend
    { success: true, data: { id, type, montant, preuves: [...] } }
```

### 2. Consultation des flux (Manager)

```
Manager Frontend
    │
    │ GET /api/flux-financier?laverieId=1&type=depense
    ▼
API Manager
    │
    │ authenticate() + authorize()
    ▼
FluxFinancierController.getAllFlux()
    │
    │ Extraction des filtres
    ▼
FluxFinancierService.getAllFlux()
    │
    │ WHERE:
    │  - sourceApp = 'MANAGER'
    │  - createdBy = userId (utilisateur connecté)
    │  - laverieId = 1
    │  - type = 'depense'
    │  - flagged = false
    ▼
Prisma Shared Client
    │
    │ SELECT * FROM FluxFinancier WHERE ...
    ▼
DB Shared
    │
    │ Retourne les flux + pagination
    ▼
Réponse au Frontend
    { data: [...], pagination: { total, page, ... } }
```

### 3. Validation par un Associé (futur)

```
Associé Frontend
    │
    │ PUT /api/flux-financier/1/validate
    ▼
API Associé
    │
    │ authenticate() + authorize(['ASSOCIE'])
    ▼
FluxFinancierController.validateFlux()
    │
    │ Vérification:
    │ - Flux existe
    │ - status = pending
    ▼
FluxFinancierService.validateFlux()
    │
    │ UPDATE:
    │  - status = validated
    │  - validatedBy = associeId
    │  - statut = validated
    ▼
Prisma Shared Client
    │
    │ UPDATE FluxFinancier SET ...
    ▼
DB Shared
    │
    │ Flux validé
    ▼
(Optionnel) Notification au Manager
```

## Séparation des responsabilités

### API Manager (`api-yessal`)

**Responsabilités :**
- Authentification des managers
- Création de dépenses et recettes
- Consultation de leurs propres flux
- Modification/suppression des flux en attente
- Statistiques par laverie

**Contraintes :**
- Ne peut créer que type = `depense` ou `recette`
- Ne voit que ses propres flux (`createdBy = userId`)
- Ne peut modifier que si `status = pending`
- Tous les flux créés ont `sourceApp = manager`

**Fichiers principaux :**
```
api-yessal/
├── src/
│   ├── controllers/fluxFinancierController.js
│   ├── services/fluxFinancierService.js
│   ├── routes/fluxFinancierRoute.js
│   └── utils/prismaSharedClient.js
```

### API Associé (futur - `api-associe`)

**Responsabilités :**
- Authentification des associés
- Consultation de TOUS les flux (manager + associé)
- Validation/rejet des flux créés par les managers
- Création de prêts et emprunts
- Vue globale des finances

**Droits supplémentaires :**
- Peut créer type = `depense`, `recette`, `emprunt`, `pret`
- Voit tous les flux (`sourceApp = manager OR associe`)
- Peut valider les flux des managers
- Peut générer des rapports globaux

**Fichiers principaux (à créer) :**
```
api-associe/
├── src/
│   ├── controllers/fluxFinancierController.js  (version étendue)
│   ├── services/fluxFinancierService.js
│   ├── routes/fluxFinancierRoute.js
│   └── utils/prismaSharedClient.js
```

### Base de données partagée (`shared-database`)

**Responsabilités :**
- Stockage centralisé des flux financiers
- Schéma Prisma unique
- Migrations partagées

**Structure :**
```
shared-database/
└── prisma/
    ├── schema.prisma      # Schéma FluxFinancier
    ├── package.json
    ├── migrations/        # Historique des migrations
    └── generated/
        └── shared/        # Client Prisma généré
```

**Avantages :**
- Source unique de vérité
- Pas de duplication de données
- Facilite les rapports consolidés
- Évite les incohérences

### Relations avec les autres tables

```
FluxFinancier.laverieId ──┐
                          │
                          ▼
                    sitelavage.id  (DB Manager)
                    
FluxFinancier.createdBy ──┐
                          │
                          ▼
                    user.id        (DB Manager ou Associé)
```

**Note :** Les relations sont "logiques" mais pas en clé étrangère car les tables sont dans des bases différentes.

## Sécurité et permissions

### Matrice de permissions

| Action                    | Manager | Associé |
|---------------------------|---------|---------|
| Créer dépense/recette     | ✅      | ✅      |
| Créer prêt/emprunt        | ❌      | ✅      |
| Voir ses propres flux     | ✅      | ✅      |
| Voir tous les flux        | ❌      | ✅      |
| Modifier flux pending     | ✅ (sien)| ✅ (tous)|
| Modifier flux validated   | ❌      | ✅      |
| Supprimer flux pending    | ✅ (sien)| ✅ (tous)|
| Valider flux              | ❌      | ✅      |
| Rejeter flux              | ❌      | ✅      |

### Workflow de validation

```
Manager crée flux
    │
    ▼
┌──────────────┐
│   PENDING    │ ← État initial
└──────┬───────┘
       │
       │ Associé examine
       │
    ┌──┴──┐
    │     │
    ▼     ▼
VALIDATED  REJECTED
    │
    │ Flux apparaît dans les rapports officiels
    ▼
```

## Évolution future

### Phase 1 : Manager (✅ Actuel)
- Création dépenses/recettes
- Consultation de ses flux
- Statistiques par laverie

### Phase 2 : Associé (À venir)
- Vue globale tous flux
- Validation/rejet
- Création prêts/emprunts
- Rapports consolidés

### Phase 3 : Fichiers (À venir)
- Service de gestion de fichiers dédié
- Upload de preuves (images, PDF)
- Stockage sécurisé (S3, Drive, etc.)
- OCR pour extraction automatique

### Phase 4 : Analytics (À venir)
- Dashboard avancé
- Graphiques temps réel
- Prédictions IA
- Export Excel/PDF
- Rapports planifiés

## Points d'attention

### 1. Performance
- Indexer les colonnes fréquemment filtrées
- Paginer les résultats
- Mettre en cache les statistiques

### 2. Sécurité
- Toujours vérifier `createdBy` pour les managers
- Valider strictement le `type` selon le rôle
- Logger toutes les modifications
- HTTPS obligatoire en production
- ⚠️ **Validation des preuves** : Au moins une preuve obligatoire par flux

### 3. Cohérence
- Toujours utiliser Prisma (pas de requêtes SQL directes)
- Respecter les enum définis
- Ne jamais supprimer physiquement (flagged = true)
- ⚠️ **Impossibilité de supprimer la dernière preuve** : Garantit la traçabilité

### 4. Monitoring
- Logger les créations/modifications
- Alertes sur montants anormaux
- Audit trail des validations
- ⚠️ **Alertes sur flux sans preuve** : Détecter les flux créés sans pièce jointe

---

**Auteur :** Équipe Yessal  
**Date :** Février 2025  
**Version :** 1.0.0
