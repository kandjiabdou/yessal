import mysql from 'mysql2/promise';
import { URL } from 'node:url';
import dotenv from 'dotenv';

// Charger la DATABASE_URL depuis .env
dotenv.config();

async function updateUsersSite() {
    // Extraire les infos de DATABASE_URL
    const dbUrl = new URL(process.env.DATABASE_URL);
    const connectionConfig = {
        host: dbUrl.hostname,
        port: dbUrl.port,
        user: dbUrl.username,
        password: decodeURIComponent(dbUrl.password),
        database: dbUrl.pathname.replace("/", ""),
    };

    console.log('🔌 Connexion à la base de données...');
    const connection = await mysql.createConnection(connectionConfig);

    try {
        console.log('📝 Mise à jour des utilisateurs avec siteLavagePrincipalGerantId = 3...');

        // Mettre à jour tous les utilisateurs pour leur assigner le site de lavage ID 3
        const [result] = await connection.execute(
            'UPDATE user SET siteLavagePrincipalGerantId = 3'
        );

        console.log(`✅ Mise à jour réussie ! ${result.affectedRows} utilisateur(s) mis à jour.`);

    } catch (err) {
        console.error('❌ Erreur pendant la mise à jour :', err.message);
        process.exit(1);
    } finally {
        await connection.end();
        console.log('🔌 Connexion fermée.');
    }
}

try {
    await updateUsersSite();
} catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
}