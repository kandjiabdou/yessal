#!/usr/bin/env node
/**
 * recalculate-fidelite.js
 *
 * Script pour recalculer toutes les données de fidélité basées sur les commandes
 * existantes avec flag = true (non annulées). Recalcule pour chaque client :
 * - nombreLavageTotal
 * - poidsTotalLaveKg  
 * - prixTotalPaye
 * - pointsDisponible
 * - pointsFraction
 * - creditDisponible (conversion automatique: 40 points → 2000 FCFA)
 *
 * Le script lit la config DB depuis DATABASE_URL ou variables DB_* via dotenv.
 *
 * Usage:
 *   node scripts/recalculate-fidelite.js       # avec confirmation
 *   node scripts/recalculate-fidelite.js --yes # sans confirmation
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Configuration business (constants de fidélité)
const FIDELITY_CURRENCY_PER_POINT = 500; // 1 point = 500 FCFA
const FIDELITY_POINTS_PER_PACK = 40;     // 40 points = 1 pack
const FIDELITY_DISCOUNT_PER_PACK = 2000; // 1 pack = 2000 FCFA

function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    const url = new URL(databaseUrl);
    const auth = url.username ? { user: decodeURIComponent(url.username), password: decodeURIComponent(url.password) } : {};
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      database: url.pathname ? url.pathname.replace(/^\//, '') : undefined,
      ...auth,
    };
  } catch (err) {
    return null;
  }
}

async function confirmPrompt(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      const ok = /^(y|yes)$/i.test(answer.trim());
      resolve(ok);
    });
  });
}

async function main() {
  const yes = process.argv.includes('--yes') || process.argv.includes('-y');

  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL) || {
    host: process.env.DB_HOST || process.env.HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : (process.env.PORT ? Number(process.env.PORT) : 3306),
    user: process.env.DB_USER || process.env.DB_USERNAME || process.env.MYSQL_USER || 'root',
    password: decodeURIComponent(dbUrl.password) || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DATABASE_NAME || process.env.MYSQL_DATABASE,
  };

  if (!dbConfig.database) {
    console.error('Error: could not determine database name. Please set DATABASE_URL or DB_* env vars in .env.');
    process.exit(1);
  }

  console.log('DB target:', `${dbConfig.user || ''}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  if (!yes) {
    const ok = await confirmPrompt('This will recalculate ALL fidelity data based on existing orders (flag=true). Continue? (yes/no) ');
    if (!ok) {
      console.log('Aborted by user.');
      process.exit(0);
    }
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: false,
    });

    console.log('Connected to database.');

    // 1. Récupérer tous les clients avec fidélité
    console.log('1. Fetching clients with fidelity records...');
    const [fideliteRows] = await connection.execute(
      `SELECT id, clientUserId FROM fidelite WHERE flag = true`
    );
    
    console.log(`Found ${fideliteRows.length} fidelity records to recalculate.`);

    if (fideliteRows.length === 0) {
      console.log('No fidelity records found. Nothing to recalculate.');
      await connection.end();
      return;
    }

    let processedCount = 0;
    let updatedCount = 0;

    // 2. Pour chaque client avec fidélité, recalculer les totaux
    for (const fidelite of fideliteRows) {
      const clientUserId = fidelite.clientUserId;
      const fideliteId = fidelite.id;
      
      console.log(`Processing client ${clientUserId} (fidelity ID: ${fideliteId})...`);

      try {
        // 2.1. Récupérer toutes les commandes du client (flag = true)
        const [commandesRows] = await connection.execute(`
          SELECT 
            id,
            masseClientIndicativeKg,
            prixPaye,
            prixTotal,
            pointsUtilises,
            montantReductionPoints
          FROM commande 
          WHERE clientUserId = ? 
            AND flag = true 
            AND masseClientIndicativeKg IS NOT NULL
          ORDER BY dateHeureCommande ASC
        `, [clientUserId]);

        // 2.2. Calculer les totaux
        let nombreLavageTotal = 0;
        let poidsTotalLaveKg = 0;
        let prixTotalPaye = 0;
        let pointsDisponibleTotal = 0;
        let pointsFractionTotal = 0;

        for (const commande of commandesRows) {
          nombreLavageTotal++;
          poidsTotalLaveKg += parseFloat(commande.masseClientIndicativeKg) || 0;
          
          // Prix payé : utiliser prixPaye si disponible, sinon prixTotal
          // Mais déduire les montants payés avec des points pour éviter double comptage
          const prixBrut = parseFloat(commande.prixPaye || commande.prixTotal) || 0;
          const montantReductionPoints = parseFloat(commande.montantReductionPoints) || 0;
          const prixReallyPaid = Math.max(0, prixBrut - montantReductionPoints);
          
          prixTotalPaye += prixReallyPaid;

          // 2.3. Calculer les points gagnés sur cette commande
          // Points = montant réellement payé / 500 FCFA
          const pointsExacts = prixReallyPaid / FIDELITY_CURRENCY_PER_POINT;
          const pointsEntiers = Math.floor(pointsExacts);
          const fraction = pointsExacts - pointsEntiers;

          pointsDisponibleTotal += pointsEntiers;
          pointsFractionTotal += fraction;
        }

        // 2.4. Gérer l'accumulation des fractions
        const extraPointsFromFraction = Math.floor(pointsFractionTotal);
        pointsDisponibleTotal += extraPointsFromFraction;
        pointsFractionTotal = pointsFractionTotal - extraPointsFromFraction;

        // 2.5. Déduire les points utilisés dans les commandes
        // (pour les commandes qui ont utilisé des points)
        const [pointsUtilisesRows] = await connection.execute(`
          SELECT COALESCE(SUM(pointsUtilises), 0) as totalPointsUtilises
          FROM commande 
          WHERE clientUserId = ? 
            AND flag = true 
            AND pointsUtilises > 0
        `, [clientUserId]);

        const totalPointsUtilises = parseInt(pointsUtilisesRows[0]?.totalPointsUtilises) || 0;
        pointsDisponibleTotal = Math.max(0, pointsDisponibleTotal - totalPointsUtilises);

        // 2.6. Conversion automatique des points en crédit
        // Dès que le client a 40 points ou plus, on convertit par packs de 40 points → 2000 FCFA
        let creditDisponible = 0;
        const paquetsComplets = Math.floor(pointsDisponibleTotal / FIDELITY_POINTS_PER_PACK);
        
        if (paquetsComplets > 0) {
          // Convertir les paquets complets en crédit
          creditDisponible = paquetsComplets * FIDELITY_DISCOUNT_PER_PACK;
          // Retirer les points convertis
          pointsDisponibleTotal = pointsDisponibleTotal - (paquetsComplets * FIDELITY_POINTS_PER_PACK);
          
          console.log(`  → Conversion: ${paquetsComplets} pack(s) × 40 pts = ${creditDisponible} FCFA crédit`);
        }

        // 2.7. Déduire le crédit déjà utilisé dans les commandes
        const [creditUtiliseRows] = await connection.execute(`
          SELECT COALESCE(SUM(montantReductionPoints), 0) as totalCreditUtilise
          FROM commande 
          WHERE clientUserId = ? 
            AND flag = true 
            AND montantReductionPoints > 0
        `, [clientUserId]);

        const totalCreditUtilise = parseFloat(creditUtiliseRows[0]?.totalCreditUtilise) || 0;
        creditDisponible = Math.max(0, creditDisponible - totalCreditUtilise);

        // 2.8. Mettre à jour l'enregistrement de fidélité
        const [updateResult] = await connection.execute(`
          UPDATE fidelite 
          SET 
            nombreLavageTotal = ?,
            poidsTotalLaveKg = ?,
            prixTotalPaye = ?,
            pointsDisponible = ?,
            pointsFraction = ?,
            creditDisponible = ?,
            updatedAt = NOW()
          WHERE id = ?
        `, [
          nombreLavageTotal,
          poidsTotalLaveKg,
          prixTotalPaye,
          pointsDisponibleTotal,
          pointsFractionTotal,
          creditDisponible,
          fideliteId
        ]);

        if (updateResult.affectedRows > 0) {
          updatedCount++;
          console.log(`  ✓ Updated: ${nombreLavageTotal} lavages, ${poidsTotalLaveKg}kg, ${prixTotalPaye} FCFA`);
          console.log(`    Points: ${pointsDisponibleTotal} pts (${pointsFractionTotal.toFixed(3)} fraction)`);
          console.log(`    Crédit disponible: ${creditDisponible} FCFA`);
        } else {
          console.log(`  ! No rows updated for fidelity ID ${fideliteId}`);
        }

      } catch (err) {
        console.error(`  ! Error processing client ${clientUserId}:`, err.message);
      }

      processedCount++;
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Processed: ${processedCount} clients`);
    console.log(`Updated: ${updatedCount} fidelity records`);
    console.log(`Skipped/Failed: ${processedCount - updatedCount} records`);

    await connection.end();
    console.log('Done.');

  } catch (err) {
    console.error('Fatal error:', err.message || err);
    if (connection && connection.end) await connection.end();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}