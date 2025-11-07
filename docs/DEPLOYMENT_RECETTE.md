# 🚀 Déploiement Environnement de Recette

## 📋 Configuration des domaines

- **Manager App**: `dev.manager.yessal.sn` (port 4510)
- **API Backend**: `dev.api.yessal.sn` (port 4520)
- **File Service**: `dev.fileservice.yessal.sn` (port 4540)

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

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dev.fileservice.yessal.sn;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/dev.fileservice.yessal.sn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.fileservice.yessal.sn/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # CORS headers (important pour le file service)
    add_header Access-Control-Allow-Origin "https://dev.manager.yessal.sn" always;
    add_header Access-Control-Allow-Methods "GET, POST, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, x-api-key" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "https://dev.manager.yessal.sn" always;
        add_header Access-Control-Allow-Methods "GET, POST, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, x-api-key" always;
        add_header Access-Control-Max-Age 1728000;
        add_header Content-Type "text/plain charset=UTF-8";
        add_header Content-Length 0;
        return 204;
    }

    # Max upload size (10MB)
    client_max_body_size 10M;

    # Logs
    access_log /var/log/nginx/yessal-file-service-recette.access.log;
    error_log /var/log/nginx/yessal-file-service-recette.error.log;

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:4540;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache images (optimisation)
    location ~* \.(jpg|jpeg|png|gif|webp)$ {
        proxy_pass http://localhost:4540;
        expires 7d;
        add_header Cache-Control "public, immutable";
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
WorkingDirectory=/root/projectpro/yessal/file-service
ExecStart=/usr/bin/node server.js
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

# Port
PORT=4520

# Database URL (MySQL)
DATABASE_URL="mysql://yessal_user:your_password@localhost:3306/yessal_db"

# Shared Database URL (pour flux financiers)
DATABASE_SHARED_URL="mysql://yessal_user:your_password@localhost:3306/yessal_shared_db"

# JWT
JWT_SECRET=your-jwt-secret-change-in-production-recette-2025
JWT_EXPIRES_IN=7d

# File Service
FILE_SERVICE_URL=https://dev.fileservice.yessal.sn
FILE_SERVICE_API_KEY=yessal-manager-recette-2025-secure-key

# CORS
ALLOWED_ORIGINS=https://dev.manager.yessal.sn

# Environment
NODE_ENV=production

# Logs
LOG_LEVEL=info
```

### 📄 `api-yessal/nginx/dev.api.yessal.sn.conf`

```nginx
server {
    listen 80;
    server_name dev.api.yessal.sn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dev.api.yessal.sn;

    # SSL
    ssl_certificate /etc/letsencrypt/live/dev.api.yessal.sn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.api.yessal.sn/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/yessal-api-recette.access.log;
    error_log /var/log/nginx/yessal-api-recette.error.log;

    # Proxy
    location / {
        proxy_pass http://localhost:4520;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 🔧 `api-yessal/api-yessal.service`

```ini
[Unit]
Description=Yessal API Backend (Recette)
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/projectpro/yessal/api-yessal
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

# Environment
Environment=NODE_ENV=production
Environment=PORT=4520

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=yessal-api

[Install]
WantedBy=multi-user.target
```

---

## 3️⃣ Manager App Configuration

### 📁 `manager-app-yessal/.env.production`

```bash
# Manager App - Configuration Recette

# API Backend URL
VITE_API_URL=https://dev.api.yessal.sn/api

# File Service URL
VITE_FILE_SERVICE_URL=https://dev.fileservice.yessal.sn

# File Service API Key
VITE_FILE_SERVICE_API_KEY=yessal-manager-recette-2025-secure-key

# Environment
VITE_NODE_ENV=production
```

### 📄 `manager-app-yessal/nginx/dev.manager.yessal.sn.conf`

```nginx
server {
    listen 80;
    server_name dev.manager.yessal.sn;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dev.manager.yessal.sn;

    # SSL
    ssl_certificate /etc/letsencrypt/live/dev.manager.yessal.sn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.manager.yessal.sn/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/yessal-manager-recette.access.log;
    error_log /var/log/nginx/yessal-manager-recette.error.log;

    # Serve static files
    location / {
        proxy_pass http://localhost:4510;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 🔧 `manager-app-yessal/manager-yessal.service`

```ini
[Unit]
Description=Yessal Manager App (Recette)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/projectpro/yessal/manager-app-yessal
ExecStart=/usr/bin/npm run serve
Restart=on-failure
RestartSec=10

# Environment
Environment=NODE_ENV=production
Environment=PORT=4510

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=yessal-manager

[Install]
WantedBy=multi-user.target
```

---

## 4️⃣ Base de Données Partagée (Shared Database)

### 📁 `shared-database/.env`

```bash
# Shared Database Configuration

# Database URL
DATABASE_SHARED_URL="mysql://yessal_user:your_password@localhost:3306/yessal_shared_db"

# Prisma
DATABASE_URL="mysql://yessal_user:your_password@localhost:3306/yessal_shared_db"
```

### 🗄️ Création des bases de données

```bash
# Connexion MySQL
mysql -u root -p

# Créer les bases
CREATE DATABASE IF NOT EXISTS yessal_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS yessal_shared_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Créer l'utilisateur
CREATE USER IF NOT EXISTS 'yessal_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';

# Accorder les permissions
GRANT ALL PRIVILEGES ON yessal_db.* TO 'yessal_user'@'localhost';
GRANT ALL PRIVILEGES ON yessal_shared_db.* TO 'yessal_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

---

## 5️⃣ Commandes de Déploiement

### 🔐 Certificats SSL (Let's Encrypt)

```bash
# Installer certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Générer les certificats
sudo certbot --nginx -d dev.fileservice.yessal.sn
sudo certbot --nginx -d dev.api.yessal.sn
sudo certbot --nginx -d dev.manager.yessal.sn

# Renouvellement automatique (vérifier)
sudo certbot renew --dry-run
```

### 📦 Installation File Service

```bash
cd /root/projectpro/yessal/file-service

# Installer les dépendances
npm install --production

# Créer le dossier uploads
mkdir -p uploads

# Copier le fichier .env
cp .env.example .env
nano .env  # Éditer avec les valeurs ci-dessus

# Copier la config nginx
sudo cp nginx/dev.fileservice.yessal.sn.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/dev.fileservice.yessal.sn.conf /etc/nginx/sites-enabled/

# Tester nginx
sudo nginx -t
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

### 📦 Installation API Backend

```bash
cd /root/projectpro/yessal/api-yessal

# Installer les dépendances
npm install --production

# Copier le fichier .env
cp .env.production.example .env
nano .env  # Éditer avec les valeurs ci-dessus

# Migrations Prisma
npx prisma generate
npx prisma migrate deploy

# Migrations Shared Database
cd ../shared-database
npx prisma generate
npx prisma migrate deploy
cd ../api-yessal

# Copier la config nginx
sudo cp nginx/dev.api.yessal.sn.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/dev.api.yessal.sn.conf /etc/nginx/sites-enabled/

# Tester nginx
sudo nginx -t
sudo systemctl reload nginx

# Copier et activer le service systemd
sudo cp api-yessal.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable api-yessal
sudo systemctl start api-yessal

# Vérifier le statut
sudo systemctl status api-yessal
sudo journalctl -u api-yessal -f
```

### 📦 Installation Manager App

```bash
cd /root/projectpro/yessal/manager-app-yessal

# Installer les dépendances
npm install

# Copier le fichier .env
cp .env.example .env.production
nano .env.production  # Éditer avec les valeurs ci-dessus

# Build production
npm run build

# Copier la config nginx
sudo cp nginx/dev.manager.yessal.sn.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/dev.manager.yessal.sn.conf /etc/nginx/sites-enabled/

# Tester nginx
sudo nginx -t
sudo systemctl reload nginx

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
sudo systemctl status nginx
sudo systemctl status mysql

# Vérifier les ports
sudo netstat -tulpn | grep -E '4510|4520|4540'

# Logs en temps réel
sudo journalctl -u file-service -f
sudo journalctl -u api-yessal -f
sudo journalctl -u manager-yessal -f
```

### 🧪 Tests des endpoints

```bash
# Test File Service
curl https://dev.fileservice.yessal.sn/health

# Test API Backend
curl https://dev.api.yessal.sn/health

# Test Manager App
curl https://dev.manager.yessal.sn
```

---

## 7️⃣ Commandes Utiles

### 🔄 Redémarrer les services

```bash
# Redémarrer tout
sudo systemctl restart file-service
sudo systemctl restart api-yessal
sudo systemctl restart manager-yessal
sudo systemctl reload nginx

# Ou tous en une commande
sudo systemctl restart file-service api-yessal manager-yessal && sudo systemctl reload nginx
```

### 📋 Voir les logs

```bash
# Logs des 100 dernières lignes
sudo journalctl -u file-service -n 100
sudo journalctl -u api-yessal -n 100
sudo journalctl -u manager-yessal -n 100

# Logs nginx
sudo tail -f /var/log/nginx/yessal-file-service-recette.error.log
sudo tail -f /var/log/nginx/yessal-api-recette.error.log
sudo tail -f /var/log/nginx/yessal-manager-recette.error.log
```

### 🔄 Mise à jour du code

```bash
# Pull dernières modifications
cd /root/projectpro/yessal
git pull origin feature/finance

# File Service
cd file-service
npm install --production
sudo systemctl restart file-service

# API Backend
cd ../api-yessal
npm install --production
npx prisma generate
npx prisma migrate deploy
sudo systemctl restart api-yessal

# Manager App
cd ../manager-app-yessal
npm install
npm run build
sudo systemctl restart manager-yessal
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

---

## 🆘 Dépannage

### Erreur CORS

```bash
# Vérifier la config nginx du file-service
sudo nano /etc/nginx/sites-available/dev.fileservice.yessal.sn.conf

# Vérifier le .env du file-service
cd /root/projectpro/yessal/file-service
cat .env | grep ALLOWED_ORIGINS
```

### Service ne démarre pas

```bash
# Voir les erreurs détaillées
sudo journalctl -u <service-name> -xe

# Vérifier les permissions
ls -la /root/projectpro/yessal/

# Vérifier les dépendances
cd <service-folder>
npm install
```

### Base de données inaccessible

```bash
# Tester la connexion
mysql -u yessal_user -p yessal_db

# Vérifier les migrations
cd /root/projectpro/yessal/api-yessal
npx prisma migrate status
```

---

## 📞 URLs Finales

- **Manager App**: https://dev.manager.yessal.sn
- **API Backend**: https://dev.api.yessal.sn
- **File Service**: https://dev.fileservice.yessal.sn

🎉 **Déploiement terminé !**
