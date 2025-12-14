const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Charger la DATABASE_URL depuis .env
dotenv.config();

// Données de test pour les produits de laverie
const categories = [
  { nom: 'Détergents', description: 'Produits de lavage pour le linge' },
  { nom: 'Assouplissants', description: 'Produits pour adoucir le linge' },
  { nom: 'Additifs', description: 'Produits complémentaires pour le lavage' },
  { nom: 'Accessoires', description: 'Accessoires pour le lavage' }
];

const produits = [
  // Détergents
  {
    nom: "OMO Lessive Poudre 1kg",
    image:
      "https://marchesandagadrummond.com/wp-content/uploads/2022/08/93348f687a28929b1a55334628188e52.jpeg",
    description: "Détergent en poudre pour linge blanc et couleur",
    prixReference: 2500,
    codeBarres: "6001087388016",
    categorieNom: "Détergents",
    fournisseur: "Unilever",
  },
  {
    nom: "Ariel Liquide 1L",
    image:
      "https://m.media-amazon.com/images/I/311WW4B+KTL._AC_UF1000,1000_QL80_.jpg",
    description: "Lessive liquide concentrée pour tout type de linge",
    prixReference: 3500,
    codeBarres: "8001841459127",
    categorieNom: "Détergents",
    fournisseur: "P&G",
  },

  // Assouplissants
  {
    nom: "Soupline Lavande 1L",
    image:
      "https://static.wixstatic.com/media/805132_0e0305f53a0148cfa0fc9e9e6426fcb1~mv2.jpg/v1/fit/w_500,h_500,q_90/file.jpg",
    description: "Assouplissant parfum lavande",
    prixReference: 1800,
    codeBarres: "3178520895124",
    categorieNom: "Assouplissants",
    fournisseur: "Colgate-Palmolive",
  },
  {
    nom: "Eau de Javel 2L",
    image: "https://epdistribution.fr/689-large_default/javel-2l.jpg",
    description: "Désinfectant et blanchissant",
    prixReference: 1200,
    codeBarres: "3178520895162",
    categorieNom: "Additifs",
    fournisseur: "Lacroix",
  },
];

async function seedShopProducts() {
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

    // 1. Insérer les catégories
    console.log('\n📦 Insertion des catégories...');
    const categoryIds = {};

    for (const category of categories) {
      const [result] = await connection.execute(
        'INSERT INTO categorieproduit (nom, description, createdAt, updatedAt, flag) VALUES (?, ?, NOW(), NOW(), true)',
        [category.nom, category.description]
      );
      categoryIds[category.nom] = result.insertId;
      console.log(`  ✓ ${category.nom} (ID: ${result.insertId})`);
    }

    // 2. Insérer les produits
    console.log('\n🛍️  Insertion des produits...');
    let productCount = 0;

    for (const produit of produits) {
      const categorieId = categoryIds[produit.categorieNom];
      
      const [result] = await connection.execute(
        `INSERT INTO produit (nom, description, prixReference, image, codeBarres, categorieId, fournisseur, createdAt, updatedAt, flag) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), true)`,
        [
          produit.nom,
          produit.description,
          produit.prixReference,
          produit.codeBarres,
          categorieId,
          produit.fournisseur
        ]
      );
      productCount++;
      console.log(`  ✓ ${produit.nom} - ${produit.prixReference} F (ID: ${result.insertId})`);
    }

    // 3. Récupérer tous les sites de lavage
    console.log('\n🏪 Récupération des sites de lavage...');
    const [sites] = await connection.execute(
      'SELECT id, nom FROM sitelavage WHERE flag = true'
    );

    if (sites.length === 0) {
      console.log('  ⚠️  Aucun site de lavage trouvé. Création d\'un stock impossible.');
      console.log('  💡 Veuillez d\'abord créer des sites de lavage dans votre application.');
    } else {
      console.log(`  ✓ ${sites.length} site(s) trouvé(s)`);

      // 4. Créer le stock pour chaque site
      console.log('\n📊 Création du stock pour chaque site...');
      const [produitsInseres] = await connection.execute(
        'SELECT id, nom, prixReference FROM produit WHERE flag = true'
      );

      for (const site of sites) {
        console.log(`\n  📍 Site: ${site.nom}`);
        
        for (const produit of produitsInseres) {
          // Stock initial aléatoire entre 10 et 50 unités
          const stockInitial = Math.floor(Math.random() * 41) + 10;
          // Prix de vente = prix de référence + marge de 20%
          const prixVente = Math.round(produit.prixReference * 1.2);
          const stockAlerte = 10;

          await connection.execute(
            `INSERT INTO stockproduit (produitId, siteLavageId, stock, stockAlerte, prixVente, createdAt, updatedAt, flag)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW(), true)`,
            [produit.id, site.id, stockInitial, stockAlerte, prixVente]
          );

          // Créer un mouvement de stock initial
          const [stockResult] = await connection.execute(
            'SELECT id FROM stockproduit WHERE produitId = ? AND siteLavageId = ?',
            [produit.id, site.id]
          );

          if (stockResult.length > 0) {
            await connection.execute(
              `INSERT INTO mouvementstock (stockProduitId, type, quantite, motif, dateHeure, flag)
               VALUES (?, 'Entree', ?, 'Stock initial', NOW(), true)`,
              [stockResult[0].id, stockInitial]
            );
          }

          console.log(`    ✓ ${produit.nom}: ${stockInitial} unités à ${prixVente} F`);
        }
      }
    }

    console.log('\n✅ Données de test insérées avec succès !');
    console.log(`\n📊 Résumé:`);
    console.log(`   - ${categories.length} catégories`);
    console.log(`   - ${productCount} produits`);
    console.log(`   - ${sites.length} site(s) avec stock`);

    await connection.end();
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'insertion des données:', error.message);
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

// Exécuter le script
seedShopProducts().catch((error) => {
  console.error('❌ Erreur:', error.message);
  process.exit(1);
});
