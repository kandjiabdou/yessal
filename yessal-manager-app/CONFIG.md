# Configuration de l'application Yessal Manager

## Variables d'environnement

L'application utilise des variables d'environnement pour sa configuration. Copiez le fichier `env.example` vers `.env` et modifiez les valeurs selon votre environnement.

```bash
cp env.example .env
```

### Variables disponibles

| Variable | Description | Valeur par défaut | Obligatoire |
|----------|-------------|-------------------|-------------|
| `VITE_API_URL` | URL de base de l'API backend | `http://localhost:4520/api` | ✅ |
| `VITE_DEV_PORT` | Port du serveur de développement | `4510` | ❌ |
| `VITE_APP_NAME` | Nom de l'application | `Yessal Manager` | ❌ |
| `VITE_APP_VERSION` | Version de l'application | `1.0.0` | ❌ |
| `VITE_DEV_MODE` | Mode développement | `true` | ❌ |
| `VITE_LOG_LEVEL` | Niveau de log | `debug` | ❌ |

### Exemples de configuration

#### Développement local
```env
VITE_API_URL=http://localhost:4520/api
VITE_DEV_PORT=4510
VITE_DEV_MODE=true
VITE_LOG_LEVEL=debug
```

#### Production
```env
VITE_API_URL=https://api.yessal.com/api
VITE_DEV_PORT=3000
VITE_DEV_MODE=false
VITE_LOG_LEVEL=error
```

#### Test/Staging
```env
VITE_API_URL=https://staging-api.yessal.com/api
VITE_DEV_PORT=4510
VITE_DEV_MODE=false
VITE_LOG_LEVEL=warn
```

## Architecture de la configuration

### Fichier centralisé : `src/config/env.ts`

Ce fichier gère toute la configuration de l'application :
- Lecture des variables d'environnement Vite
- Validation des valeurs
- Valeurs par défaut
- Types TypeScript stricts

### Utilisation dans les services

```typescript
import { API_URL } from '@/config/env';

// Utilisation directe
const response = await axios.get(`${API_URL}/orders`);
```

### Validation automatique

La configuration est validée au démarrage de l'application :
- Vérification de la présence des variables obligatoires
- Validation du format des URLs
- Logs de debug en mode développement

## Bonnes pratiques

1. **Ne jamais commiter le fichier `.env`** - il contient des informations sensibles
2. **Toujours mettre à jour `env.example`** quand vous ajoutez de nouvelles variables
3. **Utiliser le fichier de config centralisé** au lieu de variables en dur
4. **Préfixer les variables avec `VITE_`** pour qu'elles soient accessibles côté client

## Dépannage

### Erreur "VITE_API_URL is required"
- Vérifiez que le fichier `.env` existe
- Vérifiez que `VITE_API_URL` est défini dans le fichier `.env`

### Erreur "Invalid API URL"
- Vérifiez que l'URL est valide (commence par http:// ou https://)
- Vérifiez qu'il n'y a pas d'espaces ou de caractères spéciaux

### Variables non prises en compte
- Redémarrez le serveur de développement après modification du `.env`
- Vérifiez que la variable commence par `VITE_` 