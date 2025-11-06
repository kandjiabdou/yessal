import mysql from 'mysql2/promise';
import { URL } from 'node:url';
import dotenv from 'dotenv';

// Charger la DATABASE_URL depuis .env
dotenv.config();

async function updateInvitesCreatedBy() {
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
        console.log('📝 Mise à jour des clients invités avec createdByUserId = 1...');

        // Mettre à jour tous les clients invités pour assigner createdByUserId = 1
        const [result] = await connection.execute(
            'UPDATE clientinvite SET createdByUserId = 1 WHERE createdByUserId IS NULL'
        );

        console.log(`✅ Mise à jour réussie ! ${result.affectedRows} client(s) invité(s) mis à jour.`);

        // Afficher un résumé
        const [invites] = await connection.execute(
            'SELECT COUNT(*) as total FROM clientinvite WHERE createdByUserId = 1'
        );
        
        console.log(`📊 Total de clients invités avec createdByUserId = 1 : ${invites[0].total}`);

    } catch (err) {
        console.error('❌ Erreur pendant la mise à jour :', err.message);
        process.exit(1);
    } finally {
        await connection.end();
        console.log('🔌 Connexion fermée.');
    }
}

try {
    await updateInvitesCreatedBy();
} catch (error) {
    console.error('❌ Erreur :', error.message);
    process.exit(1);
}
