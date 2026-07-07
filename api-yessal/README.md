# API Yessal — Démarrage local

Ce fichier explique comment démarrer l'API `api-yessal` en local pour le développement.

Prérequis
---------

- Node.js (>=16)
- npm (ou pnpm/bun selon préférence)
- MySQL
- Redis (optionnel, recommandé pour le cache)

Fichiers importants
-------------------

- `.env.example` — exemple de configuration d'environnement (copier en `.env`)
- `prisma/schema.prisma` — schéma de la base de données (Prisma)
- `exports/` — dumps SQL fournis pour restaurer une base
- `scripts/` — scripts d'export/import utiles

Installation
------------

1. Depuis la racine du projet, ouvrez un terminal et allez dans le dossier :

```bash
cd api-yessal
```

2. Installez les dépendances :

```bash
npm install
# ou pnpm install / bun install
```

Configuration des variables d'environnement
-----------------------------------------

Copiez le fichier d'exemple et adaptez les valeurs :

```bash
cp .env.example .env
```

Points clés à configurer dans `.env` (extraits de `.env.example`) :

```
PORT=4520
NODE_ENV=development
DATABASE_URL="mysql://root:admin@localhost:3306/yessal"
DATABASE_SHARED_URL="mysql://root:admin@localhost:3306/yessal_shared"
JWT_SECRET=...            # utiliser une valeur secrète
JWT_SECRET_ADMIN=...      # secret admin
REDIS_URL=redis://localhost:6379
```

Base de données (Prisma)
------------------------

Le projet utilise Prisma avec MySQL (voir `prisma/schema.prisma`). Après avoir configuré `DATABASE_URL` :

1. Générer le client Prisma (si nécessaire) :

```bash
npx prisma generate
```

2. Appliquer les migrations (si vous souhaitez créer la structure vide) :

```bash
# Si des migrations existent
npx prisma migrate deploy
# ou pour développement interactif
npx prisma migrate dev
```

3. (Optionnel) Ouvrir Prisma Studio :

```bash
npm run studio
```

Importer un dump SQL
---------------------

Si vous avez un dump SQL fourni dans `exports/`, vous pouvez soit restaurer via votre client MySQL, soit utiliser le script `scripts/import-from-sql.mjs` :

```bash
node scripts/import-from-sql.mjs path/to/dump.sql
```

Lancer l'API en développement
----------------------------

```bash
npm run dev
# démarre nodemon server.js (rechargement automatique)
```

Lancer en production (local)
----------------------------

```bash
npm start
# ou exécuter via PM2/systemd en production
```

Scripts utiles
--------------

- `npm run dev` — démarrage en développement (nodemon)
- `npm start` — démarrage en production (node server.js)
- `npm test` — lancer les tests (Jest)
- `npm run export` — exporter la base via `scripts/export-db-mysql.mjs`
- `npm run import` — importer (script d'import fourni)
- `npm run studio` — lancer Prisma Studio

Redis
-----

Redis est utilisé pour le cache (dashboard). Si vous n'avez pas Redis, mettez `REDIS_URL` à vide ou lancez un conteneur local :

```bash
docker run -d --name redis -p 6379:6379 redis:7
```

Tests
-----

```bash
npm test
```

Logs
----

Les logs et fichiers d'export sont présents dans `logs/` et `exports/`.

Dépannage rapide
----------------

- Erreur de connexion DB : vérifiez `DATABASE_URL` et que MySQL écoute sur l'hôte/port.
- Erreur Prisma : exécutez `npx prisma generate` puis `npx prisma migrate dev`.
- Problèmes JWT : assurez-vous que `JWT_SECRET` et `JWT_SECRET_ADMIN` sont définis.

Déploiement
-----------

Des fichiers de service systemd sont fournis (`api-yessal.service`) pour usage en production sur un serveur Linux. Consultez `DEPLOYMENT_RECETTE.md` à la racine pour la procédure de déploiement.
