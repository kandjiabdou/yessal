# Refactoring : Gestion Propre de la Fidélité

## 🎯 Objectifs

1. **Éliminer la redondance** : Code de fidélité centralisé dans le service uniquement
2. **Logique claire** : Séparation des 3 cas d'usage
3. **Code maintenable** : Facile à comprendre et à modifier

## 📋 Cas d'Usage de la Fidélité

### 1. Création de Commande (createOrder)
**Action** : Ajouter des points de fidélité
- `nombreLavageTotal` : +1
- `poidsTotalLaveKg` : +poids
- `prixTotalPaye` : +montant
- `pointsDisponible` : +points calculés
- `pointsFraction` : +fraction accumulée

**Méthode** : `_addFidelityPoints(tx, order)`

```javascript
// Dans createOrder du controller
if (clientUserId && newOrder.flag !== false) {
  const orderService = require('../services/orderService');
  await orderService._addFidelityPoints(tx, {
    ...newOrder,
    prixPaye: prixFinal
  });
}
```

### 2. Modification de Commande (updateOrder)
**Action** : Recalculer les points sans changer le nombre de lavages
- `nombreLavageTotal` : **INCHANGÉ** (même commande modifiée)
- `poidsTotalLaveKg` : ajusté selon différence
- `prixTotalPaye` : ajusté selon différence
- `pointsDisponible` : recalculé selon différence de prix
- `pointsFraction` : recalculé

**Méthode** : `_updateFidelityPoints(tx, oldOrder, newOrder)`

```javascript
// Dans updateOrder du controller
if (existingOrder.clientUserId && 
    (masseVerifieeKg !== undefined || prixCalcule) &&
    existingOrder.flag !== false) {
  const orderService = require('../services/orderService');
  await orderService._updateFidelityPoints(tx, existingOrder, updatedOrder);
}
```

### 3. Annulation de Commande (deleteOrder avec flag=false)
**Action** : Revenir à l'état avant la commande
- `nombreLavageTotal` : -1
- `poidsTotalLaveKg` : -poids
- `prixTotalPaye` : -montant
- `pointsDisponible` : -points calculés
- `pointsFraction` : -fraction

**Méthode** : `_removeFidelityPoints(tx, order)`

```javascript
// Dans deleteOrder du controller
await prisma.$transaction(async (tx) => {
  // Retirer les points AVANT de désactiver
  if (order.clientUserId && order.flag === true) {
    const orderService = require('../services/orderService');
    await orderService._removeFidelityPoints(tx, order);
  }
  
  // Puis désactiver la commande
  await tx.commande.update({
    where: { id: orderId },
    data: { flag: false }
  });
});
```

## 🏗️ Architecture

### Service (orderService.js)
**Responsabilité** : Contient TOUTE la logique métier de fidélité

```
orderService.js
├── _addFidelityPoints()      → Création
├── _updateFidelityPoints()   → Modification
└── _removeFidelityPoints()   → Annulation
```

**Avantages** :
- ✅ Une seule source de vérité
- ✅ Réutilisable partout
- ✅ Testable indépendamment
- ✅ Logs centralisés avec emojis (✅, 🔄, ❌)

### Controller (orderController.js)
**Responsabilité** : Orchestration uniquement, appelle le service

```
orderController.js
├── createOrder()  → Appelle _addFidelityPoints()
├── updateOrder()  → Appelle _updateFidelityPoints()
└── deleteOrder()  → Appelle _removeFidelityPoints()
```

**Avantages** :
- ✅ Code simple et lisible
- ✅ Pas de duplication
- ✅ Facile à maintenir

## 🔍 Détection des Changements

### Dans updateOrder
```javascript
// Détection automatique des changements de prix/poids
const priceOrWeightChanged = 
  (masseVerifieeKg !== undefined && masseVerifieeKg !== existingOrder.masseVerifieeKg) ||
  (updateData.prixPaye !== undefined && updateData.prixPaye !== existingOrder.prixPaye) ||
  (updateData.prixTotal !== undefined && updateData.prixTotal !== existingOrder.prixTotal);

if (priceOrWeightChanged && existingOrder.flag !== false) {
  await this._updateFidelityPoints(tx, existingOrder, updatedOrder);
}
```

## 📊 Calcul des Points

### Formule Unique (dans les 3 méthodes)
```javascript
const fidelityCurrencyPerPoint = 500; // 1 point = 500 FCFA
const pointsExacts = montantPaye / fidelityCurrencyPerPoint;
const pointsEntiers = Math.floor(pointsExacts);
const fraction = pointsExacts - pointsEntiers;
```

### Gestion des Fractions
```javascript
// Accumulation automatique
const updatedFraction = (fidelite.pointsFraction || 0) + fraction;

// Conversion en points entiers
const extraFromFraction = Math.floor(updatedFraction);
const finalFraction = updatedFraction - extraFromFraction;
const finalPointsDisponible = updatedPointsDisponible + extraFromFraction;
```

### Gestion des Fractions Négatives (lors de retrait)
```javascript
if (updatedFraction < 0) {
  updatedPointsDisponible -= 1; // Emprunter 1 point
  updatedFraction += 1;          // Convertir en positif
}
```

## 🛡️ Sécurité

### Protection contre les valeurs négatives
```javascript
// Toujours dans les méthodes
updatedPointsDisponible = Math.max(0, updatedPointsDisponible);
updatedFraction = Math.max(0, updatedFraction);
poidsTotalLaveKg = Math.max(0, fidelite.poidsTotalLaveKg + diffPoids);
```

### Vérification de l'existence du client
```javascript
if (!fidelite) {
  console.log(`No fidelity record found for client ${order.clientUserId}`);
  return null;
}
```

## 📝 Logs de Débogage

### Format Standardisé
```javascript
// Ajout
console.log(`✅ Adding fidelity points for order #${order.id}:`, {
  clientId: order.clientUserId,
  montantPaye,
  pointsAdded: pointsEntiers,
  fractionAdded: fraction.toFixed(4),
  newTotal: finalPointsDisponible
});

// Modification
console.log(`🔄 Updating fidelity points for modified order #${newOrder.id}:`, {
  clientId: oldOrder.clientUserId,
  oldMontant: oldMontantPaye,
  newMontant: newMontantPaye,
  diffPoints: diffPointsEntiers,
  diffFraction: diffFraction.toFixed(4),
  newTotal: updatedPointsDisponible,
  nombreLavageTotal: fidelite.nombreLavageTotal // unchanged
});

// Retrait
console.log(`❌ Removing fidelity points for order #${order.id}:`, {
  clientId: order.clientUserId,
  montantPaye,
  pointsRemoved: pointsEntiers,
  fractionRemoved: fraction.toFixed(4),
  newTotal: updatedPointsDisponible
});
```

## 🧪 Tests Recommandés

### Scénario 1 : Création puis Annulation
1. Créer commande 5000 FCFA → Client gagne 10 points
2. Annuler commande → Client revient à 0 points
3. Vérifier `nombreLavageTotal` revient à 0

### Scénario 2 : Création puis Modification
1. Créer commande 5000 FCFA → Client gagne 10 points
2. Modifier à 7500 FCFA → Client a maintenant 15 points
3. Vérifier `nombreLavageTotal` reste à 1 (pas 2!)

### Scénario 3 : Fractions
1. Commande 1000 FCFA → 2 points + 0 fraction
2. Commande 1250 FCFA → 2.5 points → +2 points + 0.5 fraction
3. Commande 1250 FCFA → 2.5 points → +2 points + (0.5+0.5=1.0) → +1 point bonus
4. Total : 2 + 2 + 2 + 1 = 7 points disponibles

### Scénario 4 : Modification avec Fractions
1. Commande 1000 FCFA → 2 points
2. Modifier à 1250 FCFA → Diff = +0.5 point → fraction devient 0.5
3. `nombreLavageTotal` reste à 1

## 📈 Avantages du Refactoring

### Avant (Code Redondant)
- ❌ Logique dupliquée dans controller ET service
- ❌ Risque de désynchronisation
- ❌ Difficile à tester
- ❌ Logs incohérents
- ❌ Pas de gestion de modification

### Après (Code Clean)
- ✅ Une seule source de vérité (service)
- ✅ 3 méthodes spécialisées
- ✅ Controller simplifié (orchestration uniquement)
- ✅ Logs standardisés et clairs
- ✅ Gestion complète des 3 cas d'usage
- ✅ Facile à tester et maintenir

## 🚀 Utilisation

### Pour ajouter des points (nouvelle commande)
```javascript
await orderService._addFidelityPoints(tx, order);
```

### Pour mettre à jour les points (modification)
```javascript
await orderService._updateFidelityPoints(tx, oldOrder, newOrder);
```

### Pour retirer les points (annulation)
```javascript
await orderService._removeFidelityPoints(tx, order);
```

## ⚠️ Points d'Attention

1. **Transaction obligatoire** : Toutes les méthodes utilisent `tx` (transaction Prisma)
2. **Flag check** : Vérifier `order.flag !== false` avant d'appeler
3. **Client check** : Vérifier `order.clientUserId` existe
4. **Ordre d'exécution** : Pour annulation, retirer points AVANT de mettre flag=false

## 🎓 Règles Métier

| Cas d'Usage | nombreLavageTotal | Points | Poids | Prix |
|------------|-------------------|--------|-------|------|
| Création | +1 | +calculé | +poids | +prix |
| Modification | **INCHANGÉ** | recalculé (diff) | ajusté (diff) | ajusté (diff) |
| Annulation | -1 | -calculé | -poids | -prix |

---

**Date de création** : 2025-01-09  
**Auteur** : GitHub Copilot  
**Version** : 2.0 (Clean Architecture)
