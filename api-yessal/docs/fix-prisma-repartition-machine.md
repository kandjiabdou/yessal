# Fix: Erreur Prisma - Champ `quantite` manquant dans repartitionmachine

## Problème Identifié
```
Prisma Error: Argument `quantite` is missing.
```

L'erreur se produisait lors de la mise à jour d'une commande car le schéma Prisma pour `repartitionmachine` exige un champ `quantite` obligatoire, mais le code utilisait `nombreMachine`.

## Structure du Schéma Prisma
```prisma
model repartitionmachine {
  id           Int      @id @default(autoincrement())
  commandeId   Int
  typeMachine  String
  quantite     Int      // ⚠️ Champ obligatoire
  prixUnitaire Float    // ⚠️ Champ obligatoire
  commande     commande @relation(fields: [commandeId], references: [id])
}
```

## Correction Appliquée

### Avant (Code Incorrect):
```javascript
await tx.repartitionmachine.create({
  data: {
    commandeId: orderId,
    typeMachine: '20kg',
    nombreMachine: machine20kg  // ❌ Champ inexistant
  }
});
```

### Après (Code Corrigé):
```javascript
await tx.repartitionmachine.create({
  data: {
    commandeId: orderId,
    typeMachine: 'Machine20kg',     // ✅ Convention cohérente
    quantite: machine20kg,          // ✅ Champ correct
    prixUnitaire: 4000             // ✅ Champ obligatoire
  }
});
```

## Harmonisation des Types de Machines

### Convention Adoptée:
- **Machine 20kg**: `typeMachine: 'Machine20kg'`
- **Machine 6kg**: `typeMachine: 'Machine6kg'`

### Prix Unitaires Standards:
- **Machine 20kg**: 4000 FCFA
- **Machine 6kg**: 2000 FCFA

## Fonctions Corrigées

### 1. `updateOrder` - Mise à jour de la répartition
```javascript
// Update machine distribution if provided in prixCalcule
if (prixCalcule && prixCalcule.repartitionMachines) {
  // Delete existing + Create new with correct schema
}
```

### 2. Cohérence avec `createOrder`
La même structure est maintenant utilisée dans les deux fonctions.

## Test de Validation

### Payload de Test:
```json
{
  "prixCalcule": {
    "formule": "BaseMachine",
    "repartitionMachines": {
      "machine20kg": 0,
      "machine6kg": 1
    }
  }
}
```

### Résultat Attendu:
- ✅ Pas d'erreur Prisma
- ✅ Répartition mise à jour correctement
- ✅ Types de machines cohérents
- ✅ Prix unitaires définis

## Logs de Vérification

```
✅ Répartition des machines mise à jour: {
  orderId: 111,
  machine20kg: 0,
  machine6kg: 1
}
```

## Impact du Fix
- ✅ Erreur Prisma `quantite` manquant - **Résolue**
- ✅ Erreur Prisma `prixUnitaire` manquant - **Résolue**
- ✅ Cohérence des types de machines - **Améliorée**
- ✅ Mise à jour de formule + machines - **Fonctionnelle**
