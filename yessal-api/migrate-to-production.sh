#!/bin/bash

# Script de migration complète vers la production
# Usage: ./migrate-to-production.sh

set -e

echo "🚀 Migration Yessal vers la production"
echo "======================================"

# 1. Exporter les données actuelles
echo "📦 1. Export des données locales..."
node scripts/export-database.js

# 2. Résoudre le drift Prisma
echo "🔧 2. Résolution du drift Prisma..."
npx prisma db push

# 3. Créer une migration baseline
echo "📋 3. Création de la migration baseline..."
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > migration_baseline.sql

# 4. Préparer les fichiers pour la production
echo "📁 4. Préparation des fichiers..."

# Trouver le fichier d'export le plus récent
LATEST_EXPORT=$(ls -t exports/database-export-*.sql 2>/dev/null | head -n1)

if [ -z "$LATEST_EXPORT" ]; then
    echo "❌ Aucun fichier d'export trouvé!"
    exit 1
fi

echo "📄 Fichier d'export: $LATEST_EXPORT"

# 5. Créer un package de migration
MIGRATION_DIR="migration-package-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$MIGRATION_DIR"

# Copier les fichiers nécessaires
cp "$LATEST_EXPORT" "$MIGRATION_DIR/data.sql"
cp migration_baseline.sql "$MIGRATION_DIR/"
cp scripts/import-database.js "$MIGRATION_DIR/"
cp prisma/schema.prisma "$MIGRATION_DIR/"

# Créer un script d'installation pour le serveur
cat > "$MIGRATION_DIR/install-on-server.sh" << 'EOF'
#!/bin/bash

# Script d'installation sur le serveur de production
echo "🚀 Installation sur le serveur de production..."

# 1. Créer la base de données avec le schéma
echo "📋 1. Application du schéma..."
npx prisma db push

# 2. Importer les données
echo "💾 2. Import des données..."
node import-database.js data.sql

# 3. Générer le client Prisma
echo "🔧 3. Génération du client Prisma..."
npx prisma generate

echo "✅ Migration terminée avec succès!"
EOF

chmod +x "$MIGRATION_DIR/install-on-server.sh"

# Créer un README
cat > "$MIGRATION_DIR/README.md" << EOF
# Package de migration Yessal

## Contenu
- \`data.sql\` : Données exportées de la base locale
- \`migration_baseline.sql\` : Migration baseline du schéma
- \`schema.prisma\` : Schéma Prisma
- \`import-database.js\` : Script d'import des données
- \`install-on-server.sh\` : Script d'installation automatique

## Installation sur le serveur

1. Copiez ce dossier sur votre serveur
2. Configurez la variable DATABASE_URL dans .env
3. Exécutez: \`./install-on-server.sh\`

## Installation manuelle

\`\`\`bash
# 1. Appliquer le schéma
npx prisma db push

# 2. Importer les données
node import-database.js data.sql

# 3. Générer le client
npx prisma generate
\`\`\`

Date de création: $(date)
EOF

echo "✅ Package de migration créé: $MIGRATION_DIR"
echo ""
echo "📦 Contenu du package:"
ls -la "$MIGRATION_DIR"
echo ""
echo "🚀 Pour déployer sur le serveur:"
echo "   1. Copiez le dossier '$MIGRATION_DIR' sur votre serveur"
echo "   2. Configurez DATABASE_URL dans .env"
echo "   3. Exécutez: cd $MIGRATION_DIR && ./install-on-server.sh"
echo ""
echo "🎉 Migration prête pour le déploiement!" 