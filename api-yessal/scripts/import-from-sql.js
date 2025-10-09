const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { parse } = require('url');

// Charger la DATABASE_URL depuis .env
require('dotenv').config();

async function importFromSQL() {
    const sqlFilePath = path.join(__dirname, 'yessal.sql');

    if (!fs.existsSync(sqlFilePath)) {
        console.error('❌ Le fichier SQL est introuvable :', sqlFilePath);
        process.exit(1);
    }

    // Lire le contenu SQL
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Extraire les infos de DATABASE_URL
    const dbUrl = new URL(process.env.DATABASE_URL);
    const connectionConfig = {
      host: dbUrl.hostname,
      port: dbUrl.port,
      user: dbUrl.username,
      password: decodeURIComponent(dbUrl.password),
      database: dbUrl.pathname.replace("/", ""),
      multipleStatements: true, // important pour exécuter plusieurs requêtes
    };

    console.log(connectionConfig);

    try {
        console.log('🔌 Connexion à la base de données...');
        const connection = await mysql.createConnection(connectionConfig);

        console.log('📥 Importation en cours depuis le fichier SQL...');
        await connection.query(sql);

        console.log('✅ Importation réussie !');
        await connection.end();
    } catch (err) {
        console.error('❌ Erreur pendant l\'importation :', err.message);
    }
}

importFromSQL();