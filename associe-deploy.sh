#!/bin/bash

# Script d'automatisation de déploiement Yessal
# Usage: ./deploy.sh

echo "========== DÉBUT DU DÉPLOIEMENT =========="

# Puller les dernières modifications
echo "➡️  Git pull en cours..."
git pull

# Construire l'application associée
echo "➡️  Construction de associe-app-yessal..."
cd associe-app-yessal || { echo "❌ Dossier associe-app-yessal introuvable"; exit 1; }
npm install
npm run build

# Revenir au dossier api-yessal
cd ../associe-api-yessal || { echo "❌ Dossier api-yessal introuvable"; exit 1; }
npm install
npx prisma generate
npm prisma db push

# Revenir au dossier parent si nécessaire
cd ..

# Redémarrer les services
echo "➡️  Redémarrage du service associe.service..."
sudo systemctl restart associe.service
sudo systemctl status associe.service

echo "➡️  Redémarrage du service associe-api-yessal.service..."
sudo systemctl restart associe-api-yessal.service
sudo systemctl status associe-api-yessal.service

echo "✅ Déploiement terminé avec succès."