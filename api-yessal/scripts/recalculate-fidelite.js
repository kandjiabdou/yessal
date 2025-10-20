#!/usr/bin/env node
/**
 * recalculate-fidelite.js
 *
 * Script pour recalculer toutes les données de fidélité basées sur les commandes
 * avec flag = true uniquement. Pour chaque client, calcule :
 * 
 * - nombreLavageTotal : nombre de commandes (flag = true)
 * - poidsTotalLaveKg : somme des masseClientIndicativeKg
 * - prixTotalPaye : somme des prixPaye
 * - creditDisponible : nombre de packs de 40 points × 2000 FCFA
 * - pointsDisponible : points restants après conversion en crédit
 * - pointsFraction : fraction des points disponibles
 *
 * Logique simple :
 * 1. prixTotalPaye / 500 = points totaux
 * 2. points totaux / 40 = nombre de packs → crédit (× 2000 FCFA)
 * 3. reste des points = pointsDisponible + pointsFraction
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
        // 2.1. Récupérer les totaux depuis les commandes (flag = true uniquement)
        const [totalsRows] = await connection.execute(`
          SELECT 
            COUNT(*) as nombreLavageTotal,
            COALESCE(SUM(masseClientIndicativeKg), 0) as poidsTotalLaveKg,
            COALESCE(SUM(prixPaye), 0) as prixTotalPaye
          FROM commande 
          WHERE clientUserId = ? 
            AND flag = true
        `, [clientUserId]);

        const nombreLavageTotal = parseInt(totalsRows[0]?.nombreLavageTotal) || 0;
        const poidsTotalLaveKg = parseFloat(totalsRows[0]?.poidsTotalLaveKg) || 0;
        const prixTotalPaye = parseFloat(totalsRows[0]?.prixTotalPaye) || 0;

        // 2.2. Calculer les points totaux à partir du prix payé
        // 1 point = 500 FCFA payés
        const pointsExactsTotal = prixTotalPaye / FIDELITY_CURRENCY_PER_POINT;
        
        // 2.3. Conversion automatique: combien de packs de 40 points ?
        // 40 points = 2000 FCFA de crédit
        const nombrePacksComplets = Math.floor(pointsExactsTotal / FIDELITY_POINTS_PER_PACK);
        const creditDisponible = nombrePacksComplets * FIDELITY_DISCOUNT_PER_PACK;
        
        // 2.4. Le reste devient points disponibles
        const pointsRestants = pointsExactsTotal - (nombrePacksComplets * FIDELITY_POINTS_PER_PACK);
        const pointsDisponibleTotal = Math.floor(pointsRestants);
        const pointsFractionTotal = pointsRestants - pointsDisponibleTotal;

        if (nombrePacksComplets > 0) {
          console.log(`  → Conversion: ${nombrePacksComplets} pack(s) × 40 pts = ${creditDisponible} FCFA crédit`);
        }

        // 2.5. Mettre à jour l'enregistrement de fidélité
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
          console.log(`  ✓ Updated: ${nombreLavageTotal} lavages, ${poidsTotalLaveKg.toFixed(1)}kg, ${prixTotalPaye} FCFA`);
          console.log(`    Points: ${pointsDisponibleTotal} pts + ${pointsFractionTotal.toFixed(3)} fraction`);
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