const mysql = require("mysql2/promise");

(async function addUpdatedAtToFluxFinancier() {
  let connection;

  try {
    console.log("🔌 Connexion à la base de données...");

    // Créer la connexion
    connection = await mysql.createConnection({
      host: "host_name_or_ip", // ⚠️ REMPLACER PAR VOTRE HOST
      port: 3306,
      user: "yessal_api", // ⚠️ REMPLACER PAR VOTRE USERNAME
      password: "your_password", // ⚠️ REMPLACER PAR VOTRE PASSWORD
      database: "database_name", // ⚠️ REMPLACER PAR VOTRE DATABASE
    });

    console.log("✅ Connecté à la base de données");

    // Vérifier combien de flux financiers existent
    const [rows] = await connection.execute(
      "SELECT COUNT(*) as count FROM FluxFinancier"
    );
    console.log(`📊 ${rows[0].count} flux financier(s) trouvé(s)`);

    // Étape 1: Ajouter la colonne comme NULLABLE d'abord
    console.log("\n🔄 Étape 1: Ajout de la colonne updatedAt (nullable)...");
    await connection.execute(`
      ALTER TABLE FluxFinancier 
      ADD COLUMN updatedAt DATETIME(3) NULL
    `);
    console.log("✓ Colonne ajoutée");

    // Étape 2: Mettre à jour les valeurs existantes
    console.log("\n🔄 Étape 2: Mise à jour des valeurs existantes...");
    const [updateResult] = await connection.execute(`
      UPDATE FluxFinancier 
      SET updatedAt = COALESCE(createdAt, NOW(3))
      WHERE updatedAt IS NULL
    `);
    console.log(`✓ ${updateResult.affectedRows} enregistrement(s) mis à jour`);

    // Étape 3: Rendre la colonne NOT NULL
    console.log("\n🔄 Étape 3: Modification de la colonne en NOT NULL...");
    await connection.execute(`
      ALTER TABLE FluxFinancier 
      MODIFY COLUMN updatedAt DATETIME(3) NOT NULL
    `);
    console.log("✓ Colonne définie comme NOT NULL");

    console.log("\n✅ Migration terminée avec succès!");
    console.log("📝 Vous pouvez maintenant exécuter: npx prisma db push");
  } catch (error) {
    console.error("\n❌ Erreur lors de la migration:", error.message);

    // Afficher plus de détails si disponible
    if (error.sqlMessage) {
      console.error("SQL Error:", error.sqlMessage);
    }
    if (error.sql) {
      console.error("SQL Query:", error.sql);
    }

    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("\n🔌 Connexion fermée");
    }
  }
})();
