#!/bin/bash

echo "🚀 Migration Yessal - Version Simplifiée"
echo "========================================"

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./migration-backup-$TIMESTAMP"
SQL_FILE="./scripts/yessal.sql"

# Vérifier que le fichier SQL existe
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ Erreur: Fichier yessal.sql non trouvé dans scripts/"
    exit 1
fi

echo "📁 Création du dossier de migration: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

echo "📋 Copie des fichiers nécessaires..."
cp "$SQL_FILE" "$BACKUP_DIR/"
cp "package.json" "$BACKUP_DIR/"
cp "package-lock.json" "$BACKUP_DIR/"
cp -r "prisma/" "$BACKUP_DIR/"
cp -r "src/" "$BACKUP_DIR/"
cp "server.js" "$BACKUP_DIR/"
cp ".env" "$BACKUP_DIR/.env.example" 2>/dev/null || echo "⚠️  Fichier .env non trouvé"

# Copier les fichiers Docker si ils existent
if [ -f "Dockerfile" ]; then
    cp "Dockerfile" "$BACKUP_DIR/"
fi
if [ -f "docker-compose.yml" ]; then
    cp "docker-compose.yml" "$BACKUP_DIR/"
fi
if [ -f "env.production.example" ]; then
    cp "env.production.example" "$BACKUP_DIR/"
fi

# Créer le script d'installation
cat > "$BACKUP_DIR/install-on-server.sh" << 'EOF'
#!/bin/bash

echo "🔧 Installation Yessal API sur le serveur"
echo "========================================="

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Configurer l'environnement
if [ ! -f ".env" ]; then
    echo "⚙️  Configuration de l'environnement..."
    if [ -f ".env.example" ]; then
        cp ".env.example" ".env"
        echo "✅ Fichier .env créé depuis .env.example"
        echo "⚠️  IMPORTANT: Modifiez le fichier .env avec vos paramètres"
    else
        echo "❌ Aucun fichier .env.example trouvé"
    fi
fi

# Restaurer la base de données
echo "🗄️  Restauration de la base de données..."
echo "⚠️  Assurez-vous que MySQL est démarré et que la base 'yessal' existe"
echo "📝 Commande à exécuter manuellement :"
echo "mysql -u root -p yessal < yessal.sql"

# Générer le client Prisma
echo "🔄 Génération du client Prisma..."
npx prisma generate

echo "✅ Installation terminée !"
echo "🚀 Pour démarrer l'API : npm start"
EOF

chmod +x "$BACKUP_DIR/install-on-server.sh"

# Créer un README pour le déploiement
cat > "$BACKUP_DIR/README-DEPLOYMENT.md" << 'EOF'
# Déploiement Yessal API

## Étapes d'installation sur le serveur

1. **Transférer les fichiers**
   ```bash
   scp -r migration-backup-* user@server:/path/to/yessal-api/
   ```

2. **Se connecter au serveur et aller dans le dossier**
   ```bash
   ssh user@server
   cd /path/to/yessal-api/migration-backup-*/
   ```

3. **Exécuter l'installation**
   ```bash
   chmod +x install-on-server.sh
   ./install-on-server.sh
   ```

4. **Restaurer la base de données**
   ```bash
   mysql -u root -p yessal < yessal.sql
   ```

5. **Configurer l'environnement**
   - Modifier le fichier `.env` avec vos paramètres
   - Vérifier la connexion à la base de données

6. **Démarrer l'API**
   ```bash
   npm start
   ```

## Avec Docker (optionnel)

Si vous utilisez Docker :
```bash
docker-compose up -d
```
EOF

echo "✅ Package de migration créé : $BACKUP_DIR"
echo ""
echo "📋 Contenu du package :"
ls -la "$BACKUP_DIR"
echo ""
echo "🚀 Pour déployer :"
echo "1. Transférez le dossier $BACKUP_DIR sur votre serveur"
echo "2. Exécutez ./install-on-server.sh"
echo "3. Restaurez la base avec : mysql -u root -p yessal < yessal.sql"
echo ""
echo "✨ Migration terminée !" 