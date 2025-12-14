# 🚀 Déploiement Environnement de Recette

## 📋 Configuration des domaines

- **Manager App**: `manager.yessal.sn` (port 4510)
- **Associé App**: `associe.yessal.sn` (port 4550)
- **API Manager Backend**: `api.yessal.sn` (port 4520)
- **API Associé Backend**: `api.associe.yessal.sn` (port 4560)
- **File Service**: `fileservice.yessal.sn` (port 4540)

---

## 1️⃣ File Service Configuration

### 📁 `file-service/.env`

```bash
# File Service - Configuration Recette

# Port du service
PORT=4540

# URL de base du service (pour générer les URLs de téléchargement)
BASE_URL=https://dev.fileservice.yessal.sn

# Taille maximale des fichiers (en bytes) - 10MB
MAX_FILE_SIZE=10485760

# Nombre maximum de fichiers par upload multiple
MAX_FILES=10

# Stockage local
UPLOAD_DIR=uploads

# CORS - URLs autorisées
ALLOWED_ORIGINS=https://dev.manager.yessal.sn,https://dev.api.yessal.sn

# API Keys pour les applications autorisées
API_KEY_MANAGER=yessal-manager-recette-2025-secure-key
API_KEY_ASSOCIE=yessal-associe-recette-2025-secure-key

# JWT Secret (pour signer les URLs)
JWT_SECRET=your-jwt-secret-change-in-production-recette-2025
JWT_EXPIRES_IN=1h

# Environment
NODE_ENV=production
```

### 📄 `file-service/nginx/dev.fileservice.yessal.sn.conf`

```nginx
server {
    listen 80;
    server_name dev.fileservice.yessal.sn;

    # Max upload size (10MB)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:4540;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 🔧 `file-service/file-service.service`

```ini
[Unit]
Description=Yessal File Service (Recette)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/proprojects/yessal/file-service
ExecStart=/usr/bin/node src/server.js
Restart=on-failure
RestartSec=10

# Environment
Environment=NODE_ENV=production
Environment=PORT=4540

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=yessal-file-service

[Install]
WantedBy=multi-user.target
```

---

## 2️⃣ API Backend Configuration

### 📁 `api-yessal/.env`

```bash
# API Yessal - Configuration Recette

# Shared Database URL (pour flux financiers)
DATABASE_SHARED_URL="mysql://yessal_user:your_password@localhost:3306/yessal_shared_db"

```


---

## 3️⃣ Manager App Configuration

```bash
# Configuration de l'API - Production
VITE_APP_NAME=Yessal Manager
VITE_APP_VERSION=1.0.0
# Configuration de développement
VITE_DEV_MODE=false
VITE_LOG_LEVEL=warn

# Configuration de l'API
VITE_API_URL=https://dev.api.yessal.sn/api

# Configuration du service de fichiers - Production
VITE_FILE_SERVICE_URL=https://dev.fileservice.yessal.sn
VITE_FILE_SERVICE_API_KEY=yessal-manager-2025

# Environment
VITE_NODE_ENV=production
```


## 5️⃣ Commandes de Déploiement


**Note**: Certbot modifiera automatiquement vos fichiers nginx pour ajouter SSL et la redirection HTTPS.

### 📦 Installation File Service

```bash
cd /root/proprojects/yessal/file-service

# Installer les dépendances
npm install

# Créer le dossier uploads
mkdir -p uploads

# Copier le fichier .env
nano .env

# Copier le fichier si ce n'est pas déjà fait
sudo cp /root/proprojects/yessal/file-service/nginx/fileservice.yessal.sn.conf /etc/nginx/sites-available/

# Créer le symlink avec le nom attendu par nginx
sudo ln -s /etc/nginx/sites-available/fileservice.yessal.sn.conf /etc/nginx/sites-enabled/fileservice.yessal.sn

# Tester la config nginx
sudo nginx -t

# Recharger nginx si test OK
sudo systemctl reload nginx

# Copier et activer le service systemd
sudo cp file-service.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable file-service
sudo systemctl start file-service

# Vérifier le statut
sudo systemctl status file-service
sudo journalctl -u file-service -f
```


### 🔐 Certificats SSL (Let's Encrypt)

```bash
# Installer certbot
sudo apt update

# Générer les certificats (certbot ajoutera automatiquement HTTPS)
sudo certbot --nginx -d dev.fileservice.yessal.sn

```

---

## 4️⃣ Base de Données Partagée (Shared Database)

### 📁 `shared-database/.env`

```bash
# Shared Database Configuration

# Database URL
DATABASE_SHARED_URL="mysql://yessal_user:your_password@localhost:3306/yessal_shared_db"

```

### 📦 Installation API Backend

```bash
# Connexion MySQL
mysql -u root -p

# Créer les bases
CREATE DATABASE IF NOT EXISTS yessal_shared_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Accorder les permissions
GRANT ALL PRIVILEGES ON yessal_shared_db.* TO 'yessal_user'@'localhost' IDENTIFIED BY 'VOTRE_MDP';

FLUSH PRIVILEGES;
EXIT;


# Migrations Shared Database
npx prisma generate
npx prisma db push
npx prisma migrate reset --force
# puis régénérer et appliquer (dev) ou deploy selon besoin
npx prisma generate
# ou pour environnement non-interactif / prod
npx prisma migrate deploy



cd ../api-yessal
cd /root/proprojects/yessal/api-yessal

# Installer les dépendances
npm install
nano .env  # Éditer avec les valeurs ci-dessus

# Migrations Prisma
npx prisma generate
npx prisma db push
npx prisma generate
npm prisma migrate reset --force
npx prisma migrate deploy

cd ../api-yessal
node scripts/update-abonnement-sites.js
```

### 📦 Installation Manager App

```bash
cd /root/proprojects/yessal/manager-app-yessal

# Installer les dépendances
npm install

# Copier le fichier .env
cp .env.example .env.production
nano .env.production  # Éditer avec les valeurs ci-dessus

# Build production
npm run build

# Copier et activer le service systemd
sudo cp manager-yessal.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable manager-yessal
sudo systemctl start manager-yessal

# Vérifier le statut
sudo systemctl status manager-yessal
sudo journalctl -u manager-yessal -f
```

---

## 6️⃣ Vérification et Tests

### ✅ Vérifier les services

```bash
# Status de tous les services
sudo systemctl status file-service
sudo systemctl status api-yessal
sudo systemctl status manager-yessal
```

---

## 8️⃣ Checklist de Déploiement

- [ ] Certificats SSL configurés pour les 3 domaines
- [ ] Base de données `yessal_db` créée
- [ ] Base de données `yessal_shared_db` créée
- [ ] Utilisateur MySQL créé avec permissions
- [ ] File Service : `.env` configuré
- [ ] File Service : dossier `uploads/` créé
- [ ] File Service : nginx configuré
- [ ] File Service : service systemd actif
- [ ] API Backend : `.env` configuré
- [ ] API Backend : migrations Prisma exécutées
- [ ] API Backend : nginx configuré
- [ ] API Backend : service systemd actif
- [ ] Manager App : `.env.production` configuré
- [ ] Manager App : build production généré
- [ ] Manager App : nginx configuré
- [ ] Manager App : service systemd actif
- [ ] CORS configuré correctement (File Service ↔️ Manager App)
- [ ] API Keys synchronisées entre services
- [ ] Tests des endpoints réussis

🎉 **Déploiement terminé !**
