# Exemples d'utilisation UserReference

## Backend - Créer un flux avec UserReference

```javascript
// api-yessal/src/services/fluxFinancierService.js

async createFlux(fluxData) {
  const { createdBy, laverieId } = fluxData;

  // ✅ Obtenir ou créer automatiquement la référence utilisateur
  const userRefId = await userReferenceService.getOrCreateUserRef(createdBy, 'MANAGER');

  // Créer le flux avec la référence
  const flux = await prismaShared.fluxFinancier.create({
    data: {
      type: fluxData.type,
      montant: fluxData.montant,
      // ... autres champs
      createdByRefId: userRefId,  // ✅ Utilise la référence
      sourceApp: 'MANAGER'
    },
    include: {
      createdByRef: true,     // ✅ Inclut les infos utilisateur
      validatedByRef: true,
      preuves: true
    }
  });

  // ✅ Le flux retourné contient directement:
  // flux.createdByRef.nom
  // flux.createdByRef.prenom
  return flux;
}
```

## Backend - Vérifier les permissions

```javascript
// Avant (ancien système)
if (flux.createdBy !== String(userId)) {
  throw new Error('Seul le créateur peut modifier ce flux');
}

// Après (avec UserReference)
async _checkFluxPermissions(flux, userId, action) {
  // Obtenir la référence de l'utilisateur courant
  const userRefId = await userReferenceService.getOrCreateUserRef(userId, 'MANAGER');
  
  // Comparer avec la référence du créateur
  if (flux.createdByRefId !== userRefId) {
    throw new Error(`Seul le créateur peut ${action} ce flux`);
  }
}
```

## Backend - Synchroniser les infos utilisateur

```javascript
// Si un utilisateur change de nom dans la base locale
const userId = 5;
const userRefId = await userReferenceService.getOrCreateUserRef(userId, 'MANAGER');

// Mettre à jour les infos
await userReferenceService.syncUserInfo(userRefId);

// Les flux créés par cet utilisateur afficheront le nouveau nom
```

## Frontend - Afficher le créateur (FluxItem)

```tsx
// manager-app-yessal/src/components/finance/FluxItem.tsx

const FluxItem: React.FC<FluxItemProps> = ({ flux }) => {
  // ✅ Formater le nom complet
  const formatUserName = (userRef?: { nom?: string; prenom?: string }) => {
    if (!userRef) return null;
    if (userRef.prenom && userRef.nom) {
      return `${userRef.prenom} ${userRef.nom}`;
    }
    return userRef.prenom || userRef.nom || 'Utilisateur';
  };

  const createdByName = formatUserName(flux.createdByRef);

  return (
    <div>
      <h3>{flux.motif || 'Sans motif'}</h3>
      {createdByName && (
        <p className="text-xs text-gray-500">
          Par {createdByName}
        </p>
      )}
    </div>
  );
};
```

## Frontend - Détails complets (FluxDetailDialog)

```tsx
// manager-app-yessal/src/components/finance/FluxDetailDialog.tsx

const FluxDetailDialog: React.FC = ({ flux }) => {
  const formatUserName = (userRef?: { nom?: string; prenom?: string }) => {
    if (!userRef) return 'Inconnu';
    if (userRef.prenom && userRef.nom) {
      return `${userRef.prenom} ${userRef.nom}`;
    }
    return userRef.prenom || userRef.nom || 'Utilisateur';
  };

  return (
    <div>
      <h3>Informations système</h3>
      
      {/* ✅ Créateur */}
      <div>
        <span>Créé par :</span>
        <span>{formatUserName(flux.createdByRef)}</span>
      </div>
      <div>
        <span>Créé le :</span>
        <span>{formatDateTime(flux.createdAt)}</span>
      </div>

      {/* ✅ Validateur (si le flux est validé) */}
      {flux.validatedByRef && flux.validatedAt && (
        <>
          <div>
            <span>Validé par :</span>
            <span>{formatUserName(flux.validatedByRef)}</span>
          </div>
          <div>
            <span>Validé le :</span>
            <span>{formatDateTime(flux.validatedAt)}</span>
          </div>
        </>
      )}
    </div>
  );
};
```

## API Response - Structure des données

### Ancien format (avant UserReference)
```json
{
  "id": 123,
  "type": "depense",
  "montant": 50000,
  "motif": "Achat détergent",
  "createdBy": "5",           // ❌ ID brut
  "validatedBy": "2",         // ❌ ID brut
  "status": "validated",
  "createdAt": "2025-02-01T10:00:00Z",
  "validatedAt": "2025-02-02T14:30:00Z"
}
```

### Nouveau format (avec UserReference)
```json
{
  "id": 123,
  "type": "depense",
  "montant": 50000,
  "motif": "Achat détergent",
  "createdByRefId": "uuid-xxx-xxx",
  "createdByRef": {                    // ✅ Infos directement disponibles
    "id": "uuid-xxx-xxx",
    "sourceApp": "MANAGER",
    "sourceUserId": "5",
    "prenom": "Abdou",
    "nom": "Diop",
    "lastSyncedAt": "2025-02-01T10:00:00Z"
  },
  "validatedByRefId": "uuid-yyy-yyy",
  "validatedByRef": {                  // ✅ Infos du validateur
    "id": "uuid-yyy-yyy",
    "sourceApp": "ASSOCIE",
    "sourceUserId": "2",
    "prenom": "Marie",
    "nom": "Fall",
    "lastSyncedAt": "2025-02-01T10:00:00Z"
  },
  "status": "validated",
  "createdAt": "2025-02-01T10:00:00Z",
  "validatedAt": "2025-02-02T14:30:00Z"
}
```

## TypeScript - Types

```typescript
// manager-app-yessal/src/services/fluxFinancier.ts

export interface UserReference {
  id: string;
  sourceApp: 'MANAGER' | 'ASSOCIE';
  sourceUserId: string;
  prenom?: string;
  nom?: string;
  lastSyncedAt: string;
}

export interface FluxFinancier {
  id: number;
  type: 'depense' | 'recette';
  montant: number;
  // ... autres champs
  
  // ✅ Nouvelles propriétés
  createdByRefId: string;
  createdByRef?: UserReference;      // Optionnel car peut ne pas être inclus
  validatedByRefId?: string;
  validatedByRef?: UserReference;
  
  // ... autres champs
}
```

## Statistiques enrichies

```javascript
// Backend
const stats = await FluxFinancierService.getStatistics(laverieId, { month: '2025-02' });

console.log(stats);
// {
//   depenses: {
//     total: 500000,
//     count: 12
//   },
//   recettes: {
//     total: 750000,           // ✅ Total flux + commandes
//     fluxFinanciers: 150000,  // ✅ Recettes manuelles
//     commandes: 600000,       // ✅ Revenus des commandes
//     count: 5,
//     commandesCount: 42
//   },
//   solde: 250000,
//   devise: 'FCFA'
// }
```

## Filtrage par créateur

```javascript
// Backend - Filtrer les flux d'un utilisateur spécifique
async getAllFlux(filters) {
  const { createdBy } = filters;
  
  // Obtenir la référence utilisateur
  const userRefId = await userReferenceService.getOrCreateUserRef(createdBy, 'MANAGER');
  
  // Filtrer par référence
  const flux = await prismaShared.fluxFinancier.findMany({
    where: {
      createdByRefId: userRefId,  // ✅ Filtre par référence
      flagged: true
    },
    include: {
      createdByRef: true,
      validatedByRef: true,
      preuves: true
    }
  });
  
  return flux;
}
```

## Tests recommandés

```javascript
// Test 1: Créer un flux
const flux = await FluxFinancierService.createFlux({
  type: 'depense',
  montant: 50000,
  dateFluxFinancier: new Date(),
  motif: 'Test',
  laverieId: 1,
  createdBy: 5
});

console.log(flux.createdByRef);
// { id: '...', prenom: 'Abdou', nom: 'Diop', ... }

// Test 2: Lister les flux
const result = await FluxFinancierService.getAllFlux({
  createdBy: 5,
  page: 1,
  limit: 20
});

result.data.forEach(f => {
  console.log(`${f.motif} - créé par ${f.createdByRef.prenom} ${f.createdByRef.nom}`);
});

// Test 3: Synchroniser les infos
const userRefId = await userReferenceService.getOrCreateUserRef(5, 'MANAGER');
await userReferenceService.syncUserInfo(userRefId);
```

## Bonnes pratiques

### ✅ À FAIRE

```javascript
// Toujours inclure les références dans les requêtes
const flux = await prismaShared.fluxFinancier.findUnique({
  where: { id },
  include: {
    createdByRef: true,
    validatedByRef: true,
    preuves: true
  }
});

// Gérer les cas où les infos sont manquantes
const userName = flux.createdByRef?.prenom 
  ? `${flux.createdByRef.prenom} ${flux.createdByRef.nom || ''}`
  : 'Utilisateur';

// Utiliser le service pour créer les références
const userRefId = await userReferenceService.getOrCreateUserRef(userId, sourceApp);
```

### ❌ À ÉVITER

```javascript
// ❌ Ne pas créer manuellement les UserReference
await prismaShared.userReference.create({ ... });  // Utiliser le service !

// ❌ Ne pas utiliser directement sourceUserId pour filtrer
where: { sourceUserId: '5' }  // Utiliser createdByRefId !

// ❌ Ne pas oublier d'inclure les références
const flux = await prismaShared.fluxFinancier.findUnique({ where: { id } });
console.log(flux.createdByRef);  // undefined ! ❌
```

## Migration des données existantes

```bash
# 1. Backup
mysqldump -u user -p shared_database > backup.sql

# 2. Appliquer le schéma
cd shared-database
npx prisma db push

# 3. Migrer les données
node scripts/migrate-userreference.js

# 4. Vérifier
# Tous les flux doivent avoir createdByRefId
SELECT COUNT(*) FROM FluxFinancier WHERE createdByRefId IS NULL;
# Résultat attendu: 0
```
