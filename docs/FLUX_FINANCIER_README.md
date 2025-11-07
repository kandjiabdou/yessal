# Module Flux Financier - API Manager

## Vue d'ensemble

Ce module permet aux gérants de saisir et gérer les **dépenses** et **recettes** liées à leurs laveries. Les données sont stockées dans une base de données partagée (`shared-database`) accessible également par l'application Associé.

## Architecture

```
api-yessal/
├── src/
│   ├── controllers/
│   │   └── fluxFinancierController.js    # Contrôleur REST
│   ├── services/
│   │   └── fluxFinancierService.js       # Logique métier
│   ├── routes/
│   │   └── fluxFinancierRoute.js         # Routes API
│   └── utils/
│       └── prismaSharedClient.js         # Client Prisma pour base partagée
│
shared-database/
└── prisma/
    └── schema.prisma                     # Schéma de la base partagée
```

## Installation

### 1. Installer les dépendances

```bash
# Dans le dossier shared-database/prisma
cd shared-database/prisma
npm install

# Dans le dossier api-yessal
cd ../../api-yessal
npm install
```

### 2. Configuration des variables d'environnement

Créer un fichier `.env` dans `api-yessal/` :

```env
# Base de données principale (utilisateurs, laveries, etc.)
DATABASE_URL="mysql://user:password@localhost:3306/yessal_manager"

# Base de données partagée (flux financiers)
DATABASE_SHARED_URL="mysql://user:password@localhost:3306/yessal_shared"

# Autres configs...
JWT_SECRET="your_secret_key"
PORT=4520
```

### 3. Générer les clients Prisma

```bash
# Générer le client pour la base partagée
cd shared-database/prisma
npx prisma generate

# Générer le client pour la base manager
cd ../../api-yessal
npx prisma generate
```

### 4. Créer les migrations

```bash
# Créer la base de données partagée
cd shared-database/prisma
npx prisma migrate dev --name init

# Si la base manager existe déjà, rien à faire
```

## Utilisation

### Endpoints disponibles

Tous les endpoints nécessitent une authentification Bearer Token et le rôle `Manager` ou `Gerant`.

#### 1. Créer un flux financier (dépense ou recette)

⚠️ **Important** : Un flux financier doit obligatoirement avoir au moins une pièce jointe (preuve).

**Workflow recommandé** :
1. Créer le flux financier sans preuves
2. Uploader les fichiers vers le file-service
3. Ajouter chaque preuve au flux avec `POST /api/flux-financier/:id/preuves`

```http
POST /api/flux-financier
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "depense",              // REQUIS: "depense" ou "recette"
  "montant": 50000,               // REQUIS: montant en FCFA
  "dateFluxFinancier": "2025-02-01T10:00:00Z",  // REQUIS
  "motif": "Achat de détergent",  // OPTIONNEL
  "beneficiaire": "Fournisseur ABC", // OPTIONNEL
  "sourceFinancement": "caisse",  // OPTIONNEL: caisse, banque, emprunt, autre
  "description": "Achat mensuel", // OPTIONNEL
  "laverieId": 1                  // OPTIONNEL: ID de la laverie
}
```

**Note** : Après création, vous devez immédiatement ajouter au moins une preuve via `POST /api/flux-financier/:id/preuves`.

**Réponse :**
```json
{
  "success": true,
  "message": "Flux financier créé avec succès",
  "data": {
    "id": 1,
    "type": "depense",
    "montant": 50000,
    "devise": "FCFA",
    "dateFluxFinancier": "2025-02-01T10:00:00Z",
    "sourceApp": "manager",
    "statut": "pending",
    "status": "pending",
    ...
  }
}
```

#### 2. Récupérer tous les flux du manager connecté

```http
GET /api/flux-financier?type=depense&page=1&limit=50
Authorization: Bearer {token}
```

**Paramètres de requête :**
- `type` : `depense` ou `recette`
- `laverieId` : ID de la laverie
- `startDate` : Date de début (format ISO)
- `endDate` : Date de fin (format ISO)
- `status` : `pending`, `validated`, `rejected`
- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre par page (défaut: 50)

#### 3. Récupérer un flux par ID

```http
GET /api/flux-financier/{id}
Authorization: Bearer {token}
```

#### 4. Récupérer les flux d'une laverie

```http
GET /api/flux-financier/laverie/{laverieId}?type=recette&startDate=2025-01-01
Authorization: Bearer {token}
```

#### 5. Obtenir les statistiques d'une laverie

```http
GET /api/flux-financier/laverie/{laverieId}/stats?startDate=2025-01-01&endDate=2025-01-31
Authorization: Bearer {token}
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "depenses": {
      "total": 150000,
      "count": 5
    },
    "recettes": {
      "total": 300000,
      "count": 12
    },
    "solde": 150000,
    "devise": "FCFA"
  }
}
```

#### 6. Mettre à jour un flux

```http
PUT /api/flux-financier/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "montant": 55000,
  "description": "Description mise à jour"
}
```

**Restrictions :**
- Seul le créateur peut modifier
- Uniquement si `status = "pending"`
- Champs modifiables : `montant`, `dateFluxFinancier`, `motif`, `beneficiaire`, `sourceFinancement`, `description`, `preuveUrl`

#### 7. Supprimer un flux

```http
DELETE /api/flux-financier/{id}
Authorization: Bearer {token}
```

**Restrictions :**
- Seul le créateur peut supprimer
- Uniquement si `status = "pending"`
- Soft delete (flag `flagged = true`)
- Supprime automatiquement toutes les preuves associées

#### 8. Ajouter une preuve à un flux

⚠️ **Obligatoire** : Chaque flux doit avoir au moins une preuve

```http
POST /api/flux-financier/{id}/preuves
Authorization: Bearer {token}
Content-Type: application/json

{
  "fileId": "uuid-xxx",
  "filename": "facture.pdf",
  "downloadUrl": "http://localhost:4600/api/files/download/uuid-xxx",
  "mimetype": "application/pdf",
  "size": 245678
}
```

#### 9. Supprimer une preuve

⚠️ **Restriction** : Impossible de supprimer la dernière preuve (au moins une preuve obligatoire)

```http
DELETE /api/flux-financier/preuves/{preuveId}
Authorization: Bearer {token}
```

**Erreur si dernière preuve** :
```json
{
  "success": false,
  "message": "Impossible de supprimer la dernière preuve. Au moins une preuve est obligatoire."
}
```

## Règles métier

### Champs automatiques

À la création d'un flux par un manager :
- `devise` : toujours `FCFA`
- `sourceApp` : toujours `manager`
- `statut` : toujours `pending`
- `status` : toujours `pending`
- `createdBy` : ID de l'utilisateur connecté
- `laverieName` : récupéré automatiquement si `laverieId` fourni
- ⚠️ **Au moins une preuve obligatoire** : Doit être ajoutée immédiatement après création

### Permissions

- **Création** : Manager ou Gérant
- **Lecture** : Manager ou Gérant (seulement ses propres flux)
- **Modification** : Créateur uniquement, si statut = pending
- **Suppression** : Créateur uniquement, si statut = pending

### Validation

- Le `type` doit être `"depense"` ou `"recette"` uniquement
- Le `montant` doit être un nombre positif
- La `laverieId` doit exister dans la base manager
- L'utilisateur `createdBy` doit exister
- ⚠️ **Au moins une preuve obligatoire** : Chaque flux doit avoir au moins un fichier attaché
- **Suppression de preuve interdite** : Impossible de supprimer la dernière preuve d'un flux

## Tests

Créer des tests pour vérifier :

```bash
npm test -- fluxFinancier
```

## Swagger Documentation

La documentation Swagger est accessible à :
```
http://localhost:4520/api-docs
```

Cherchez la section **Flux Financier**.

## Notes importantes

1. **Base de données séparée** : Les flux sont dans `yessal_shared`, pas dans `yessal_manager`
2. **Pas de cascade delete** : Si une laverie est supprimée, les flux restent (mais `laverieId` peut être NULL)
3. **Validation par les associés** : Les managers créent, les associés valident (fonctionnalité dans l'app Associé)
4. **Fichiers** : Les `preuveUrl` doivent être gérés par un service de fichiers externe (à implémenter plus tard)

## Évolution future

- Service de gestion de fichiers pour les preuves
- Notifications aux associés lors de création
- Export en PDF/Excel
- Dashboard de visualisation

## Support

Pour toute question, contacter l'équipe de développement.
