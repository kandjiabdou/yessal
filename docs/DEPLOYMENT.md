# Guide de Déploiement - File Service

## 📋 Prérequis

- Node.js v18+ installé
- Nginx installé
- Certificat SSL configuré
- Accès SSH au serveur

## 🚀 Étapes de déploiement

### 1. Préparer le serveur

```bash
# Se connecter au serveur
ssh user@your-server.com

# Créer le répertoire
sudo mkdir -p /var/www/yessal/file-service
sudo chown -R www-data:www-data /var/www/yessal/file-service
```

### 2. Transférer les fichiers

```bash
# Depuis votre machine locale
cd file-service
scp -r * user@your-server.com:/tmp/file-service/

# Sur le serveur
sudo mv /tmp/file-service/* /var/www/yessal/file-service/
sudo chown -R www-data:www-data /var/www/yessal/file-service
```

### 3. Installer les dépendances

```bash
cd /var/www/yessal/file-service
sudo -u www-data npm install --production
```

### 4. Configuration

```bash
# Créer le fichier .env en production
sudo nano /var/www/yessal/file-service/.env
```

Contenu:
```env
PORT=4600
JWT_SECRET=VOTRE-SECRET-SUPER-SECURISE-PRODUCTION
URL_EXPIRY=3600
MAX_FILE_SIZE=10485760
UPLOAD_DIR=/var/www/yessal/file-service/uploads
ALLOWED_ORIGINS=https://manager.yessal.sn,https://client.yessal.sn
API_KEY_MANAGER=VOTRE-CLE-MANAGER-PRODUCTION
API_KEY_ASSOCIE=VOTRE-CLE-ASSOCIE-PRODUCTION
BASE_URL=https://files.yessal.sn
NODE_ENV=production
```

```bash
# Sécuriser le fichier
sudo chmod 600 /var/www/yessal/file-service/.env
sudo chown www-data:www-data /var/www/yessal/file-service/.env
```

### 5. Créer les dossiers de stockage

```bash
sudo mkdir -p /var/www/yessal/file-service/uploads/temp
sudo chown -R www-data:www-data /var/www/yessal/file-service/uploads
sudo chmod -R 750 /var/www/yessal/file-service/uploads
```

### 6. Configurer le service systemd

```bash
# Copier le fichier service
sudo cp /var/www/yessal/file-service/file-service.service /etc/systemd/system/

# Recharger systemd
sudo systemctl daemon-reload

# Activer le service au démarrage
sudo systemctl enable file-service

# Démarrer le service
sudo systemctl start file-service

# Vérifier le statut
sudo systemctl status file-service
```

### 7. Configurer Nginx

```bash
# Copier la configuration
sudo cp /var/www/yessal/file-service/nginx/files.yessal.sn.conf /etc/nginx/sites-available/

# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/files.yessal.sn.conf /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 8. Configurer SSL (Let's Encrypt)

```bash
# Installer certbot si nécessaire
sudo apt install certbot python3-certbot-nginx

# Obtenir le certificat
sudo certbot --nginx -d files.yessal.sn

# Le certificat se renouvelle automatiquement
```

### 9. Configurer le firewall

```bash
# Autoriser les ports nécessaires
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Vérifier le statut
sudo ufw status
```

## 🔍 Vérification

### 1. Tester le service

```bash
# Health check
curl https://files.yessal.sn/health

# Devrait retourner:
# {
#   "status": "OK",
#   "service": "Yessal File Service",
#   "version": "1.0.0",
#   "timestamp": "..."
# }
```

### 2. Vérifier les logs

```bash
# Logs du service
sudo journalctl -u file-service -f

# Logs Nginx
sudo tail -f /var/log/nginx/yessal-file-service.access.log
sudo tail -f /var/log/nginx/yessal-file-service.error.log
```

### 3. Tester l'upload

```bash
# Créer un fichier de test
echo "Test" > test.pdf

# Upload
curl -X POST https://files.yessal.sn/api/files/upload \
  -H "x-api-key: VOTRE-CLE-MANAGER-PRODUCTION" \
  -F "file=@test.pdf" \
  -F "uploadedBy=1" \
  -F "context=test"
```

## 🔧 Maintenance

### Redémarrer le service

```bash
sudo systemctl restart file-service
```

### Voir les logs en temps réel

```bash
sudo journalctl -u file-service -f
```

### Nettoyer les fichiers temporaires

```bash
# Supprimer les fichiers temp de plus de 24h
find /var/www/yessal/file-service/uploads/temp -type f -mtime +1 -delete
```

### Backup des fichiers

```bash
# Créer un backup
sudo tar -czf /backup/file-service-uploads-$(date +%Y%m%d).tar.gz \
  /var/www/yessal/file-service/uploads

# Exclure le dossier temp
sudo tar -czf /backup/file-service-uploads-$(date +%Y%m%d).tar.gz \
  --exclude='/var/www/yessal/file-service/uploads/temp' \
  /var/www/yessal/file-service/uploads
```

### Mettre à jour le service

```bash
# Arrêter le service
sudo systemctl stop file-service

# Mettre à jour le code
cd /var/www/yessal/file-service
sudo git pull  # ou transférer les nouveaux fichiers

# Installer les dépendances
sudo -u www-data npm install --production

# Redémarrer le service
sudo systemctl start file-service
```

## 📊 Monitoring

### Créer un script de monitoring

```bash
sudo nano /usr/local/bin/monitor-file-service.sh
```

Contenu:
```bash
#!/bin/bash

# Vérifier si le service est actif
if ! systemctl is-active --quiet file-service; then
    echo "⚠️ File Service est DOWN"
    sudo systemctl start file-service
    echo "📧 Envoi notification..."
    # Ajouter votre système de notification ici
else
    echo "✅ File Service est UP"
fi

# Vérifier l'espace disque
USAGE=$(df -h /var/www/yessal/file-service/uploads | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $USAGE -gt 80 ]; then
    echo "⚠️ Espace disque critique: ${USAGE}%"
    # Ajouter votre système de notification ici
fi
```

```bash
# Rendre exécutable
sudo chmod +x /usr/local/bin/monitor-file-service.sh

# Ajouter au cron (toutes les 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/monitor-file-service.sh >> /var/log/file-service-monitor.log 2>&1") | crontab -
```

## 🔐 Sécurité

### Changer les clés API régulièrement

```bash
# Éditer .env
sudo nano /var/www/yessal/file-service/.env

# Générer de nouvelles clés
openssl rand -base64 32

# Redémarrer le service
sudo systemctl restart file-service
```

### Limiter l'accès par IP (optionnel)

Dans Nginx:
```nginx
location /api/files/upload {
    # Autoriser seulement certaines IPs
    allow 192.168.1.100;  # IP de l'API Manager
    allow 192.168.1.101;  # IP de l'API Associé
    deny all;
    
    proxy_pass http://localhost:4600;
    # ... reste de la config
}
```

## 🆘 Dépannage

### Le service ne démarre pas

```bash
# Vérifier les logs
sudo journalctl -u file-service -n 50

# Vérifier les permissions
ls -la /var/www/yessal/file-service

# Vérifier le port
sudo netstat -tuln | grep 4600
```

### Erreurs d'upload

```bash
# Vérifier les permissions du dossier uploads
ls -la /var/www/yessal/file-service/uploads

# Si nécessaire, corriger
sudo chown -R www-data:www-data /var/www/yessal/file-service/uploads
sudo chmod -R 750 /var/www/yessal/file-service/uploads
```

### Problème de CORS

```bash
# Vérifier les origines autorisées dans .env
grep ALLOWED_ORIGINS /var/www/yessal/file-service/.env

# Redémarrer après modification
sudo systemctl restart file-service
```

## 📞 Support

Pour toute question ou problème, contactez l'équipe technique Yessal.
