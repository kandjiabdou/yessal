# Guide d'Utilisation - Ajustement Automatique des Abonnements Premium

## Pour les Managers

### Quand utiliser cette fonctionnalité ?

Cette fonctionnalité s'active automatiquement lorsque vous modifiez le poids d'une commande d'un client Premium.

### Cas d'usage typiques :

1. **Correction d'erreur de pesée**
   - Le poids initial était incorrect
   - Vous devez ajuster après vérification

2. **Modification après réclamation client**
   - Le client conteste le poids facturé
   - Vous devez corriger selon la vérification

3. **Ajustement technique**
   - Erreur de saisie lors de la création
   - Correction après contrôle qualité

### Comment ça fonctionne ?

#### Étape 1 : Identifiez la commande à modifier
- La commande doit être d'un client Premium
- Vous devez être le manager qui a créé cette commande

#### Étape 2 : Modifiez le poids
```
PUT /api/orders/{id}
{
  "masseVerifieeKg": nouveau_poids
}
```

#### Étape 3 : Le système calcule automatiquement
- **Différence** = nouveau_poids - ancien_poids
- **Nouveaux kg utilisés** = kg_utilisés_actuels + différence
- **Mise à jour** de l'abonnement Premium du mois courant

### Exemple Pratique

**Situation :**
- Client Premium "Jean Dupont"
- Abonnement juillet 2025 : 15kg utilisés / 50kg limite
- Commande #123 créée avec 10kg
- Après création : 25kg utilisés (15 + 10)

**Problème détecté :**
- Le poids réel est 8kg, pas 10kg

**Action du Manager :**
1. Modifier la commande #123
2. Changer `masseVerifieeKg` de 10 à 8
3. Le système calcule : différence = 8 - 10 = -2kg
4. Nouveaux kg utilisés : 25 + (-2) = 23kg

**Résultat :**
- L'abonnement passe de 25kg à 23kg utilisés
- Le client récupère 2kg de quota

### Logs et Traçabilité

Le système génère des logs détaillés pour chaque ajustement :

```
🔄 Ajustement abonnement Premium détecté
✅ Abonnement Premium mis à jour avec succès
```

Ces logs contiennent :
- ID du client et de la commande
- Ancien et nouveau poids
- Impact sur l'abonnement
- Kg restants dans l'abonnement

### Restrictions de Sécurité

- ✅ Seuls les managers peuvent modifier les commandes
- ✅ Seul le manager créateur peut modifier sa commande
- ✅ Les kg utilisés ne peuvent pas être négatifs
- ✅ L'ajustement ne fonctionne que pour les clients Premium
- ✅ Un abonnement du mois courant doit exister

### Points d'Attention

1. **Vérifiez avant de modifier** : L'ajustement est immédiat et automatique
2. **Mois courant uniquement** : Seul l'abonnement du mois en cours est affecté
3. **Pas de limite maximale** : Les kg utilisés peuvent dépasser la limite de l'abonnement
4. **Traçabilité complète** : Tous les ajustements sont loggés

### En cas de problème

Si vous ne voyez pas l'ajustement attendu :

1. **Vérifiez les logs** dans la console serveur
2. **Confirmez le type de client** (doit être Premium)
3. **Vérifiez l'existence** d'un abonnement pour le mois courant
4. **Contactez l'équipe technique** si nécessaire

### Support

Pour toute question ou problème technique, contactez l'équipe de développement avec :
- ID de la commande modifiée
- ID du client concerné
- Logs d'erreur si disponibles
