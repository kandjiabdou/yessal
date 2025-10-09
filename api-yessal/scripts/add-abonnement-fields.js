// scripts/add-abonnement-fields.js
// Script idempotent pour ajouter les champs 'limiteKg', 'montant', 'createdByUserId'
// et créer index / FK si possible, sans supprimer de données.
// Utilisation :
// 1) installer les dépendances si nécessaire : npm i mysql2 dotenv
// 2) node scripts/add-abonnement-fields.js

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(1) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.execute(
    `SELECT COUNT(1) as cnt FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return rows[0].cnt > 0;
}

async function constraintNameExists(conn, table, constraintName) {
  const [rows] = await conn.execute(
    `SELECT COUNT(1) as cnt FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [table, constraintName]
  );
  return rows[0].cnt > 0;
}

async function run() {
  // If DATABASE_URL is set as mysql://user:pass@host:port/db, parse it
  const dbUrl = new URL(process.env.DATABASE_URL);
  const config = {
    host: dbUrl.hostname,
    port: dbUrl.port,
    user: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.slice(1),
    multipleStatements: true,
  };
  if (!config.database) {
    console.error('Impossible de déterminer la base de données. Vérifiez votre fichier .env (DATABASE_URL ou DB_*).');
    process.exit(1);
  }

  console.log('Connexion à MySQL:', config.user + '@' + config.host + ':' + config.port + '/' + config.database);

  const conn = await mysql.createConnection(config);

  try {
    const table = 'abonnementpremiummensuel';

    // 1) Add limiteKg if missing
    if (!await columnExists(conn, table, 'limiteKg')) {
      console.log('Ajout de la colonne limiteKg (DOUBLE DEFAULT 40)');
      await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN limiteKg DOUBLE DEFAULT 40`);
    } else {
      console.log('Colonne limiteKg existe déjà');
    }

    // 2) Add montant if missing
    if (!await columnExists(conn, table, 'montant')) {
      console.log('Ajout de la colonne montant (DOUBLE DEFAULT 15000)');
      await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN montant DOUBLE DEFAULT 15000`);
    } else {
      console.log('Colonne montant existe déjà');
    }

    // 3) Add createdByUserId if missing
    if (!await columnExists(conn, table, 'createdByUserId')) {
      console.log('Ajout de la colonne createdByUserId (INT NULL)');
      await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN createdByUserId INT NULL`);
    } else {
      console.log('Colonne createdByUserId existe déjà');
    }

    // 4) Update existing rows with default values where NULL
    console.log('Mise à jour des valeurs NULL pour limiteKg et montant');
    await conn.execute(`UPDATE \`${table}\` SET limiteKg = COALESCE(limiteKg, 40), montant = COALESCE(montant, 15000) WHERE limiteKg IS NULL OR montant IS NULL`);

    // 5) Create index on createdByUserId if not exists
    const indexName = 'AbonnementCreatedByUserId_fkey';
    if (!await indexExists(conn, table, indexName)) {
      console.log('Création de l\'index', indexName);
      await conn.execute(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` (createdByUserId)`);
    } else {
      console.log('Index', indexName, 'existe déjà');
    }

    // 6) Optionally add FK to user(id) if all createdByUserId values are valid or NULL
    const [invalidRows] = await conn.execute(
      `SELECT COUNT(1) AS cnt FROM \`${table}\` ab LEFT JOIN \`user\` u ON ab.createdByUserId = u.id WHERE ab.createdByUserId IS NOT NULL AND u.id IS NULL`
    );

    const invalidCount = invalidRows[0].cnt || invalidRows[0].Cnt || invalidRows[0].CNT || 0;
    if (invalidCount === 0) {
      // Check if constraint already exists
      const fkName = 'fk_abonnement_createdby_user';
      if (!await constraintNameExists(conn, table, fkName)) {
        // Add constraint
        console.log('Ajout de la contrainte FK', fkName);
        try {
          await conn.execute(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${fkName}\` FOREIGN KEY (createdByUserId) REFERENCES \`user\`(id) ON DELETE SET NULL ON UPDATE CASCADE`);
          console.log('FK ajoutée');
        } catch (fkErr) {
          console.error('Erreur lors de l\'ajout de la FK :', fkErr.message || fkErr);
          console.log('Vous pouvez ajouter manuellement la FK si nécessaire après vérification.');
        }
      } else {
        console.log('Contrainte FK déjà présente:', fkName);
      }
    } else {
      console.log(`Il y a ${invalidCount} enregistrements avec createdByUserId non valides; la FK ne sera pas ajoutée automatiquement.`);
      console.log('Exécutez la requête suivante pour lister les createdByUserId invalides:');
      console.log(`SELECT ab.* FROM ${table} ab LEFT JOIN \`user\` u ON ab.createdByUserId = u.id WHERE ab.createdByUserId IS NOT NULL AND u.id IS NULL LIMIT 50;`);
    }

    console.log('Script terminé avec succès.');
  } catch (err) {
    console.error('Erreur durant l\'exécution du script :', err.message || err);
  } finally {
    await conn.end();
  }
}

run().catch((e) => {
  console.error('Erreur non prévue :', e);
  process.exit(1);
});
