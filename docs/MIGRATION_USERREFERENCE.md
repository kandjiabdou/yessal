# Migration vers UserReference

## Objectif

Centraliser la gestion des utilisateurs dans la base partagée pour éviter les duplications et permettre un accès facile aux informations utilisateur (nom, prénom) depuis n'importe quelle app.

## Architecture

### Avant
```
FluxFinancier {
  createdBy: String       // ID brut "5", "42", etc.
  validatedBy: String?    
  sourceApp: "MANAGER" | "ASSOCIE"
}
```

Pour afficher le nom/prénom, il fallait:
1. Identifier le sourceApp
2. Requêter la base locale correspondante
3. Faire un JOIN complexe

### Après
```
UserReference {
  id: UUID
  sourceApp: "MANAGER" | "ASSOCIE"
  sourceUserId: String
  nom: String?
  prenom: String?
}

FluxFinancier {
  createdByRefId: String
  createdByRef: UserReference
  validatedByRefId: String?
  validatedByRef: UserReference?
}
```

Pour afficher le nom/prénom:
```javascript
flux.createdByRef.nom
flux.createdByRef.prenom
```

## Étapes de migration

### 1. Backup de la base de données
```bash
# Exporter la base partagée
mysqldump -u user -p shared_database > backup_$(date +%Y%m%d).sql
```

### 2. Remplacer le schéma Prisma

```bash
cd shared-database/prisma
mv schema.prisma schema_old.prisma
mv schema_new.prisma schema.prisma
```

### 3. Appliquer le nouveau schéma

```bash
cd shared-database
npx prisma db push
```

Cela va créer:
- La table `UserReference`
- Les colonnes `createdByRefId` et `validatedByRefId` dans `FluxFinancier`

### 4. Migrer les données existantes

```bash
cd shared-database
node scripts/migrate-userreference.js
```

Ce script va:
- Analyser tous les flux existants
- Créer les `UserReference` pour chaque utilisateur unique
- Récupérer nom/prénom depuis la base locale manager
- Mettre à jour tous les flux avec les références

### 5. Vérification

Vérifier que tous les flux ont une référence:
```sql
SELECT COUNT(*) FROM FluxFinancier WHERE createdByRefId IS NULL;
-- Doit retourner 0
```

Tester l'API:
```bash
# Dans api-yessal
npm run dev
```

### 6. Finaliser (APRÈS TESTS)

Une fois que tout fonctionne:

```sql
-- Rendre createdByRefId obligatoire
ALTER TABLE FluxFinancier 
  MODIFY COLUMN createdByRefId VARCHAR(191) NOT NULL;

-- Supprimer les anciennes colonnes
ALTER TABLE FluxFinancier
  DROP COLUMN createdBy,
  DROP COLUMN validatedBy;

-- Ajouter les contraintes FK
ALTER TABLE FluxFinancier
  ADD CONSTRAINT FluxFinancier_createdByRefId_fkey 
    FOREIGN KEY (createdByRefId) REFERENCES UserReference(id) 
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT FluxFinancier_validatedByRefId_fkey 
    FOREIGN KEY (validatedByRefId) REFERENCES UserReference(id) 
    ON DELETE SET NULL ON UPDATE CASCADE;
```

### 7. Regénérer le client Prisma

```bash
cd shared-database
npx prisma generate
```

## Modifications du code

### Service créé: `userReferenceService.js`

```javascript
// Obtenir ou créer une référence utilisateur
const userRefId = await userReferenceService.getOrCreateUserRef(userId, 'MANAGER');

// Synchroniser les infos (si l'utilisateur a changé de nom)
await userReferenceService.syncUserInfo(userRefId);
```

### Service modifié: `fluxFinancierService.js`

- ✅ Utilise `UserReference` au lieu de `createdBy` brut
- ✅ Inclut automatiquement `createdByRef` et `validatedByRef` dans les réponses
- ✅ Code refactorisé en fonctions courtes et réutilisables
- ✅ Pas de duplication de code
- ✅ Séparation des responsabilités

## Avantages

1. **Performance**: Moins de requêtes cross-database
2. **Simplicité**: Nom/prénom directement disponibles
3. **Scalabilité**: Facile d'ajouter d'autres apps (Web, Mobile, etc.)
4. **Maintenabilité**: Code plus propre et modulaire
5. **Évolutivité**: Possibilité d'ajouter plus d'infos utilisateur

## Rollback

Si besoin de revenir en arrière:

```bash
cd shared-database
mv schema.prisma schema_new.prisma
mv schema_old.prisma schema.prisma
npx prisma db push

# Restaurer le backup
mysql -u user -p shared_database < backup_YYYYMMDD.sql
```

## Tests recommandés

- [ ] Créer un nouveau flux
- [ ] Lister les flux (vérifier que nom/prénom apparaissent)
- [ ] Modifier un flux
- [ ] Ajouter une preuve
- [ ] Supprimer une preuve
- [ ] Supprimer un flux
- [ ] Obtenir les statistiques
- [ ] Vérifier les permissions (seul le créateur peut modifier)
