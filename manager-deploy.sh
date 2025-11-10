#!/bin/bash

# Script d'automatisation de déploiement Yessal
# Usage: ./deploy.sh

echo "========== DÉBUT DU DÉPLOIEMENT =========="

# Puller les dernières modifications
echo "➡️  Git pull en cours..."
git pull

# Construire l'application manager
echo "➡️  Construction de manager-app-yessal..."
cd manager-app-yessal || { echo "❌ Dossier manager-app-yessal introuvable"; exit 1; }
npm install
npm run build

# Revenir au dossier api-yessal
cd ../api-yessal || { echo "❌ Dossier api-yessal introuvable"; exit 1; }
npm install
npx prisma generate
npm prisma db push

# Revenir au dossier parent si nécessaire
cd ..

# Redémarrer les services
echo "➡️  Redémarrage du service manager-yessal.service..."
sudo systemctl restart manager-yessal.service
sudo systemctl status manager-yessal.service


echo "➡️  Redémarrage du service api-yessal.service..."
sudo systemctl restart api-yessal.service
sudo systemctl status api-yessal.service

echo "✅ Déploiement terminé avec succès."