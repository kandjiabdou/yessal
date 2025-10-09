# Fix : Points de fidélité avec ajustement de prix

## 🐛 Bug Identifié

Lorsqu'un ajustement de prix ramène le montant payé à 0 (ou négatif), le système ajoutait quand même des points de fidélité basés sur le `prixTotal` au lieu du `prixPaye` réel.

### Exemple du Bug
```javascript
// Commande avec ajustement
{
  prixTotal: 12000,
  ajustementType: "Diminution",
  ajustementMethode: "Absolu",
  ajustementValeur: 20000,
  prixPaye: 0  // Prix après ajustement (12000 - 20000 = -8000 → 0)
}

// AVANT LE FIX : Le client gagnait 24 points (basé sur 12000 FCFA)
// APRÈS LE FIX : Le client gagne 0 points (basé sur 0 FCFA payé)
```

## 🔍 Cause du Problème

Dans les 3 méthodes de fidélité, le code utilisait :
```javascript
const montantPaye = order.prixPaye || order.prixTotal || 0;
```

**Problème** : L'opérateur `||` retourne `prixTotal` si `prixPaye` vaut `0` (car `0` est falsy en JavaScript).

## ✅ Solution Appliquée

Utiliser une vérification explicite de `undefined` au lieu de l'opérateur `||` :

```javascript
// AVANT (BUG)
const montantPaye = order.prixPaye || order.prixTotal || 0;

// APRÈS (FIX)
const montantPaye = order.prixPaye !== undefined ? order.prixPaye : order.prixTotal || 0;
```

### Logique de la Solution

| Cas | prixPaye | prixTotal | Résultat | Explication |
|-----|----------|-----------|----------|-------------|
| Normal | 5000 | 5000 | 5000 | Prix payé normal |
| Ajustement partiel | 3000 | 5000 | 3000 | Prix après réduction |
| Ajustement complet | 0 | 12000 | **0** | Pas de paiement = 0 points |
| Non défini | undefined | 5000 | 5000 | Fallback sur prixTotal |

## 📝 Modifications Apportées

### 1. `_addFidelityPoints()` - Création de commande

**Changement principal** : Détection du prix payé = 0

```javascript
const montantPaye = order.prixPaye !== undefined ? order.prixPaye : order.prixTotal || 0;

// Si le montant payé est 0 ou négatif, pas de points
if (montantPaye <= 0) {
  console.log(`⚠️ No fidelity points added for order #${order.id}: montantPaye = ${montantPaye}`);
  
  // Mettre à jour uniquement les statistiques (poids, nombre de lavages)
  const updatePayload = {
    nombreLavageTotal: fidelite.nombreLavageTotal + 1,
    poidsTotalLaveKg: fidelite.poidsTotalLaveKg + poids,
    prixTotalPaye: fidelite.prixTotalPaye + montantPaye // Reste 0
    // pointsDisponible et pointsFraction ne changent pas
  };

  return await tx.fidelite.update({ where: { id: fidelite.id }, data: updatePayload });
}

// Sinon, calcul normal des points...
```

**Résultat** :
- ✅ `nombreLavageTotal` est incrémenté (la commande compte)
- ✅ `poidsTotalLaveKg` est mis à jour (le poids est comptabilisé)
- ✅ `prixTotalPaye` reste 0 (aucun paiement effectué)
- ✅ `pointsDisponible` ne change pas (0 FCFA payé = 0 points)

### 2. `_removeFidelityPoints()` - Annulation de commande

**Changement** : Même logique pour la suppression

```javascript
const montantPaye = order.prixPaye !== undefined ? order.prixPaye : order.prixTotal || 0;

// Si le montant payé était 0, juste retirer les stats sans toucher aux points
if (montantPaye <= 0) {
  console.log(`⚠️ No fidelity points removed for order #${order.id}: montantPaye was ${montantPaye}`);
  
  const updatePayload = {
    nombreLavageTotal: Math.max(0, fidelite.nombreLavageTotal - 1),
    poidsTotalLaveKg: Math.max(0, fidelite.poidsTotalLaveKg - poids),
    prixTotalPaye: Math.max(0, fidelite.prixTotalPaye - montantPaye)
    // pointsDisponible et pointsFraction ne changent pas
  };

  return await tx.fidelite.update({ where: { id: fidelite.id }, data: updatePayload });
}
```

### 3. `_updateFidelityPoints()` - Modification de commande

**Changement** : Calcul correct des différences

```javascript
// Calculate old values - IMPORTANT: utiliser prixPaye
const oldMontantPaye = oldOrder.prixPaye !== undefined ? oldOrder.prixPaye : oldOrder.prixTotal || 0;

// Calculate new values - IMPORTANT: utiliser prixPaye
const newMontantPaye = newOrder.prixPaye !== undefined ? newOrder.prixPaye : newOrder.prixTotal || 0;

// Calculate differences
const diffMontant = newMontantPaye - oldMontantPaye;
const diffPointsEntiers = newPointsEntiers - oldPointsEntiers;
```

## 🎯 Scénarios de Test

### Scénario 1 : Ajustement complet (prixPaye = 0)
```javascript
// Input
POST /orders
{
  masseClientIndicativeKg: 50,
  prixCalcule: {
    prixTotal: 12000,
    prixPaye: 0,  // Ajustement de 20000 appliqué
    ajustement: { type: "Diminution", valeur: 20000 }
  }
}

// Expected Fidelity Update
{
  nombreLavageTotal: +1,          // ✅ Incrémenté
  poidsTotalLaveKg: +50,          // ✅ Ajouté
  prixTotalPaye: +0,              // ✅ Reste 0
  pointsDisponible: NO CHANGE,    // ✅ Pas de points ajoutés
  pointsFraction: NO CHANGE       // ✅ Pas de fraction ajoutée
}

// Console Log
⚠️ No fidelity points added for order #179: montantPaye = 0
```

### Scénario 2 : Ajustement partiel (prixPaye > 0)
```javascript
// Input
POST /orders
{
  masseClientIndicativeKg: 25,
  prixCalcule: {
    prixTotal: 6000,
    prixPaye: 4000,  // Ajustement de 2000 appliqué
    ajustement: { type: "Diminution", valeur: 2000 }
  }
}

// Expected Fidelity Update
{
  nombreLavageTotal: +1,
  poidsTotalLaveKg: +25,
  prixTotalPaye: +4000,           // ✅ 4000 FCFA payés
  pointsDisponible: +8,           // ✅ 4000 / 500 = 8 points
  pointsFraction: +0.0            // ✅ Pas de fraction
}

// Console Log
✅ Adding fidelity points for order #180: { montantPaye: 4000, pointsAdded: 8 }
```

### Scénario 3 : Modification d'ajustement (0 → 4000)
```javascript
// Initial Order
{
  id: 179,
  prixTotal: 12000,
  prixPaye: 0  // Ajustement complet
}

// Update
PUT /orders/179
{
  prixCalcule: {
    prixTotal: 12000,
    prixPaye: 4000  // Ajustement réduit à 8000
  }
}

// Expected Fidelity Update
{
  nombreLavageTotal: NO CHANGE,   // ✅ Même commande
  poidsTotalLaveKg: NO CHANGE,    // ✅ Poids inchangé
  prixTotalPaye: +4000,           // ✅ 0 → 4000
  pointsDisponible: +8,           // ✅ Diff = 8 points
  pointsFraction: +0.0
}

// Console Log
🔄 Updating fidelity points for modified order #179: {
  oldMontant: 0,
  newMontant: 4000,
  diffPoints: 8
}
```

## 📊 Comparaison Avant/Après

| Situation | AVANT (Bug) | APRÈS (Fix) |
|-----------|-------------|-------------|
| Commande 12000 FCFA, ajustement -20000 | ❌ 24 points ajoutés | ✅ 0 points |
| Commande 6000 FCFA, ajustement -2000 | ✅ 12 points (sur 6000) | ✅ 8 points (sur 4000) |
| Commande 5000 FCFA, pas d'ajustement | ✅ 10 points | ✅ 10 points |
| Modification 0 → 4000 FCFA | ❌ Pas de changement | ✅ +8 points |

## 🔐 Règles Métier Respectées

1. **Points basés sur l'argent réellement payé** : `prixPaye`, pas `prixTotal`
2. **0 FCFA payé = 0 points** : Logique claire et juste
3. **Statistiques toujours mises à jour** : `nombreLavageTotal` et `poidsTotalLaveKg` même si prixPaye = 0
4. **Cohérence sur toutes les opérations** : Création, modification, annulation

## 🚨 Points d'Attention

### JavaScript Falsy Values
```javascript
// ❌ MAUVAIS : 0 est falsy
const value = prixPaye || prixTotal;  // Si prixPaye = 0, retourne prixTotal

// ✅ BON : Vérification explicite
const value = prixPaye !== undefined ? prixPaye : prixTotal;
```

### Cas Particuliers

**Cas 1** : Commande gratuite (promotion 100%)
```javascript
{ prixTotal: 0, prixPaye: 0 }
→ 0 points (normal, rien payé)
```

**Cas 2** : Ajustement supérieur au prix
```javascript
{ prixTotal: 5000, ajustement: -10000 }
→ prixPaye = Math.max(0, -5000) = 0
→ 0 points (correct)
```

**Cas 3** : prixPaye non défini (ancienne commande)
```javascript
{ prixTotal: 5000, prixPaye: undefined }
→ Fallback sur prixTotal = 5000
→ 10 points (compatible avec anciennes données)
```

## 📈 Impact sur les Données Existantes

### Commandes Existantes
- Les commandes avec `prixPaye = undefined` utilisent le fallback `prixTotal`
- Aucun changement de comportement pour les anciennes commandes
- Compatibilité ascendante maintenue

### Script de Recalcul
Le script `recalculate-fidelite.js` doit être mis à jour pour utiliser `prixPaye` :
```javascript
// Dans le script
const montantPaye = commande.prixPaye !== undefined 
  ? commande.prixPaye 
  : commande.prixTotal || 0;
```

## ✅ Validation

### Tests Manuels
1. ✅ Créer commande avec ajustement complet → 0 points
2. ✅ Créer commande avec ajustement partiel → points sur montant payé
3. ✅ Modifier ajustement 0 → positif → points ajoutés
4. ✅ Annuler commande avec ajustement → stats retirées, points inchangés

### Logs de Validation
```bash
# Ajustement complet
⚠️ No fidelity points added for order #179: montantPaye = 0

# Ajustement partiel
✅ Adding fidelity points for order #180: {
  montantPaye: 4000,
  pointsAdded: 8,
  newTotal: 8
}

# Modification
🔄 Updating fidelity points for modified order #179: {
  oldMontant: 0,
  newMontant: 4000,
  diffPoints: 8,
  newTotal: 8
}
```

---

**Date** : 2025-01-09  
**Version** : 2.1 (Prix Payé Fix)  
**Auteur** : GitHub Copilot
