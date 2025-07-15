# Fix: Mise à jour de la Formule lors de la Modification de Commande

## Problème Identifié
Lors de la modification d'une commande, le changement de formule n'était pas pris en compte. La valeur de `formuleCommande` restait inchangée dans la base de données même si le frontend envoyait une nouvelle formule via `prixCalcule.formule`.

## Solution Implémentée

### 1. Extraction de la Formule depuis `prixCalcule`
```javascript
// Extract formule from prixCalcule if not explicitly provided
if (formuleCommande === undefined && prixCalcule && prixCalcule.formule) {
  updateData.formuleCommande = prixCalcule.formule;
}
```

### 2. Support de la Formule Explicite
```javascript
if (formuleCommande !== undefined) {
  updateData.formuleCommande = formuleCommande;
}
```

### 3. Mise à jour de la Répartition des Machines
```javascript
// Update machine distribution if provided in prixCalcule
if (prixCalcule && prixCalcule.repartitionMachines) {
  // Delete existing + Create new distribution
}
```

### 4. Inclusion des Données Complètes
- Ajout de `repartitionMachines: true` dans les requêtes de récupération
- Logs détaillés pour traçabilité

## Logs Ajoutés

### Pour la Formule
```
🔄 Formule extraite de prixCalcule: {
  orderId: 111,
  ancienneFormule: "Detail",
  nouvelleFormule: "BaseMachine"
}
```

### Pour les Machines
```
✅ Répartition des machines mise à jour: {
  orderId: 111,
  machine20kg: 0,
  machine6kg: 1
}
```

## Test du Fix

### Avant le Fix:
- Requête de mise à jour avec `prixCalcule.formule: "BaseMachine"`
- Réponse: `formuleCommande: "Detail"` (ancienne valeur)

### Après le Fix:
- Même requête de mise à jour
- Réponse attendue: `formuleCommande: "BaseMachine"` (nouvelle valeur)

## Fichiers Modifiés
- `orderController.js`: Ajout de la logique de mise à jour de la formule et des machines
- Support pour extraction automatique depuis `prixCalcule.formule`
- Inclusion de `repartitionMachines` dans les réponses API

## Impact
- ✅ La formule est maintenant correctement mise à jour
- ✅ La répartition des machines est synchronisée
- ✅ Traçabilité complète des modifications
- ✅ Compatibilité avec l'ancien système (formule explicite)
- ✅ Support automatique depuis `prixCalcule` (nouveau système)

## Prochains Tests Recommandés
1. Créer une commande avec formule "Detail"
2. Modifier avec `prixCalcule.formule: "BaseMachine"`
3. Vérifier que la réponse contient `formuleCommande: "BaseMachine"`
4. Vérifier que `repartitionMachines` est mise à jour
5. Vérifier les logs dans la console serveur
