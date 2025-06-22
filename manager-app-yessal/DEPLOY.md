# Guide de déploiement - Application Manager Yessal

## Prérequis

- Docker et Docker Compose installés
- Nginx configuré sur le serveur
- Certificats SSL configurés pour `manager.yessal.sn`
- API Yessal déployée et accessible sur `api.yessal.sn`

## Configuration

### 1. Variables d'environnement

Les variables d'environnement sont configurées dans le `docker-compose.yml` :

```yaml
args:
  - VITE_API_URL=https://api.yessal.sn/api
  - VITE_DEV_PORT=4510
  - VITE_APP_NAME=Yessal Manager
  - VITE_APP_VERSION=1.0.0
  - VITE_DEV_MODE=false
  - VITE_LOG_LEVEL=error
```

Modifiez ces valeurs selon votre environnement si nécessaire.

### 2. Configuration Nginx

Copiez la configuration Nginx :

```bash
sudo cp nginx/manager.yessal.sn.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/manager.yessal.sn.conf /etc/nginx/sites-enabled/
```

### 3. Certificats SSL

Générez les certificats SSL avec Let's Encrypt :

```bash
sudo certbot --nginx -d manager.yessal.sn
```

## Déploiement

### 1. Build et lancement

```bash
# Build de l'image Docker
docker-compose build

# Lancement en arrière-plan
docker-compose up -d
```

### 2. Vérification

```bash
# Vérifier que le conteneur fonctionne
docker-compose ps

# Vérifier les logs
docker-compose logs -f yessal-manager
```

### 3. Redémarrage de Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Maintenance

### Mise à jour

```bash
# Arrêter l'application
docker-compose down

# Récupérer les dernières modifications
git pull

# Rebuild et redémarrage
docker-compose build
docker-compose up -d
```

### Logs

```bash
# Logs de l'application
docker-compose logs -f yessal-manager

# Logs Nginx
sudo tail -f /var/log/nginx/manager.yessal.sn.access.log
sudo tail -f /var/log/nginx/manager.yessal.sn.error.log
```

### Mise à jour des variables d'environnement

Pour changer l'URL de l'API ou d'autres variables :

1. Modifiez le `docker-compose.yml`
2. Rebuild l'application :

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## URLs

- **Application Manager** : https://manager.yessal.sn
- **API Backend** : https://api.yessal.sn

## Ports utilisés

- **4510** : Port interne de l'application (mappé vers 80 dans le conteneur)
- **443/80** : Ports Nginx (HTTPS/HTTP)

## Architecture

```
Internet → Nginx (443/80) → Docker Container (4510:80) → Application React
                                                      ↓
                                              API (api.yessal.sn)
```

## Dépannage

### L'application ne se charge pas

1. Vérifiez que le conteneur fonctionne : `docker-compose ps`
2. Vérifiez les logs : `docker-compose logs yessal-manager`
3. Vérifiez la configuration Nginx : `sudo nginx -t`

### Erreurs API

1. Vérifiez que l'API est accessible : `curl https://api.yessal.sn/health`
2. Vérifiez les variables d'environnement dans le build
3. Vérifiez les logs du navigateur (F12 → Console)

### Problèmes de certificats SSL

```bash
# Renouveler les certificats
sudo certbot renew

# Redémarrer Nginx
sudo systemctl restart nginx
``` 