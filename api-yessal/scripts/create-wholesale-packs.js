const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Charger la DATABASE_URL depuis .env
dotenv.config();

// Exemples de packs de vente en gros à créer
const wholesalePacks = [
  {
    produitNom: "Détergent poudre 1kg",
    packs: [
      { nom: "Pack de 6", quantiteUnites: 6, prixPack: 6500 },
      { nom: "Pack de 12", quantiteUnites: 12, prixPack: 12000 }
    ]
  },
  {
    produitNom: "Détergent liquide bleu",
    packs: [
      { nom: "Pack de 12", quantiteUnites: 12, prixPack: 7000 }
    ]
  }
];

async function createWholesalePacks() {
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

    console.log('\n📦 Création des packs de vente en gros...\n');

    let totalPacksCreated = 0;

    for (const productPacks of wholesalePacks) {
      // Rechercher le produit par son nom
      const [products] = await connection.execute(
        'SELECT id, nom, prixReference FROM produit WHERE nom = ? AND flag = true',
        [productPacks.produitNom]
      );

      if (products.length === 0) {
        console.log(`  ⚠️  Produit "${productPacks.produitNom}" non trouvé. Ignoré.`);
        continue;
      }

      const product = products[0];
      console.log(`📦 Produit: ${product.nom} (ID: ${product.id}, Prix ref: ${product.prixReference} F)`);

      for (const pack of productPacks.packs) {
        // Vérifier si le pack existe déjà
        const [existing] = await connection.execute(
          'SELECT id FROM packventegros WHERE produitId = ? AND nom = ?',
          [product.id, pack.nom]
        );

        if (existing.length > 0) {
          console.log(`  ⚠️  ${pack.nom} existe déjà (ID: ${existing[0].id})`);
          continue;
        }

        // Créer le pack
        const [result] = await connection.execute(
          `INSERT INTO packventegros (produitId, nom, quantiteUnites, prixPack, actif, createdAt, updatedAt, flag)
           VALUES (?, ?, ?, ?, true, NOW(), NOW(), true)`,
          [product.id, pack.nom, pack.quantiteUnites, pack.prixPack]
        );

        const prixUnitaire = Math.round(pack.prixPack / pack.quantiteUnites);
        const economie = product.prixReference - prixUnitaire;
        const pourcentageEconomie = Math.round((economie / product.prixReference) * 100);

        console.log(`  ✅ ${pack.nom}: ${pack.quantiteUnites} unités = ${pack.prixPack} F`);
        console.log(`     → Prix unitaire: ${prixUnitaire} F (économie: ${economie} F soit ${pourcentageEconomie}%)`);
        
        totalPacksCreated++;
      }
      console.log('');
    }

    // Afficher un résumé de tous les packs créés
    console.log('\n📊 Résumé des packs créés par produit:\n');
    const [allPacks] = await connection.execute(
      `SELECT p.nom as produit_nom, pv.nom as pack_nom, pv.quantiteUnites, pv.prixPack, pv.actif
       FROM packventegros pv
       JOIN produit p ON pv.produitId = p.id
       WHERE pv.flag = true
       ORDER BY p.nom, pv.quantiteUnites`
    );

    let currentProduct = null;
    for (const pack of allPacks) {
      if (currentProduct !== pack.produit_nom) {
        currentProduct = pack.produit_nom;
        console.log(`\n📦 ${currentProduct}:`);
      }
      const status = pack.actif ? '✅' : '❌';
      console.log(`  ${status} ${pack.pack_nom}: ${pack.quantiteUnites} unités → ${pack.prixPack} F`);
    }

    console.log('\n✅ Création terminée avec succès !');
    console.log(`\n📊 Total:`);
    console.log(`   - ${totalPacksCreated} nouveaux packs créés`);
    console.log(`   - ${allPacks.length} packs au total dans la base`);

    await connection.end();
  } catch (error) {
    console.error('\n❌ Erreur lors de la création des packs:', error.message);
    console.error(error);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Exécuter le script
createWholesalePacks().catch((error) => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
