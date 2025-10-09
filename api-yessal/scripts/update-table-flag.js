const mysql = require('mysql2/promise');

const dbUrl = new URL(process.env.DATABASE_URL);
const connectionConfig = {
  host: dbUrl.hostname,
  port: dbUrl.port,
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace("/", ""),
  multipleStatements: true, // important pour exécuter plusieurs requêtes
};

async function addFlagColumnToAllTables() {
  const connection = await mysql.createConnection(connectionConfig);

  try {
    // Récupérer toutes les tables
    const [tables] = await connection.execute("SHOW TABLES");
    
    console.log(`🔍 ${tables.length} tables trouvées dans la base de données yessal\n`);
    
    // Pour chaque table, ajouter la colonne flag
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const tableName = Object.values(table)[0];
      
      try {
        // Vérifier si la colonne flag existe déjà
        const [columns] = await connection.execute(
          `SHOW COLUMNS FROM ${tableName} LIKE 'flag'`
        );

        if (columns.length === 0) {
          // La colonne n'existe pas, on l'ajoute
          console.log(`⏳ Ajout de la colonne 'flag' à la table: ${tableName}`);
          
          await connection.execute(
            `ALTER TABLE ${tableName} ADD COLUMN flag BOOLEAN DEFAULT TRUE`
          );
          
          console.log(`✅ Colonne 'flag' ajoutée avec succès à la table: ${tableName}`);
        } else {
          console.log(`⚠️  La colonne 'flag' existe déjà dans la table: ${tableName}`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors de la modification de la table ${tableName}:`, error.message);
      }
      
      // Petite pause entre les tables pour éviter de surcharger la DB
      if (i < tables.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n🎉 Processus terminé !');
    
    // Vérification finale
    console.log('\n📊 Vérification finale...');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const [columns] = await connection.execute(
        `SHOW COLUMNS FROM ${tableName} LIKE 'flag'`
      );
      
      if (columns.length > 0) {
        const [count] = await connection.execute(
          `SELECT COUNT(*) as total FROM ${tableName} WHERE flag = TRUE`
        );
        console.log(`✓ ${tableName}: colonne 'flag' présente, ${count[0].total} enregistrements avec flag=TRUE`);
      } else {
        console.log(`✗ ${tableName}: colonne 'flag' MANQUANTE !`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  } finally {
    await connection.end();
    console.log('\n🔌 Connexion fermée.');
  }
}

// Fonction de confirmation avant exécution
async function confirmExecution() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    readline.question('⚠️  ATTENTION: Cette opération va modifier votre base de données en production.\nÊtes-vous sûr de vouloir continuer ? (oui/non): ', (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'oui' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// Exécution principale avec confirmation
async function main() {
  console.log('🚀 Script d\'ajout de la colonne flag à toutes les tables');
  console.log('📅 Base de données: yessal');
  console.log('🔧 Action: ALTER TABLE ADD COLUMN flag BOOLEAN DEFAULT TRUE\n');
  
  const confirmed = await confirmExecution();
  
  if (confirmed) {
    console.log('✅ Confirmation reçue. Démarrage du processus...\n');
    await addFlagColumnToAllTables();
  } else {
    console.log('❌ Opération annulée par l\'utilisateur.');
  }
}

main().catch(console.error);