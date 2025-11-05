# Guide d'intégration - Module Flux Financier

## Checklist de déploiement

### 1. Prérequis

- [ ] Node.js v18+ installé
- [ ] MySQL 8+ installé et accessible
- [ ] Variables d'environnement configurées
- [ ] Accès aux bases de données (manager et partagée)

### 2. Configuration de la base de données

#### a. Créer la base de données partagée

```sql
-- Se connecter à MySQL
mysql -u root -p

-- Créer la base partagée
CREATE DATABASE IF NOT EXISTS yessal_shared CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Créer un utilisateur dédié (optionnel mais recommandé)
CREATE USER IF NOT EXISTS 'yessal_user'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';

-- Donner les permissions
GRANT ALL PRIVILEGES ON yessal_shared.* TO 'yessal_user'@'localhost';
GRANT ALL PRIVILEGES ON yessal_manager.* TO 'yessal_user'@'localhost';
FLUSH PRIVILEGES;
```

#### b. Configuration du fichier .env

Créer ou modifier `.env` dans `api-yessal/` :

```env
# Base de données principale
DATABASE_URL="mysql://yessal_user:votre_mot_de_passe@localhost:3306/yessal_manager"

# Base de données partagée
DATABASE_SHARED_URL="mysql://yessal_user:votre_mot_de_passe@localhost:3306/yessal_shared"

# JWT
JWT_SECRET="votre_clé_secrète_très_longue_et_complexe"
JWT_REFRESH_SECRET="votre_clé_refresh_secrète"

# Server
PORT=4520
NODE_ENV=development
```

### 3. Installation

```bash
# Depuis la racine du projet
cd Yessal

# 1. Installer les dépendances de la base partagée
cd shared-database/prisma
npm install

# 2. Générer le client Prisma partagé
npx prisma generate

# 3. Créer les migrations
npx prisma migrate dev --name init_flux_financier

# 4. Installer les dépendances de l'API
cd ../../api-yessal
npm install

# 5. Générer le client Prisma de l'API (si pas déjà fait)
npx prisma generate
```

### 4. Vérification de l'installation

```bash
# Depuis api-yessal/
npm test -- test/fluxFinancier/fluxFinancier.test.js
```

### 5. Démarrage

```bash
# Mode développement
npm run dev

# Mode production
npm start
```

### 6. Test des endpoints

Accédez à Swagger UI : http://localhost:4520/api-docs

Ou utilisez curl :

```bash
# 1. Login (obtenez le token)
curl -X POST http://localhost:4520/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "votre_email@example.com",
    "password": "votre_mot_de_passe"
  }'

# 2. Créer un flux (remplacez YOUR_TOKEN)
curl -X POST http://localhost:4520/api/flux-financier \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "type": "depense",
    "montant": 50000,
    "dateFluxFinancier": "2025-02-01T10:00:00Z",
    "motif": "Test",
    "laverieId": 1
  }'

# 3. Lister les flux
curl -X GET http://localhost:4520/api/flux-financier \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Structure de la base de données

### Table FluxFinancier (base partagée)

```sql
CREATE TABLE `FluxFinancier` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` ENUM('depense', 'recette', 'emprunt', 'pret') NOT NULL DEFAULT 'depense',
  `montant` DECIMAL(65, 30) NOT NULL,
  `devise` ENUM('FCFA', 'EUR', 'USD') NOT NULL DEFAULT 'FCFA',
  `dateFluxFinancier` DATETIME(3) NOT NULL,
  `motif` VARCHAR(191) NULL,
  `beneficiaire` VARCHAR(191) NULL,
  `sourceFinancement` ENUM('caisse', 'banque', 'emprunt', 'autre') NULL,
  `actionnaire` VARCHAR(191) NULL,
  `statut` ENUM('pending', 'validated', 'rejected', 'annule') NULL,
  `dateEcheance` DATETIME(3) NULL,
  `description` TEXT NULL,
  `preuveUrl` VARCHAR(191) NULL,
  `sourceApp` ENUM('manager', 'associe') NOT NULL,
  `laverieId` INT NULL,
  `laverieName` VARCHAR(191) NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `validatedBy` VARCHAR(191) NULL,
  `flagged` BOOLEAN NOT NULL DEFAULT false,
  `validationStatus` ENUM('pending', 'validated', 'rejected') NOT NULL DEFAULT 'pending',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Dépannage

### Erreur : "PrismaClient is unable to run in the browser"

**Solution :** Vérifiez que le client Prisma partagé a été généré :
```bash
cd shared-database/prisma
npx prisma generate
```

### Erreur : "Unknown column 'FluxFinancier.id'"

**Solution :** Les migrations n'ont pas été exécutées :
```bash
cd shared-database/prisma
npx prisma migrate dev
```

### Erreur : "Cannot find module '@prisma/shared-client'"

**Solution :** Réinstallez les dépendances :
```bash
cd shared-database/prisma
npm install
npx prisma generate

cd ../../api-yessal
npm install
```

### Erreur : "Access denied for user"

**Solution :** Vérifiez les permissions MySQL :
```sql
SHOW GRANTS FOR 'yessal_user'@'localhost';
-- Si insuffisant, réexécutez les GRANT
```

### Les flux ne sont pas visibles

**Vérifications :**
1. Le flux a bien `sourceApp = 'manager'`
2. Le `createdBy` correspond à votre `user.id`
3. Le flux n'est pas marqué `flagged = true`

```sql
-- Vérifier directement dans la base
USE yessal_shared;
SELECT * FROM FluxFinancier WHERE createdBy = 'VOTRE_USER_ID';
```

## Migration en production

### 1. Sauvegarde

```bash
# Sauvegarder la base existante
mysqldump -u root -p yessal_manager > backup_manager_$(date +%Y%m%d).sql
```

### 2. Variables d'environnement

Créer `.env.production` :

```env
NODE_ENV=production
DATABASE_URL="mysql://user:pass@prod-host:3306/yessal_manager"
DATABASE_SHARED_URL="mysql://user:pass@prod-host:3306/yessal_shared"
JWT_SECRET="clé_production_très_sécurisée"
PORT=4520
LOG_LEVEL=info
```

### 3. Déploiement

```bash
# Sur le serveur de production
cd /var/www/yessal/api-yessal

# Pull du code
git pull origin main

# Installation
npm ci --production

# Générer les clients
cd ../shared-database/prisma
npx prisma generate
cd ../../api-yessal

# Migrations (avec précaution!)
cd ../shared-database/prisma
npx prisma migrate deploy

# Redémarrer le service
sudo systemctl restart api-yessal
```

### 4. Vérification

```bash
# Vérifier les logs
sudo journalctl -u api-yessal -f

# Tester l'API
curl http://localhost:4520/api/flux-financier -H "Authorization: Bearer TOKEN"
```

## Performance

### Indexation recommandée

```sql
-- Améliorer les performances de recherche
ALTER TABLE FluxFinancier ADD INDEX idx_laverie_date (laverieId, dateFluxFinancier);
ALTER TABLE FluxFinancier ADD INDEX idx_created_by (createdBy);
ALTER TABLE FluxFinancier ADD INDEX idx_source_app_status (sourceApp, validationStatus);
```

### Cache (optionnel)

Pour améliorer les performances des statistiques, considérez Redis :

```javascript
// Dans fluxFinancierService.js
const redis = require('../utils/redis');

async getStatistics(laverieId, period) {
  const cacheKey = `stats:${laverieId}:${period.startDate}:${period.endDate}`;
  
  // Vérifier le cache
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Calculer et mettre en cache
  const stats = await this._calculateStats(laverieId, period);
  await redis.setex(cacheKey, 300, JSON.stringify(stats)); // 5 min
  
  return stats;
}
```

## Sécurité

### Recommandations

1. **HTTPS obligatoire** en production
2. **Rate limiting** : limitez les requêtes par utilisateur
3. **Validation stricte** : utilisez Joi pour valider toutes les entrées
4. **Audit logs** : loggez toutes les créations/modifications
5. **Backup régulier** : automatisez les sauvegardes MySQL

### Exemple de rate limiting

```javascript
// Dans fluxFinancierRoute.js
const rateLimit = require('express-rate-limit');

const fluxLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes max
  message: 'Trop de requêtes, réessayez plus tard'
});

router.post('/', fluxLimiter, authenticate, authorize(...), controller.createFlux);
```

## Support

Pour toute question ou problème :
- Consultez la documentation : `FLUX_FINANCIER_README.md`
- Vérifiez les logs : `/var/log/api-yessal/`
- Contactez l'équipe technique

---

**Version :** 1.0.0  
**Dernière mise à jour :** Février 2025
