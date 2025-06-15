# Guide de déploiement - API Yessal

## Prérequis

- Docker et Docker Compose installés
- Nginx configuré sur le serveur
- Certificats SSL configurés pour `api.yessal.sn`
- Base de données PostgreSQL accessible

## Configuration

### 1. Variables d'environnement

Copiez le fichier d'exemple et configurez vos variables :

```bash
cp env.production.example .env.production
```

Modifiez les valeurs dans `.env.production` :
- `DATABASE_URL` : URL de votre base de données PostgreSQL
- `JWT_SECRET` : Clé secrète pour JWT (générez une clé sécurisée)
- `CORS_ORIGIN` : Domaines autorisés pour CORS

### 2. Configuration Nginx

Copiez la configuration Nginx :

```bash
sudo cp nginx/api.yessal.sn.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/api.yessal.sn.conf /etc/nginx/sites-enabled/
```

### 3. Certificats SSL

Générez les certificats SSL avec Let's Encrypt :

```bash
sudo certbot --nginx -d api.yessal.sn
```

## Déploiement

### 1. Build et lancement

```bash
# Build de l'image Docker
docker-compose build

# Lancement en arrière-plan
docker-compose up -d
```

### 2. Migration de la base de données

```bash
# Exécuter les migrations Prisma
docker-compose exec yessal-api npx prisma migrate deploy
```

### 3. Vérification

```bash
# Vérifier que le conteneur fonctionne
docker-compose ps

# Vérifier les logs
docker-compose logs -f yessal-api
```

### 4. Redémarrage de Nginx

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
docker-compose logs -f yessal-api

# Logs Nginx
sudo tail -f /var/log/nginx/api.yessal.sn.access.log
sudo tail -f /var/log/nginx/api.yessal.sn.error.log
```

### Sauvegarde

```bash
# Sauvegarde de la base de données
docker-compose exec yessal-api npx prisma db push --preview-feature
```

## URLs

- **API Production** : https://api.yessal.sn
- **Documentation API** : https://api.yessal.sn/api-docs (si Swagger configuré)

## Ports utilisés

- **4500** : Port interne de l'API
- **443/80** : Ports Nginx (HTTPS/HTTP) 