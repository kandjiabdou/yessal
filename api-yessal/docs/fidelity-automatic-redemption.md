# Système de Fidélité Automatique - Documentation

## Vue d'ensemble

Le système de fidélité a été amélioré pour appliquer **automatiquement** les points dès que le client atteint 40 points ou plus. Il n'y a plus de choix manuel : les points sont convertis en réduction immédiatement.

## Règles de Fonctionnement

### 1. Conversion Automatique des Points

- **40 points = 2000 FCFA** de réduction automatique
- Dès qu'un client atteint 40 points ou plus, la réduction est appliquée sur la prochaine commande
- Pas d'épargne possible : les points sont utilisés automatiquement

### 2. Multiples Paquets

Si un client a **80 points** (2 paquets) et fait une commande de **3500 FCFA** :
- Le système applique automatiquement **1 paquet** (40 points = 2000 FCFA)
- Prix à payer : 3500 - 2000 = **1500 FCFA**
- Points restants : 80 - 40 = **40 points**

Si un client a **80 points** et fait une commande de **1500 FCFA** :
- Le système applique automatiquement **1 paquet** (40 points = 2000 FCFA)
- Prix à payer : 1500 - 2000 = **0 FCFA** (limité à 0, pas de négatif)
- Points restants : 80 - 40 = **40 points**

### 3. Points Gagnés sur Montant Réellement Payé

**IMPORTANT** : Les points sont calculés UNIQUEMENT sur le montant **après** réduction fidélité.

**Exemple :**
- Client a **40 points** avant commande
- Commande de **20 kg = 4000 FCFA**
- Réduction automatique : **-2000 FCFA** (40 points consommés)
- **Prix payé : 2000 FCFA**
- Nouveaux points gagnés : 2000 / 500 = **4 points** (et non 8 !)
- Points finaux : 0 (après consommation) + 4 = **4 points**

## Architecture Technique

### Frontend (manager-app-yessal)

#### 1. Service de Calcul de Prix (`price.ts`)

```typescript
interface FidelityDetails {
  pointsDisponibles: number;      // Points avant utilisation
  pointsFraction: number;          // Fraction de points
  paquetsConvertibles: number;     // Nombre de paquets disponibles
  montantReduction: number;        // Montant total de réduction
  pointsConsommes: number;         // Points utilisés pour cette commande
  pointsRestants: number;          // Points après consommation
}

interface PriceDetails {
  // ... autres champs
  prixPaye: number;                // Prix APRÈS fidélité
  fidelite?: FidelityDetails;      // Détails de l'application
}
```

**Calcul automatique dans `calculerPrixComplet()` :**

```typescript
// Application AUTOMATIQUE de la fidélité
let fideliteDetails = undefined;
const pointsDisponibles = configClient.pointsFidelite || 0;

if (pointsDisponibles >= 40) {
  // Calculer combien de paquets de 40 points sont disponibles
  const paquetsConvertibles = Math.floor(pointsDisponibles / 40);
  const montantReductionMax = paquetsConvertibles * 2000;

  // Appliquer la réduction fidélité (maximum = prix à payer)
  const montantReduction = Math.min(montantReductionMax, prixPaye);
  const paquetsUtilises = Math.ceil(montantReduction / 2000);
  const pointsConsommes = paquetsUtilises * 40;

  // Nouveau prix après fidélité
  prixPaye = Math.max(0, prixPaye - montantReduction);

  fideliteDetails = {
    pointsDisponibles,
    pointsFraction,
    paquetsConvertibles,
    montantReduction,
    pointsConsommes,
    pointsRestants: pointsDisponibles - pointsConsommes,
  };
}
```

#### 2. Composant NewOrder

**Passage des points au calcul :**

```typescript
const prixCalcule = PriceService.calculerPrixComplet(
  formData.weight,
  formData.formulaType,
  formData.options,
  formData.options.aOptionLivraison,
  {
    typeClient,
    abonnementPremiums: selectedClient?.abonnementsPremium ?? null,
    typeReduction,
    cumulMensuel,
    // NOUVEAU: Points de fidélité pour application automatique
    pointsFidelite: selectedClient?.fidelite?.pointsDisponible || 0,
    pointsFraction: selectedClient?.fidelite?.pointsFraction || 0
  },
  ajustement
);
```

#### 3. Composant OrderRecap

**Affichage automatique si points utilisés :**

```tsx
{client && prixDetails?.fidelite && prixDetails.fidelite.montantReduction > 0 && (
  <Card className="border-green-200 bg-green-50">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-green-600 font-semibold">
          ✅ Points de fidélité appliqués automatiquement
        </span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Points disponibles avant :</span>
          <span>{prixDetails.fidelite.pointsDisponibles} pts</span>
        </div>
        <div className="flex justify-between">
          <span>Paquets utilisés :</span>
          <span>{Math.ceil(prixDetails.fidelite.montantReduction / 2000)} pack(s)</span>
        </div>
        <div className="flex justify-between">
          <span>Points consommés :</span>
          <span className="text-red-600">-{prixDetails.fidelite.pointsConsommes} pts</span>
        </div>
        <div className="flex justify-between">
          <span>Réduction obtenue :</span>
          <span className="text-green-600 font-bold">
            -{PriceService.formaterPrix(prixDetails.fidelite.montantReduction)}
          </span>
        </div>
        <div className="flex justify-between border-t pt-2">
          <span>Points restants après :</span>
          <span className="font-bold">{prixDetails.fidelite.pointsRestants} pts</span>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

### Backend (api-yessal)

#### 1. Contrôleur de Commande (`orderController.js`)

**Consommation des points lors de la création :**

```javascript
// Si des points de fidélité ont été consommés, les soustraire
if (prixCalcule.fidelite && prixCalcule.fidelite.pointsConsommes > 0) {
  const fidelite = await tx.fidelite.findUnique({
    where: { clientUserId }
  });
  
  if (fidelite) {
    const newPointsDisponible = Math.max(
      0, 
      fidelite.pointsDisponible - prixCalcule.fidelite.pointsConsommes
    );
    
    await tx.fidelite.update({
      where: { clientUserId },
      data: {
        pointsDisponible: newPointsDisponible
      }
    });
    
    console.log(`💳 Points de fidélité consommés pour commande #${newOrder.id}:`, {
      clientId: clientUserId,
      pointsConsommes: prixCalcule.fidelite.pointsConsommes,
      montantReduction: prixCalcule.fidelite.montantReduction,
      pointsRestants: newPointsDisponible
    });
  }
}
```

#### 2. Service de Commande (`orderService.js`)

**Ajout de points basé sur `prixPaye` (déjà réduit par fidélité) :**

```javascript
async _addFidelityPoints(tx, order) {
  // ...
  
  // IMPORTANT: Utiliser prixPaye (prix réellement payé après ajustement ET fidélité)
  const montantPaye = order.prixPaye !== undefined ? order.prixPaye : order.prixTotal || 0;

  // Base update payload (toujours mis à jour)
  const updatePayload = {
    nombreLavageTotal: fidelite.nombreLavageTotal + 1,
    poidsTotalLaveKg: fidelite.poidsTotalLaveKg + poids,
    prixTotalPaye: fidelite.prixTotalPaye + montantPaye
  };

  // Si le montant payé est 0 ou négatif, pas de points
  if (montantPaye <= 0) {
    console.log(`⚠️ No fidelity points added for order #${order.id}: montantPaye = ${montantPaye}`);
  } else {
    // Points calculation: 1 point = 500 FCFA
    const pointsExacts = montantPaye / 500;
    const pointsEntiers = Math.floor(pointsExacts);
    const fraction = pointsExacts - pointsEntiers;

    // Mise à jour incrémentale des points
    const updatedPointsDisponible = (fidelite.pointsDisponible || 0) + pointsEntiers;
    const updatedFraction = (fidelite.pointsFraction || 0) + fraction;

    // Convertir les fractions accumulées en points entiers
    const extraFromFraction = Math.floor(updatedFraction);
    const finalFraction = updatedFraction - extraFromFraction;
    const finalPointsDisponible = updatedPointsDisponible + extraFromFraction;

    // Ajouter les points au payload
    updatePayload.pointsDisponible = finalPointsDisponible;
    updatePayload.pointsFraction = finalFraction;

    console.log(`✅ Adding fidelity points for order #${order.id}:`, {
      clientId: order.clientUserId,
      montantPaye,
      pointsAdded: pointsEntiers,
      fractionAdded: fraction.toFixed(4),
      newTotal: finalPointsDisponible
    });
  }

  return await tx.fidelite.update({
    where: { id: fidelite.id },
    data: updatePayload
  });
}
```

## Flux de Données Complet

### 1. Client Recherche et Sélection

```
Search.tsx → Sélectionne client avec fidelite
{
  id: 52,
  fidelite: {
    pointsDisponible: 40,
    pointsFraction: 0
  }
}
```

### 2. Création de Commande

```
NewOrder.tsx → Calcule prix avec points
prixCalcule = PriceService.calculerPrixComplet(..., {
  pointsFidelite: 40,
  pointsFraction: 0
})

→ Retourne:
{
  prixBase: 4000,
  prixPaye: 2000,  // 4000 - 2000 (réduction fidélité)
  fidelite: {
    pointsDisponibles: 40,
    montantReduction: 2000,
    pointsConsommes: 40,
    pointsRestants: 0
  }
}
```

### 3. Récapitulatif

```
OrderRecap.tsx → Affiche réduction automatique
✅ Points de fidélité appliqués automatiquement
- Points disponibles avant : 40 pts
- Paquets utilisés : 1 pack(s) de 40 pts
- Points consommés : -40 pts
- Réduction obtenue : -2 000 FCFA
- Points restants après : 0 pts
```

### 4. Soumission au Backend

```
POST /api/orders
Body:
{
  clientUserId: 52,
  masseClientIndicativeKg: 20,
  prixCalcule: {
    prixPaye: 2000,  // Prix après réduction fidélité
    fidelite: {
      pointsConsommes: 40,
      montantReduction: 2000
    }
  }
}
```

### 5. Backend - Transaction

```javascript
// 1. Créer la commande avec prixPaye = 2000
const newOrder = await tx.commande.create({
  data: {
    prixTotal: 2000,
    prixPaye: 2000
  }
});

// 2. Soustraire les points consommés
await tx.fidelite.update({
  where: { clientUserId: 52 },
  data: {
    pointsDisponible: 40 - 40 = 0
  }
});

// 3. Ajouter nouveaux points basés sur prixPaye (2000 FCFA)
await orderService._addFidelityPoints(tx, {
  ...newOrder,
  prixPaye: 2000  // Montant réellement payé
});
// → Ajoute 2000/500 = 4 points

// État final: pointsDisponible = 0 + 4 = 4 points
```

## Scénarios de Test

### Scénario 1: Simple Réduction

**État initial:**
- Points: 40
- Commande: 20kg = 4000 FCFA

**Résultat:**
- Réduction: -2000 FCFA (40 points)
- Prix payé: 2000 FCFA
- Nouveaux points: 4 (de 2000 FCFA)
- Points finaux: 0 + 4 = 4 points

### Scénario 2: Double Réduction Partielle

**État initial:**
- Points: 80
- Commande: 10kg = 2000 FCFA

**Résultat:**
- Réduction: -2000 FCFA (40 points, limité au prix)
- Prix payé: 0 FCFA
- Nouveaux points: 0 (rien payé)
- Points finaux: 80 - 40 = 40 points

### Scénario 3: Avec Ajustement ET Fidélité

**État initial:**
- Points: 40
- Commande: 20kg = 4000 FCFA
- Ajustement: -1000 FCFA

**Résultat:**
- Prix après ajustement: 3000 FCFA
- Réduction fidélité: -2000 FCFA (40 points)
- Prix payé: 1000 FCFA
- Nouveaux points: 2 (de 1000 FCFA)
- Points finaux: 0 + 2 = 2 points

### Scénario 4: Premium + Fidélité

**État initial:**
- Type: Premium
- Quota restant: 30kg
- Points: 40
- Commande: 20kg (couvert par premium)

**Résultat:**
- Prix premium: 0 FCFA (couvert)
- Réduction fidélité: 0 FCFA (prix déjà à 0)
- Prix payé: 0 FCFA
- Nouveaux points: 0
- Points finaux: 40 points (inchangés)

## Logs de Debug

### Frontend Console

```
📊 Calcul de prix avec fidélité:
- Points disponibles: 40
- Paquets convertibles: 1
- Prix avant fidélité: 4000 FCFA
- Réduction appliquée: -2000 FCFA
- Prix payé final: 2000 FCFA
```

### Backend Console

```
💳 Points de fidélité consommés pour commande #123:
{
  clientId: 52,
  pointsConsommes: 40,
  montantReduction: 2000,
  pointsRestants: 0
}

✅ Adding fidelity points for order #123:
{
  clientId: 52,
  montantPaye: 2000,
  pointsAdded: 4,
  fractionAdded: "0.0000",
  newTotal: 4
}
```

## Points Clés à Retenir

1. ✅ **Automatique** : Pas de choix, les points sont utilisés dès 40+
2. ✅ **Limité au prix** : Réduction max = prix de la commande
3. ✅ **Points sur montant payé** : Calculés APRÈS réduction fidélité
4. ✅ **Pas d'épargne** : Impossible de garder plus d'un paquet convertible
5. ✅ **Transaction atomique** : Consommation et ajout en une seule transaction

## Améliorations Futures Possibles

- [ ] Historique des utilisations de points
- [ ] Notifications quand client atteint 40 points
- [ ] Dashboard avec évolution des points
- [ ] Export des statistiques de fidélité
