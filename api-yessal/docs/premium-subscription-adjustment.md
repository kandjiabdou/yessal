# Ajustement Automatique des Abonnements Premium

## Description
Lorsqu'une commande d'un client Premium est mise à jour avec un nouveau poids (`masseVerifieeKg`), l'abonnement Premium du client pour le mois courant est automatiquement ajusté.

## Fonctionnement

### Exemple de Scénario
1. **État initial** : Client Premium avec 10kg utilisés dans son abonnement du mois
2. **Création commande** : Le client lave 15kg (total = 25kg utilisés)
3. **Erreur détectée** : Le manager se rend compte que le client voulait laver 20kg, pas 15kg
4. **Correction** : Le manager met à jour la commande avec `masseVerifieeKg: 20`
5. **Résultat automatique** : L'abonnement passe à 30kg utilisés (10 + 20)

### Calcul Automatique
```
Nouveaux kg utilisés = kg utilisés avant + (nouveau poids - ancien poids)
```

### Cas d'Usage
- Correction d'erreurs de pesée
- Ajustement après vérification du poids réel
- Modification de commandes Premium existantes

## Logs de Traçabilité

### Logs de Détection
```
🔄 Ajustement abonnement Premium détecté: {
  clientId: 123,
  typeClient: "Premium",
  orderId: 456,
  ancienPoids: 15,
  nouveauPoids: 20,
  difference: 5
}
```

### Logs de Succès
```
✅ Abonnement Premium mis à jour avec succès: {
  clientId: 123,
  subscriptionId: 78,
  periode: "7/2025",
  ancienKgUtilises: 25,
  nouveauKgUtilises: 30,
  differenceAppliquee: 5,
  limiteKg: 50,
  kgRestants: 20
}
```

### Logs d'Avertissement
```
⚠️  Aucun abonnement Premium trouvé pour la période actuelle: {
  clientId: 123,
  periode: "7/2025"
}
```

## API Endpoint
```
PUT /api/orders/:id
```

### Exemple de Requête
```json
{
  "masseVerifieeKg": 20
}
```

## Conditions d'Activation
1. Le client doit être de type `Premium`
2. La commande doit avoir un `clientUserId` (pas un client invité)
3. Le `masseVerifieeKg` doit être différent de l'ancien poids
4. Un abonnement Premium doit exister pour le mois courant

## Sécurité
- Seuls les managers peuvent mettre à jour les commandes
- Seul le manager qui a créé la commande peut la modifier
- Les kg utilisés ne peuvent jamais descendre en dessous de 0

## Fonction Utilitaire
Une fonction `adjustPremiumSubscriptionKg` est disponible pour des ajustements manuels si nécessaire.

```javascript
const result = await adjustPremiumSubscriptionKg(clientUserId, kgDifference);
```
