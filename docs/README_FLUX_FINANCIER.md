# Module Flux Financier - Documentation Complète

Bienvenue dans la documentation du module de gestion des flux financiers pour l'application Yessal Manager.

## 📚 Table des matières

### 1. Vue d'ensemble et utilisation
- **[FLUX_FINANCIER_README.md](api-yessal/FLUX_FINANCIER_README.md)** ⭐ **COMMENCEZ ICI**
  - Introduction au module
  - Fonctionnalités disponibles
  - Guide d'utilisation rapide
  - Documentation des endpoints API
  - Exemples de requêtes

### 2. Installation et configuration
- **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)**
  - Checklist complète de déploiement
  - Configuration de la base de données
  - Variables d'environnement
  - Installation pas à pas
  - Dépannage et solutions aux erreurs
  - Migration en production

### 3. Architecture technique
- **[ARCHITECTURE_FLUX.md](ARCHITECTURE_FLUX.md)**
  - Diagrammes de l'architecture
  - Flux de données détaillés
  - Séparation des responsabilités
  - Modèle de données
  - Sécurité et permissions
  - Évolutions futures

### 4. Résumé de l'implémentation
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)**
  - Ce qui a été développé
  - Prochaines étapes
  - Checklist finale
  - Guide d'intégration frontend
  - Points d'attention

### 5. Exemples de requêtes
- **[API_REQUESTS_EXAMPLES.md](API_REQUESTS_EXAMPLES.md)**
  - Collection complète de requêtes cURL
  - Exemples Postman
  - Cas d'usage réels
  - Gestion des erreurs
  - Tests d'API

## 🚀 Démarrage rapide

### Pour les développeurs backend

1. **Configuration initiale**
   ```bash
   # Exécuter le script de setup
   .\setup-flux-financier.ps1
   ```

2. **Lire la documentation**
   - Commencez par [FLUX_FINANCIER_README.md](api-yessal/FLUX_FINANCIER_README.md)
   - Suivez [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) pour l'installation

3. **Tester l'API**
   - Utilisez les exemples de [API_REQUESTS_EXAMPLES.md](API_REQUESTS_EXAMPLES.md)
   - Accédez à Swagger : http://localhost:4520/api-docs

### Pour les développeurs frontend

1. **Comprendre l'architecture**
   - Lisez [ARCHITECTURE_FLUX.md](ARCHITECTURE_FLUX.md)
   - Consultez les endpoints dans [FLUX_FINANCIER_README.md](api-yessal/FLUX_FINANCIER_README.md)

2. **Intégration**
   - Voir les exemples de code dans [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
   - Section "Étape 3 : Intégration frontend"

3. **Tests**
   - Utilisez [API_REQUESTS_EXAMPLES.md](API_REQUESTS_EXAMPLES.md) pour comprendre les réponses

### Pour les chefs de projet / Product Owners

1. **Vue d'ensemble**
   - [ARCHITECTURE_FLUX.md](ARCHITECTURE_FLUX.md) - Section "Vue d'ensemble"
   - [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Section "Prochaines étapes"

2. **Planning**
   - Phases de développement dans [ARCHITECTURE_FLUX.md](ARCHITECTURE_FLUX.md)
   - Checklist dans [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

## 📁 Structure des fichiers

```
Yessal/
├── api-yessal/                              # API Manager
│   ├── src/
│   │   ├── controllers/
│   │   │   └── fluxFinancierController.js   # Contrôleur REST
│   │   ├── services/
│   │   │   └── fluxFinancierService.js      # Logique métier
│   │   ├── routes/
│   │   │   └── fluxFinancierRoute.js        # Routes + Swagger
│   │   ├── utils/
│   │   │   └── prismaSharedClient.js        # Client base partagée
│   │   └── app.js                           # Configuration Express
│   ├── test/
│   │   └── fluxFinancier/
│   │       └── fluxFinancier.test.js        # Tests unitaires
│   ├── FLUX_FINANCIER_README.md             # 📖 Guide principal
│   └── package.json
│
├── shared-database/                         # Base de données partagée
│   └── prisma/
│       ├── schema.prisma                    # Schéma FluxFinancier
│       ├── package.json
│       └── migrations/
│           └── migration_example.sql        # Exemple de migration
│
├── INTEGRATION_GUIDE.md                     # 🔧 Guide d'installation
├── ARCHITECTURE_FLUX.md                     # 🏗️ Documentation architecture
├── IMPLEMENTATION_SUMMARY.md                # ✅ Résumé et étapes
├── API_REQUESTS_EXAMPLES.md                 # 📡 Exemples de requêtes
└── setup-flux-financier.ps1                 # 🤖 Script d'installation
```

## 🎯 Cas d'usage

### Cas 1 : Je suis un nouveau développeur sur le projet

1. Lisez **[FLUX_FINANCIER_README.md](api-yessal/FLUX_FINANCIER_README.md)** pour comprendre le module
2. Suivez **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** pour installer
3. Exécutez les tests : `npm test -- test/fluxFinancier/`
4. Explorez l'API avec **[API_REQUESTS_EXAMPLES.md](API_REQUESTS_EXAMPLES.md)**

### Cas 2 : Je dois intégrer le frontend

1. Lisez **[ARCHITECTURE_FLUX.md](ARCHITECTURE_FLUX.md)** - Section "Flux de données"
2. Consultez **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Section "Étape 3"
3. Utilisez les exemples de code fournis
4. Testez avec **[API_REQUESTS_EXAMPLES.md](API_REQUESTS_EXAMPLES.md)**

### Cas 3 : Je déploie en production

1. Suivez **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Section "Migration en production"
2. Vérifiez la checklist dans **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)**
3. Testez tous les endpoints avec **[API_REQUESTS_EXAMPLES.md](API_REQUESTS_EXAMPLES.md)**
4. Configurez le monitoring selon **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)**

### Cas 4 : J'ai une erreur

1. Consultez **[INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md)** - Section "Dépannage"
2. Vérifiez les logs selon les instructions
3. Testez manuellement avec **[API_REQUESTS_EXAMPLES.md](API_REQUESTS_EXAMPLES.md)**
4. Contactez le support si nécessaire

## ⚙️ Configuration minimale requise

- **Node.js** : v18.0.0 ou supérieur
- **MySQL** : v8.0 ou supérieur
- **RAM** : 2 GB minimum
- **Disk** : 500 MB pour l'application

## 🔑 Variables d'environnement

Créer un fichier `.env` dans `api-yessal/` :

```env
# Base de données principale (utilisateurs, laveries, commandes)
DATABASE_URL="mysql://user:password@localhost:3306/yessal_manager"

# Base de données partagée (flux financiers)
DATABASE_SHARED_URL="mysql://user:password@localhost:3306/yessal_shared"

# JWT
JWT_SECRET="votre_clé_secrète_longue_et_complexe"
JWT_REFRESH_SECRET="votre_clé_refresh_secrète"

# Serveur
PORT=4520
NODE_ENV=development
```

Plus de détails dans [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md).

## 📊 État du projet

| Composant | État | Documentation |
|-----------|------|---------------|
| Base de données partagée | ✅ Prêt | [schema.prisma](shared-database/prisma/schema.prisma) |
| Service Backend | ✅ Prêt | [fluxFinancierService.js](api-yessal/src/services/fluxFinancierService.js) |
| Contrôleur API | ✅ Prêt | [fluxFinancierController.js](api-yessal/src/controllers/fluxFinancierController.js) |
| Routes REST | ✅ Prêt | [fluxFinancierRoute.js](api-yessal/src/routes/fluxFinancierRoute.js) |
| Tests unitaires | ✅ Prêt | [fluxFinancier.test.js](api-yessal/test/fluxFinancier/fluxFinancier.test.js) |
| Documentation API | ✅ Prêt | Swagger UI + Markdown |
| Frontend Manager | ⏳ À faire | Exemples fournis |
| API Associé | ⏳ Futur | Planifié |
| Service Fichiers | ⏳ Futur | Planifié |

## 🧪 Tests

```bash
# Tous les tests du module
npm test -- test/fluxFinancier/

# Test spécifique
npm test -- test/fluxFinancier/fluxFinancier.test.js

# Avec coverage
npm run test:coverage
```

## 📞 Support et contribution

### Obtenir de l'aide

1. **Documentation** : Consultez les fichiers markdown ci-dessus
2. **Swagger UI** : http://localhost:4520/api-docs
3. **Tests** : Examinez les fichiers de test pour des exemples
4. **Issues** : Créez une issue sur le repo Git

### Contribuer

1. Créez une branche : `git checkout -b feature/nouvelle-fonctionnalité`
2. Développez en suivant les bonnes pratiques de [ARCHITECTURE_FLUX.md](ARCHITECTURE_FLUX.md)
3. Ajoutez des tests
4. Mettez à jour la documentation
5. Créez une Pull Request

## 📝 Historique des versions

### v1.0.0 - Février 2025
- ✅ Module flux financier Manager complet
- ✅ CRUD dépenses/recettes
- ✅ Statistiques par laverie
- ✅ Documentation complète
- ✅ Tests unitaires

### Versions futures
- v1.1.0 : Application Associé
- v1.2.0 : Service de gestion de fichiers
- v2.0.0 : Analytics et IA

## 🏆 Bonnes pratiques

En développant avec ce module, respectez :

1. **Sécurité** : Toujours valider les entrées, utiliser HTTPS en prod
2. **Performance** : Utiliser la pagination, indexer les requêtes fréquentes
3. **Code quality** : Suivre les règles SonarQube, éviter les fonctions trop longues
4. **Tests** : Couvrir au moins 80% du code
5. **Documentation** : Mettre à jour les docs à chaque changement

Plus de détails dans [ARCHITECTURE_FLUX.md](ARCHITECTURE_FLUX.md) - Section "Bonnes pratiques".

## 🔗 Liens utiles

- **Prisma Docs** : https://www.prisma.io/docs
- **Express.js** : https://expressjs.com/
- **Swagger** : https://swagger.io/
- **SonarQube** : https://www.sonarqube.org/

---

**Maintenu par** : Équipe Technique Yessal  
**Dernière mise à jour** : Février 2025  
**Version** : 1.0.0

Pour toute question, consultez d'abord cette documentation ou contactez l'équipe technique.

Bon développement ! 🚀
