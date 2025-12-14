const mysql = require('mysql2/promise');

/**
 * Script pour mettre à jour la colonne filename de VARCHAR à TEXT
 * dans la table FluxFinancierPreuve sans perdre de données
 */

async function updateFilenameColumn() {
  let connection;
  
  try {
    // Se connecter directement à MySQL
    const dbUrl = process.env.DATABASE_SHARED_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_SHARED_URL non définie dans .env');
    }

    // Parser l'URL de connexion
    const urlMatch = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!urlMatch) {
      throw new Error('Format URL de base de données invalide');
    }

    const [, user, password, host, port, database] = urlMatch;

    console.log('🔌 Connexion à la base de données...');
    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password,
      database
    });

    console.log('✅ Connecté à la base de données');

    // Vérifier si la table existe
    console.log('\n📋 Vérification de la table FluxFinancierPreuve...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'FluxFinancierPreuve'"
    );

    if (tables.length === 0) {
      console.log('⚠️  La table FluxFinancierPreuve n\'existe pas encore');
      return;
    }

    // Vérifier la structure actuelle de la colonne
    console.log('🔍 Vérification de la colonne filename...');
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM FluxFinancierPreuve WHERE Field = 'filename'"
    );

    if (columns.length === 0) {
      console.log('⚠️  La colonne filename n\'existe pas');
      return;
    }

    const currentType = columns[0].Type;
    console.log(`   Type actuel: ${currentType}`);

    if (currentType.toLowerCase().includes('text')) {
      console.log('✅ La colonne filename est déjà de type TEXT');
      return;
    }

    // Compter le nombre d'enregistrements
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM FluxFinancierPreuve'
    );
    const count = countResult[0].count;
    console.log(`📊 ${count} preuve(s) trouvée(s)`);

    // Vérifier s'il y a des noms de fichiers longs
    if (count > 0) {
      const [longNames] = await connection.execute(
        'SELECT COUNT(*) as count FROM FluxFinancierPreuve WHERE LENGTH(filename) > 191'
      );
      const longCount = longNames[0].count;
      if (longCount > 0) {
        console.log(`⚠️  ${longCount} fichier(s) avec des noms de plus de 191 caractères détecté(s)`);
      }
    }

    // Modifier la colonne
    console.log('\n🔧 Modification de la colonne filename en TEXT...');
    await connection.execute(
      'ALTER TABLE FluxFinancierPreuve MODIFY COLUMN filename TEXT NOT NULL'
    );

    console.log('✅ Colonne filename mise à jour avec succès !');

    // Vérifier la nouvelle structure
    const [newColumns] = await connection.execute(
      "SHOW COLUMNS FROM FluxFinancierPreuve WHERE Field = 'filename'"
    );
    console.log(`   Nouveau type: ${newColumns[0].Type}`);

    console.log('\n✨ Migration terminée avec succès !');
    console.log('   Toutes les données ont été préservées.');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

// Charger les variables d'environnement depuis prisma/.env
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', 'prisma', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  });
}

// Exécuter le script
updateFilenameColumn()
  .then(() => {
    console.log('\n🎉 Script terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Échec du script:', error);
    process.exit(1);
  });
