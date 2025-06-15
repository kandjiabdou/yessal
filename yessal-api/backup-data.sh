#!/bin/bash

# Script de sauvegarde rapide des données Yessal
# Usage: ./backup-data.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
BACKUP_FILE="yessal_backup_${DATE}.sql"

# Créer le dossier s'il n'existe pas
mkdir -p $BACKUP_DIR

echo "💾 Sauvegarde de la base de données..."
echo "📁 Fichier: $BACKUP_DIR/$BACKUP_FILE"

# Sauvegarder la base MySQL
mysqldump -u root -p yessal > "$BACKUP_DIR/$BACKUP_FILE"

echo "✅ Sauvegarde terminée!"
echo "📦 Fichier créé: $BACKUP_DIR/$BACKUP_FILE"

# Résoudre le problème de drift
echo "🔧 Résolution du drift Prisma..."
npx prisma db push

echo "🎉 Tout est prêt pour le déploiement!" 