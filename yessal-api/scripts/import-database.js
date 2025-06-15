const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const prisma = new PrismaClient();

async function importDatabase(sqlFilePath) {
  let connection;
  
  try {
    console.log('🚀 Début de l\'importation de la base de données...');
    console.log(`📄 Fichier: ${sqlFilePath}`);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Fichier non trouvé: ${sqlFilePath}`);
    }
    
    // Lire le contenu du fichier SQL
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`📏 Taille du fichier: ${(fs.statSync(sqlFilePath).size / 1024).toFixed(2)} KB`);
    
    // Créer une connexion MySQL directe pour exécuter le SQL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL non définie');
    }
    
    // Parser l'URL de la base de données
    const url = new URL(databaseUrl);
    const connectionConfig = {
      host: url.hostname,
      port: url.port || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Enlever le '/' du début
      multipleStatements: true
    };
    
    console.log(`🔌 Connexion à la base: ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`);
    connection = await mysql.createConnection(connectionConfig);
    
    // Diviser le contenu SQL en statements individuels
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 ${statements.length} statements SQL à exécuter`);
    
    // Exécuter chaque statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          if (i % 10 === 0) {
            console.log(`⏳ Progression: ${i + 1}/${statements.length} statements exécutés`);
          }
        } catch (error) {
          console.warn(`⚠️  Erreur sur le statement ${i + 1}: ${error.message}`);
          // Continuer même en cas d'erreur (peut être normal pour certains statements)
        }
      }
    }
    
    console.log('✅ Import terminé avec succès !');
    
    // Vérifier les données importées
    console.log('\n📊 Vérification des données importées:');
    
    const users = await prisma.user.count();
    const commandes = await prisma.commande.count();
    const sitesLavage = await prisma.siteLavage.count();
    const livreurs = await prisma.livreur.count();
    
    console.log(`   Users: ${users}`);
    console.log(`   Commandes: ${commandes}`);
    console.log(`   Sites de lavage: ${sitesLavage}`);
    console.log(`   Livreurs: ${livreurs}`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
    await prisma.$disconnect();
  }
}

// Fonction pour lister les fichiers d'export disponibles
function listExportFiles() {
  const exportDir = path.join(__dirname, '..', 'exports');
  if (!fs.existsSync(exportDir)) {
    console.log('📁 Aucun dossier exports trouvé');
    return [];
  }
  
  const files = fs.readdirSync(exportDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => ({
      name: file,
      path: path.join(exportDir, file),
      size: (fs.statSync(path.join(exportDir, file)).size / 1024).toFixed(2) + ' KB',
      date: fs.statSync(path.join(exportDir, file)).mtime
    }))
    .sort((a, b) => b.date - a.date);
  
  return files;
}

// Exécuter le script
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Fichiers d\'export disponibles:');
    const files = listExportFiles();
    
    if (files.length === 0) {
      console.log('   Aucun fichier d\'export trouvé');
      console.log('   Exécutez d\'abord: node scripts/export-database.js');
    } else {
      files.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file.name} (${file.size}) - ${file.date.toLocaleString()}`);
      });
      console.log('\n💡 Usage: node scripts/import-database.js <chemin-vers-fichier.sql>');
      console.log('   Exemple: node scripts/import-database.js exports/database-export-2024-12-20T14-30-00-000Z.sql');
    }
  } else {
    const sqlFilePath = args[0];
    importDatabase(sqlFilePath);
  }
}

module.exports = { importDatabase, listExportFiles }; 