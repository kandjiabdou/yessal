# Mise à jour incrémentale de la fidélité

## Objectif
Gérer la mise à jour incrémentale des données de fidélité lors des opérations sur les commandes (ajout, modification, annulation, suppression).

## Règles de fidélité respectées

1. **Attribution des points** : 1 point = 500 FCFA dépensés (payés)
2. **Conversion** : uniquement par paquets de 40 points = 2000 FCFA
3. **Exclusion cumul points** : les montants payés avec des points ne génèrent pas de nouveaux points
4. **Gestion fractions** : fractions conservées et accumulées jusqu'à former un point entier
5. **Points disponibles** : seuls les points non utilisés sont affichés
6. **Application automatique** : dès 40 points atteints, réduction de 2000 FCFA appliquée automatiquement

## Modifications apportées à `orderService.js`

### 1. Nouvelles méthodes

#### `_addFidelityPoints(tx, order)`
Ajoute de manière incrémentale les valeurs de fidélité lors de la livraison d'une commande :
- `nombreLavageTotal` : +1
- `poidsTotalLaveKg` : + `masseVerifieeKg` ou `masseClientIndicativeKg`
- `prixTotalPaye` : + `prixPaye` (ou `prixTotal` si `prixPaye` non défini)
- `pointsDisponible` et `pointsFraction` : calcul selon la règle 1 point = 500 FCFA

**Logique de calcul des points** :
```javascript
const montantPaye = order.prixPaye || order.prixTotal || 0;
const pointsExacts = montantPaye / 500;
const pointsEntiers = Math.floor(pointsExacts);
const fraction = pointsExacts - pointsEntiers;

// Accumulation
const updatedPointsDisponible = fidelite.pointsDisponible + pointsEntiers;
const updatedFraction = fidelite.pointsFraction + fraction;

// Conversion des fractions accumulées
const extraFromFraction = Math.floor(updatedFraction);
const finalFraction = updatedFraction - extraFromFraction;
const finalPointsDisponible = updatedPointsDisponible + extraFromFraction;
```

#### `_removeFidelityPoints(tx, order)`
Retire de manière incrémentale les valeurs de fidélité lors de l'annulation d'une commande :
- `nombreLavageTotal` : -1 (minimum 0)
- `poidsTotalLaveKg` : - poids de la commande (minimum 0)
- `prixTotalPaye` : - montant payé (minimum 0)
- `pointsDisponible` et `pointsFraction` : retrait des points correspondants

**Gestion des fractions négatives** :
```javascript
let updatedFraction = fidelite.pointsFraction - fraction;

// Si fraction devient négative, emprunter 1 point entier
if (updatedFraction < 0) {
  updatedPointsDisponible -= 1;
  updatedFraction += 1;
}

// Garantir valeurs non négatives
updatedPointsDisponible = Math.max(0, updatedPointsDisponible);
updatedFraction = Math.max(0, updatedFraction);
```

### 2. Méthodes modifiées

#### `updateOrder(orderId, updateData, adminUserId)`
**Nouvelles fonctionnalités** :
- Détecte les changements de flag (annulation/restauration)
- Détecte les changements de statut (notamment passage à 'Livre' ou retour depuis 'Livre')

**Logique d'annulation (flag = false)** :
```javascript
if (flag === false && existingOrder.flag === true) {
  // Annulation : retirer les points si la commande était livrée
  if (existingOrder.statut === 'Livre') {
    await this._removeFidelityPoints(tx, existingOrder);
  }
}
```

**Logique de restauration (flag = true)** :
```javascript
if (flag === true && existingOrder.flag === false) {
  // Restauration : ré-ajouter les points si la commande est livrée
  if (existingOrder.statut === 'Livre') {
    await this._addFidelityPoints(tx, existingOrder);
  }
}
```

**Logique de changement de statut** :
```javascript
// Passage à 'Livre' : ajouter les points
if (statut === 'Livre' && previousStatus !== 'Livre' && order.flag) {
  await this._addFidelityPoints(tx, order);
}

// Retour depuis 'Livre' : retirer les points
if (previousStatus === 'Livre' && statut !== 'Livre' && order.flag) {
  await this._removeFidelityPoints(tx, order);
}
```

#### `deleteOrder(orderId, adminUserId)`
**Modification** : avant de supprimer la commande, retire les points de fidélité si :
- La commande était livrée (`statut === 'Livre'`)
- La commande a un client (`clientUserId` défini)
- La commande n'était pas annulée (`flag === true`)

```javascript
if (order.statut === 'Livre' && order.clientUserId && order.flag) {
  await this._removeFidelityPoints(tx, order);
}
```

## Scénarios couverts

### Scénario 1 : Création et livraison d'une commande
1. Commande créée avec `statut = 'PrisEnCharge'` → aucun impact sur fidélité
2. Statut passe à `'Livre'` → `_addFidelityPoints()` appelé
3. Fidélité mise à jour : +1 lavage, +poids, +prix, +points

### Scénario 2 : Annulation d'une commande livrée
1. Commande avec `statut = 'Livre'` et `flag = true`
2. Update avec `flag = false` → `_removeFidelityPoints()` appelé
3. Fidélité ajustée : -1 lavage, -poids, -prix, -points

### Scénario 3 : Restauration d'une commande annulée
1. Commande avec `statut = 'Livre'` et `flag = false`
2. Update avec `flag = true` → `_addFidelityPoints()` appelé
3. Fidélité restaurée : +1 lavage, +poids, +prix, +points

### Scénario 4 : Modification du statut d'une commande
1. Commande passe de `'Livraison'` à `'Livre'` → `_addFidelityPoints()` appelé
2. Commande repasse de `'Livre'` à `'Repassage'` → `_removeFidelityPoints()` appelé

### Scénario 5 : Suppression d'une commande livrée
1. Commande avec `statut = 'Livre'`, `flag = true`, et `clientUserId` défini
2. `deleteOrder()` appelé → `_removeFidelityPoints()` exécuté avant suppression
3. Points retirés, puis commande supprimée

## Script de recalcul complet

Un script `recalculate-fidelite.js` a été créé pour recalculer toutes les données de fidélité à partir des commandes existantes. Utiliser ce script pour :
- Initialiser les données après migration
- Corriger des incohérences
- Vérifier la cohérence des données

```bash
# Avec confirmation
node scripts/recalculate-fidelite.js

# Sans confirmation
node scripts/recalculate-fidelite.js --yes
```

## Points d'attention

1. **Transactions** : toutes les opérations de fidélité sont encapsulées dans des transactions Prisma pour garantir la cohérence
2. **Ordre des opérations** : important de vérifier le statut ET le flag avant d'ajouter/retirer des points
3. **Gestion des fractions** : les fractions sont toujours conservées et accumulées (jamais perdues)
4. **Valeurs minimales** : toutes les valeurs de fidélité sont garanties >= 0
5. **Backward compatibility** : la logique des lavages gratuits (ancien système) est préservée

## Tests recommandés

1. ✅ Créer une commande et la livrer → vérifier points ajoutés
2. ✅ Annuler une commande livrée → vérifier points retirés
3. ✅ Restaurer une commande annulée → vérifier points ré-ajoutés
4. ✅ Modifier le statut d'une commande → vérifier impact sur fidélité
5. ✅ Supprimer une commande livrée → vérifier points retirés
6. ✅ Tester avec des montants créant des fractions → vérifier accumulation
7. ✅ Exécuter le script de recalcul → comparer avec les valeurs incrémentales
