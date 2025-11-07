# Migration: Ajout du Site de Lavage aux Abonnements Premium

## Vue d'ensemble

Cette migration ajoute le champ `siteLavageId` (non-null) au modèle `abonnementpremiummensuel` pour associer chaque abonnement premium à un site de lavage spécifique. Cela permet de mieux gérer les statistiques et les flux financiers par site.

## Changements de Schéma

### Modèle `abonnementpremiummensuel`

**Ajout:**
- `siteLavageId` (Int, NOT NULL) - ID du site de lavage associé
- Relation `siteLavage` avec le modèle `sitelavage`
- Index pour optimiser les requêtes: `[siteLavageId, annee, mois, flag]`

**Fichier modifié:** `api-yessal/prisma/schema.prisma`

```prisma
model abonnementpremiummensuel {
  id              Int        @id @default(autoincrement())
  clientUserId    Int
  siteLavageId    Int        // ✨ NOUVEAU CHAMP
  annee           Int
  mois            Int
  limiteKg        Float      @default(40)
  kgUtilises      Float      @default(0)
  montant         Float      @default(15000)
  createdByUserId Int?
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @default(now())
  clientUser      user       @relation(fields: [clientUserId], references: [id])
  siteLavage      sitelavage @relation(fields: [siteLavageId], references: [id]) // ✨ NOUVELLE RELATION
  createdBy       user?      @relation("AbonnementCreatedBy", fields: [createdByUserId], references: [id])
  flag            Boolean    @default(true)
  
  @@index([siteLavageId, annee, mois, flag]) // ✨ NOUVEL INDEX
}
```

### Modèle `sitelavage`

**Ajout:**
- Relation `abonnements` avec le modèle `abonnementpremiummensuel`

```prisma
model sitelavage {
  // ... champs existants ...
  abonnements       abonnementpremiummensuel[] // ✨ NOUVELLE RELATION
}
```

## Changements de Code

### 1. AuthController (`api-yessal/src/controllers/authController.js`)

**Modification:** Fonction `register`

- Ajout de la validation pour `siteLavagePrincipalGerantId` lors de la création d'un client Premium
- Ajout du champ `siteLavageId` lors de la création de l'abonnement premium
- Ajout du champ `createdByUserId` pour tracer qui a créé l'abonnement

```javascript
// Require site for Premium subscriptions
if (!siteLavagePrincipalGerantId) {
  throw new Error('siteLavagePrincipalGerantId is required for Premium subscriptions');
}

await tx.abonnementpremiummensuel.create({
  data: {
    clientUserId: newUser.id,
    siteLavageId: siteLavagePrincipalGerantId, // ✨ NOUVEAU
    annee: currentYear,
    mois: currentMonth,
    limiteKg: 40,
    kgUtilises: 0,
    montant,
    createdByUserId: createdByUserId || null // ✨ NOUVEAU
  }
});
```

### 2. UserController (`api-yessal/src/controllers/userController.js`)

**Modifications:**

#### a. Fonction `getUsers`
- Ajout des champs `siteLavageId` et `siteLavage` dans le select des abonnements

#### b. Fonction `getUserById`
- Ajout des champs `siteLavageId` et `siteLavage` dans le select des abonnements

#### c. Fonction `getCurrentUser`
- Ajout des champs `siteLavageId` et `siteLavage` dans le select des abonnements

#### d. Fonction `createAbonnementPremium`
- **Validation obligatoire** du paramètre `siteLavageId`
- Vérification de l'existence du site de lavage
- Ajout du champ `siteLavageId` lors de la création

```javascript
const { start = 'this', startMonth, count = 1, limiteKg, siteLavageId } = req.body;

// ✨ NOUVELLE VALIDATION
if (!siteLavageId) {
  return res.status(400).json({ success: false, message: 'siteLavageId est requis' });
}

// ✨ NOUVELLE VÉRIFICATION
const site = await prisma.sitelavage.findUnique({
  where: { id: Number(siteLavageId), flag: true }
});

if (!site) {
  return res.status(404).json({ success: false, message: 'Site de lavage non trouvé' });
}

// Création avec siteLavageId
await tx.abonnementpremiummensuel.create({
  data: {
    clientUserId: Number(id),
    siteLavageId: Number(siteLavageId), // ✨ NOUVEAU
    // ... autres champs
  }
});
```

### 3. DashboardController (`api-yessal/src/controllers/dashboardController.js`)

**Modifications:**

#### a. Fonction `getTodayData`
- Filtrage des abonnements par `siteLavageId` et `flag`

```javascript
const todayAbonnements = await prisma.abonnementpremiummensuel.findMany({ 
  where: { 
    createdAt: { gte: startOfToday },
    siteLavageId: siteIdInt, // ✨ NOUVEAU FILTRE
    flag: true
  }, 
  select: { montant: true } 
});
```

#### b. Fonction `getPeriodData`
- Filtrage des abonnements par `siteLavageId` et `flag`
- Filtrage des abonnements en cours par `siteLavageId`

```javascript
const periodAbonnements = await prisma.abonnementpremiummensuel.findMany({ 
  where: { 
    createdAt: { gte: periodStart, lt: periodEnd },
    siteLavageId: siteIdInt, // ✨ NOUVEAU FILTRE
    flag: true
  }, 
  select: { montant: true } 
});

// Pour les stats mensuelles
periodStats.totalAbonnementsEnCours = await prisma.abonnementpremiummensuel.count({ 
  where: { 
    annee: year, 
    mois: month, 
    siteLavageId: siteIdInt, // ✨ NOUVEAU FILTRE
    flag: true 
  } 
});
```

#### c. Fonction `fetchPeriodData`
- Filtrage des abonnements par `siteLavageId` et `flag`

```javascript
prisma.abonnementpremiummensuel.findMany({
  where: { 
    createdAt: { gte: startDate, lt: endDate },
    siteLavageId: siteIdInt, // ✨ NOUVEAU FILTRE
    flag: true
  },
  select: { montant: true }
})
```

### 4. FluxFinancierService (`api-yessal/src/services/fluxFinancierService.js`)

**Modification:** Fonction `getStatistics`

- **Inclusion des abonnements comme recettes** dans les statistiques financières
- Filtrage des abonnements par `siteLavageId` et `flag`
- Ajout des revenus des abonnements au total des recettes

```javascript
const abonnementsWhere = {
  siteLavageId: laverieIdInt, // ✨ NOUVEAU FILTRE
  flag: true
};

// Ajouter le filtre de date si présent
if (dateRange) {
  fluxWhere.dateFluxFinancier = dateRange;
  commandesWhere.dateHeureCommande = dateRange;
  abonnementsWhere.createdAt = dateRange; // ✨ NOUVEAU FILTRE
}

// Récupérer les données des abonnements
const abonnementsData = await prisma.abonnementpremiummensuel.aggregate({
  where: abonnementsWhere,
  _sum: { montant: true },
  _count: true
});

// Calculer les revenus
const abonnementsRevenu = Number(abonnementsData._sum.montant || 0);
const recettesTotal = recettesFluxTotal + commandesRevenu + abonnementsRevenu; // ✨ INCLUT ABONNEMENTS

return {
  depenses: { ... },
  recettes: {
    total: recettesTotal,
    fluxFinanciers: recettesFluxTotal,
    commandes: commandesRevenu,
    abonnements: abonnementsRevenu, // ✨ NOUVEAU
    count: recettesFluxData._count,
    commandesCount: commandesData._count,
    abonnementsCount: abonnementsData._count // ✨ NOUVEAU
  },
  solde,
  devise: 'FCFA'
};
```

## Script de Migration

**Fichier:** `api-yessal/scripts/update-abonnement-sites.js`

Ce script a été créé pour mettre à jour les 30 abonnements existants en leur assignant un `siteLavageId`:
- Utilise le `siteLavagePrincipalGerantId` de l'utilisateur si disponible
- Utilise le premier site disponible comme fallback

**Résultat:** 30 abonnements mis à jour avec succès

## Impact sur les API

### Endpoints Modifiés

1. **POST /api/auth/register**
   - Paramètre requis pour Premium: `siteLavagePrincipalGerantId`

2. **POST /api/users/:id/abonnements**
   - Nouveau paramètre requis: `siteLavageId`
   - Validation du site de lavage

3. **GET /api/users** et **GET /api/users/:id**
   - Retourne maintenant les informations du site de lavage pour chaque abonnement

4. **GET /api/dashboard/:siteId/today**
   - Filtre les abonnements par site

5. **GET /api/dashboard/:siteId/period**
   - Filtre les abonnements par site
   - Compte les abonnements en cours par site

6. **GET /api/flux-financier/:laverieId/statistics**
   - Inclut les abonnements comme recettes
   - Filtre par site de lavage

## Tests Requis

### Tests Unitaires à Mettre à Jour

1. **authController.test.js**
   - Tester la création d'utilisateur Premium sans `siteLavagePrincipalGerantId` (doit échouer)
   - Tester la création d'utilisateur Premium avec `siteLavagePrincipalGerantId` valide

2. **userController.test.js**
   - Tester la création d'abonnement sans `siteLavageId` (doit échouer)
   - Tester la création d'abonnement avec `siteLavageId` invalide
   - Tester la création d'abonnement avec `siteLavageId` valide

3. **dashboardController.test.js**
   - Vérifier que les stats filtrent correctement par site

4. **fluxFinancierService.test.js**
   - Vérifier que les abonnements sont inclus dans les recettes
   - Vérifier que les abonnements sont filtrés par site

### Tests d'Intégration

1. Créer un utilisateur Premium et vérifier que l'abonnement a bien un `siteLavageId`
2. Créer plusieurs abonnements pour différents sites et vérifier la séparation dans les stats
3. Vérifier que les statistiques financières incluent bien les abonnements

## Commandes Exécutées

```bash
# 1. Rendre siteLavageId nullable temporairement
npx prisma db push

# 2. Exécuter le script de migration
node scripts/update-abonnement-sites.js

# 3. Rendre siteLavageId obligatoire
npx prisma db push

# 4. Générer le client Prisma
npx prisma generate
```

## Points d'Attention

### ⚠️ Breaking Changes

1. **Création d'abonnement:** Le paramètre `siteLavageId` est maintenant **OBLIGATOIRE**
2. **Création d'utilisateur Premium:** Le paramètre `siteLavagePrincipalGerantId` est maintenant **OBLIGATOIRE**

### 📊 Amélioration des Statistiques

- Les abonnements sont maintenant comptabilisés comme **recettes** dans les flux financiers
- Les statistiques dashboard filtrent correctement par site de lavage
- Meilleure traçabilité des revenus par site

### 🔍 Données Migrées

- 30 abonnements existants ont été mis à jour
- Tous ont été assignés au site ID: 3 (ou site principal de l'utilisateur)
- Aucune perte de données

## Prochaines Étapes Recommandées

1. ✅ Mettre à jour les tests unitaires et d'intégration
2. ✅ Tester en environnement de staging
3. ✅ Mettre à jour la documentation API
4. ✅ Informer les équipes frontend des nouveaux champs requis
5. ✅ Déployer en production avec un plan de rollback

## Rollback

En cas de problème, les étapes de rollback sont:

1. Revenir à la version précédente du code
2. Exécuter:
   ```bash
   git checkout <previous-commit> -- api-yessal/prisma/schema.prisma
   npx prisma db push --force-reset
   npx prisma generate
   ```
3. Restaurer la sauvegarde de la base de données si nécessaire

---

**Date de migration:** 2025-11-06  
**Auteur:** GitHub Copilot  
**Version API:** api-yessal v2.x
