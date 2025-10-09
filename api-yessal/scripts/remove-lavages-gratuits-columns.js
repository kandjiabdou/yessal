/**
 * Script pour supprimer les colonnes lavagesGratuits6kgRestants et lavagesGratuits20kgRestants
 * de la table fidelite (anciennes colonnes non utilisées)
 * 
 * Usage:
 *   node scripts/remove-lavages-gratuits-columns.js --yes
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const args = process.argv.slice(2);
  const autoConfirm = args.includes('--yes');

  if (!autoConfirm) {
    console.log('⚠️  Ce script va supprimer les colonnes lavagesGratuits6kgRestants et lavagesGratuits20kgRestants de la table fidelite.');
    console.log('   Pour confirmer, relancez avec --yes');
    process.exit(0);
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL non définie dans .env');
    process.exit(1);
  }

  const dbUrl = new URL(process.env.DATABASE_URL);
  console.log('Connecting to database:', dbUrl.hostname);

  const connection = await mysql.createConnection({
    host: dbUrl.hostname,
    port: dbUrl.port,
    user: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.slice(1),
    multipleStatements: true
  });

  console.log('Connected to database.');

  try {
    // Vérifier si les colonnes existent
    const database = dbUrl.pathname.slice(1);
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'fidelite' 
        AND COLUMN_NAME IN ('lavagesGratuits6kgRestants', 'lavagesGratuits20kgRestants')
    `, [database]);

    const columnsToRemove = columns.map(row => row.COLUMN_NAME);

    if (columnsToRemove.length === 0) {
      console.log('✅ Les colonnes ont déjà été supprimées.');
      await connection.end();
      return;
    }

    console.log(`\n🗑️  Colonnes à supprimer: ${columnsToRemove.join(', ')}`);

    // Supprimer les colonnes
    for (const columnName of columnsToRemove) {
      console.log(`   Suppression de fidelite.${columnName}...`);
      await connection.execute(`
        ALTER TABLE fidelite DROP COLUMN ${columnName}
      `);
      console.log(`   ✅ fidelite.${columnName} supprimée`);
    }

    console.log('\n✅ Migration terminée avec succès !');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. npx prisma generate');
    console.log('   2. Redémarrer le serveur API');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('Database connection closed.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
