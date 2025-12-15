const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Charger la DATABASE_URL depuis .env
dotenv.config();

async function cleanShopData() {
  // Extraire les infos de DATABASE_URL
  const dbUrl = new URL(process.env.DATABASE_URL);
  const connectionConfig = {
    host: dbUrl.hostname,
    port: dbUrl.port,
    user: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace('/', ''),
    multipleStatements: true
  };

  let connection;

  try {
    console.log('🔌 Connexion à la base de données...');
    connection = await mysql.createConnection(connectionConfig);

    console.log('\n⚠️  ATTENTION: Ce script va supprimer TOUTES les données de la boutique!');
    console.log('   - Lignes de vente');
    console.log('   - Ventes');
    console.log('   - Mouvements de stock');
    console.log('   - Stocks');
    console.log('   - Produits');
    console.log('   - Catégories de produits\n');

    // Désactiver temporairement les vérifications de clés étrangères
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // 1. Supprimer les lignes de vente
    console.log('🗑️  Suppression des lignes de vente...');
    const [lignesResult] = await connection.execute(
      'DELETE FROM lignevente WHERE flag = true'
    );
    console.log(`   ✓ ${lignesResult.affectedRows} ligne(s) de vente supprimée(s)`);

    // 2. Supprimer les ventes
    console.log('\n🗑️  Suppression des ventes...');
    const [ventesResult] = await connection.execute(
      'DELETE FROM vente WHERE flag = true'
    );
    console.log(`   ✓ ${ventesResult.affectedRows} vente(s) supprimée(s)`);

    // 3. Supprimer les mouvements de stock
    console.log('\n🗑️  Suppression des mouvements de stock...');
    const [mouvementsResult] = await connection.execute(
      'DELETE FROM mouvementstock WHERE flag = true'
    );
    console.log(`   ✓ ${mouvementsResult.affectedRows} mouvement(s) de stock supprimé(s)`);

    // 4. Supprimer les stocks
    console.log('\n🗑️  Suppression des stocks...');
    const [stocksResult] = await connection.execute(
      'DELETE FROM stockproduit WHERE flag = true'
    );
    console.log(`   ✓ ${stocksResult.affectedRows} stock(s) supprimé(s)`);

    // 5. Supprimer les produits
    console.log('\n🗑️  Suppression des produits...');
    const [produitsResult] = await connection.execute(
      'DELETE FROM produit WHERE flag = true'
    );
    console.log(`   ✓ ${produitsResult.affectedRows} produit(s) supprimé(s)`);

    // 6. Supprimer les catégories
    console.log('\n🗑️  Suppression des catégories de produits...');
    const [categoriesResult] = await connection.execute(
      'DELETE FROM categorieproduit WHERE flag = true'
    );
    console.log(`   ✓ ${categoriesResult.affectedRows} catégorie(s) supprimée(s)`);

    // Réactiver les vérifications de clés étrangères
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✅ Toutes les données de la boutique ont été supprimées avec succès !');
    console.log(`\n📊 Résumé:`);
    console.log(`   - ${lignesResult.affectedRows} lignes de vente`);
    console.log(`   - ${ventesResult.affectedRows} ventes`);
    console.log(`   - ${mouvementsResult.affectedRows} mouvements de stock`);
    console.log(`   - ${stocksResult.affectedRows} stocks`);
    console.log(`   - ${produitsResult.affectedRows} produits`);
    console.log(`   - ${categoriesResult.affectedRows} catégories`);
    console.log(`\n💡 Vous pouvez maintenant relancer le script seed-shop-products.js si nécessaire.`);

    await connection.end();
  } catch (error) {
    console.error('\n❌ Erreur lors de la suppression des données:', error.message);
    console.error(error);
    if (connection) {
      // Réactiver les vérifications en cas d'erreur
      try {
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      } catch (e) {
        // Ignorer les erreurs lors de la réactivation
      }
      await connection.end();
    }
    process.exit(1);
  }
}

// Exécuter le script
cleanShopData().catch((error) => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
