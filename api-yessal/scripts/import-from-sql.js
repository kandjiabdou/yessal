import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Charger la DATABASE_URL depuis .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    try {
        console.log('🔌 Connexion à la base de données...');
        const connection = await mysql.createConnection(connectionConfig);

        console.log('📥 Importation en cours depuis le fichier SQL...');
        await connection.query(sql);

        console.log('✅ Importation réussie !');
        await connection.end();
    } catch (err) {
        console.error('❌ Erreur pendant l\'importation :', err.message);
        process.exit(1);
    }
}

importFromSQL().catch((error) => {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
});