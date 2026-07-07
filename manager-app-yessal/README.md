# Manager App — Démarrage local

Ce README décrit comment démarrer l'application `manager-app-yessal` en local pour le développement.

Résumé
------

Application front-end développée avec Vite + React + TypeScript et Tailwind.

Prérequis
---------

- Node.js (>=16, recommandé 18+)
- npm, pnpm ou bun
- Accès à l'API backend (`api-yessal`) en local ou distant

Fichiers importants
-------------------

- `.env.example` / `.env` — variables d'environnement pour Vite (préfixées `VITE_`)
- `package.json` — scripts utiles (`dev`, `build`, `preview`, `test`)
- `manager-yessal.service` — fichier systemd fourni pour déploiement serveur

Installation
------------

Depuis le dossier `manager-app-yessal` :

```bash
cd manager-app-yessal
npm install
# ou pnpm install / bun install
```

Configuration des variables d'environnement
-----------------------------------------

Copiez l'exemple et adaptez selon votre environnement :

```bash
cp .env.example .env
```

Variables importantes (dans `.env`) :

- `VITE_API_URL` — URL de l'API backend (par défaut `http://localhost:4520/api`)
- `VITE_FILE_SERVICE_URL` — URL du service de fichiers (par défaut `http://localhost:4540`)
- `VITE_FILE_SERVICE_API_KEY` — clé API pour le service de fichiers
- `VITE_DEV_PORT` — port de développement (par défaut `4510`)
- `VITE_APP_NAME`, `VITE_APP_VERSION` — métadonnées affichables

Vous pouvez consulter la configuration centrale dans `src/config/env.ts`.

Démarrage en développement
--------------------------

```bash
npm run dev
```

Ouvrez `http://localhost:4510` (ou la valeur de `VITE_DEV_PORT`) pour voir l'application.

Preview / Build
---------------

Pour prévisualiser la version buildée :

```bash
npm run build
npm run preview
```

Pour construire pour la production :

```bash
npm run build
```

Le script `deploy` dans `package.json` exécute la build puis redémarre un service systemd (`yessal-manager`) — usage réservé aux serveurs Linux configurés.

Tests
-----

Exécuter la suite de tests (Jest) :

```bash
npm test
```

Dépannage rapide
----------------

- Erreur de configuration Vite à l'import : vérifiez que les variables `VITE_...` sont définies dans `.env`.
- Problème de CORS lors d'appels API : assurez-vous que l'API `api-yessal` accepte l'origine `http://localhost:4510` ou mettez `CORS_ORIGIN` en conséquence.
- Si le port est occupé, changez `VITE_DEV_PORT` dans `.env`.
