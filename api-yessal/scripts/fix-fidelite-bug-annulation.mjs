/**
 * fix-fidelite-bug-annulation.mjs
 *
 * Corrige le bug : lors de l'annulation d'une commande, removeFidelityPoints
 * recalculait creditDisponible = creditTotalGenere SANS déduire le crédit
 * déjà consommé (montantReductionPoints) sur les autres commandes.
 * Résultat : creditDisponible pouvait augmenter de façon déraisonnable.
 *
 * Ce script :
 *   1. Détecte les clients dont creditDisponible est surévalué.
 *   2. Affiche les commandes annulées concernées.
 *   3. En mode --fix, corrige les enregistrements fidelite en base.
 *
 * Usage :
 *   node scripts/fix-fidelite-bug-annulation.mjs           → dry-run (lecture seule)
 *   node scripts/fix-fidelite-bug-annulation.mjs --fix     → applique les corrections
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ─── Constantes fidélité (identiques à fidelityService.js) ───────────────────
const POINTS_PER_FCFA       = 500;   // 1 point = 500 FCFA
const POINTS_FOR_CONVERSION = 40;    // 40 points = 1 pack
const CREDIT_PER_PACK       = 2000;  // 1 pack = 2000 FCFA

// ─── Mode ────────────────────────────────────────────────────────────────────
const FIX_MODE = process.argv.includes('--fix');

// ─── Connexion (même approche que export-db-mysql.mjs) ───────────────────────
async function createConnection() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  return mysql.createConnection({
    host    : dbUrl.hostname,
    port    : Number(dbUrl.port) || 3306,
    user    : dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.slice(1),
    multipleStatements: false,
  });
}

// ─── Calcul correct du crédit disponible ─────────────────────────────────────
function computeCorrectFidelite(activeCommandes) {
  let nombreLavageTotal = 0;
  let poidsTotalLaveKg  = 0;
  let prixTotalPaye     = 0;
  let creditTotalConsomme = 0;

  for (const cmd of activeCommandes) {
    nombreLavageTotal  += 1;
    poidsTotalLaveKg   += Number(cmd.masseVerifieeKg ?? cmd.masseClientIndicativeKg ?? 0);
    prixTotalPaye      += Number(cmd.prixPaye ?? 0);
    creditTotalConsomme += Number(cmd.montantReductionPoints ?? 0);
  }

  const pointsExactsTotal   = prixTotalPaye / POINTS_PER_FCFA;
  const nombrePacksComplets = Math.floor(pointsExactsTotal / POINTS_FOR_CONVERSION);
  const creditTotalGenere   = nombrePacksComplets * CREDIT_PER_PACK;
  const creditDisponible    = Math.max(0, creditTotalGenere - creditTotalConsomme);

  const pointsRestants  = pointsExactsTotal - nombrePacksComplets * POINTS_FOR_CONVERSION;
  const pointsDisponible = Math.floor(pointsRestants);
  const pointsFraction   = pointsRestants - pointsDisponible;

  return {
    nombreLavageTotal,
    poidsTotalLaveKg,
    prixTotalPaye,
    pointsDisponible,
    pointsFraction,
    creditDisponible,
    // pour info seulement
    creditTotalGenere,
    creditTotalConsomme,
  };
}

// ─── Utilitaires affichage ────────────────────────────────────────────────────
function fmt(n) {
  return Number(n ?? 0).toLocaleString('fr-FR');
}

function separator(char = '─', len = 80) {
  console.log(char.repeat(len));
}

// ─── Script principal ─────────────────────────────────────────────────────────
async function main() {
  console.log('');
  separator('═');
  console.log('  🔍 Détection & correction bug fidélité – annulation de commande');
  console.log(`  Mode : ${FIX_MODE ? '✏️  FIX (corrections appliquées en base)' : '👁️  DRY-RUN (aucune modification)'}`);
  separator('═');
  console.log('');

  const conn = await createConnection();

  // 1. Récupérer tous les clients ayant un enregistrement fidelite
  const [fideliteRows] = await conn.query(`
    SELECT f.id          AS fideliteId,
           f.clientUserId,
           f.creditDisponible,
           f.pointsDisponible,
           f.pointsFraction,
           f.prixTotalPaye,
           f.nombreLavageTotal,
           f.poidsTotalLaveKg,
           f.numeroCarteFidelite,
           u.nom,
           u.prenom,
           u.telephone,
           u.email
    FROM   fidelite f
    JOIN   user     u ON u.id = f.clientUserId
    ORDER  BY f.clientUserId
  `);

  let totalAffected = 0;
  const fixes = [];

  for (const client of fideliteRows) {
    // 2. Commandes ACTIVES du client (flag=1, génèrent des points)
    const [activeCommandes] = await conn.query(`
      SELECT id, masseVerifieeKg, masseClientIndicativeKg,
             prixPaye, montantReductionPoints, statut, dateHeureCommande
      FROM   commande
      WHERE  clientUserId = ? AND flag = 1
      ORDER  BY dateHeureCommande
    `, [client.clientUserId]);

    // 3. Commandes ANNULÉES du client (flag=0)
    const [cancelledCommandes] = await conn.query(`
      SELECT id, statut, prixPaye, montantReductionPoints,
             masseClientIndicativeKg, masseVerifieeKg, dateHeureCommande
      FROM   commande
      WHERE  clientUserId = ? AND flag = 0
      ORDER  BY dateHeureCommande DESC
    `, [client.clientUserId]);

    // 4. Calculer la valeur CORRECTE
    const correct = computeCorrectFidelite(activeCommandes);

    const currentCredit  = Number(client.creditDisponible ?? 0);
    const expectedCredit = correct.creditDisponible;

    // 5. Y a-t-il une anomalie ?
    // Tolérance de 0.01 pour les flottants
    if (Math.abs(currentCredit - expectedCredit) < 0.01) continue;

    totalAffected++;
    fixes.push({ client, correct, currentCredit, expectedCredit, cancelledCommandes });

    // ── Affichage ─────────────────────────────────────────────────────────────
    separator();
    console.log(`👤 CLIENT  : ${client.nom} ${client.prenom}  (ID ${client.clientUserId})`);
    console.log(`   Tél     : ${client.telephone ?? '—'}`);
    console.log(`   Email   : ${client.email ?? '—'}`);
    console.log(`   Carte   : ${client.numeroCarteFidelite}`);
    console.log('');

    console.log(`💳 FIDÉLITÉ ACTUELLE (en base)`);
    console.log(`   creditDisponible  : ${fmt(currentCredit)} FCFA  ← ⚠️ valeur suspecte`);
    console.log(`   pointsDisponible  : ${fmt(client.pointsDisponible)}`);
    console.log(`   prixTotalPaye     : ${fmt(client.prixTotalPaye)} FCFA`);
    console.log(`   nombreLavageTotal : ${client.nombreLavageTotal}`);
    console.log('');

    console.log(`✅ FIDÉLITÉ CORRECTE (recalculée)`);
    console.log(`   creditTotalGenere  : ${fmt(correct.creditTotalGenere)} FCFA  (${correct.nombreLavageTotal} commandes actives → ${fmt(correct.prixTotalPaye)} FCFA → ${Math.floor(correct.prixTotalPaye / POINTS_PER_FCFA)} pts → ${Math.floor(correct.prixTotalPaye / POINTS_PER_FCFA / POINTS_FOR_CONVERSION)} pack(s))`);
    console.log(`   creditTotalConsomme: ${fmt(correct.creditTotalConsomme)} FCFA  (crédit déjà utilisé sur commandes actives)`);
    console.log(`   creditDisponible  : ${fmt(expectedCredit)} FCFA  ← valeur corrigée`);
    console.log(`   pointsDisponible  : ${fmt(correct.pointsDisponible)}`);
    console.log(`   prixTotalPaye     : ${fmt(correct.prixTotalPaye)} FCFA`);
    console.log(`   nombreLavageTotal : ${correct.nombreLavageTotal}`);
    console.log('');

    const delta = currentCredit - expectedCredit;
    console.log(`🔺 ÉCART   : +${fmt(delta)} FCFA de crédit injectés par le bug`);
    console.log('');

    if (cancelledCommandes.length > 0) {
      console.log(`🚫 COMMANDES ANNULÉES (flag=0) — ${cancelledCommandes.length} commande(s)`);
      console.log(`   ${'ID'.padEnd(7)} ${'Date'.padEnd(20)} ${'Statut'.padEnd(14)} ${'prixPaye'.padStart(10)} ${'réductionPts'.padStart(13)}`);
      console.log(`   ${'─'.repeat(70)}`);
      for (const c of cancelledCommandes) {
        const date = c.dateHeureCommande
          ? new Date(c.dateHeureCommande).toLocaleString('fr-FR')
          : '—';
        console.log(
          `   ${String(c.id).padEnd(7)} ${date.padEnd(20)} ${(c.statut ?? '—').padEnd(14)} ` +
          `${fmt(c.prixPaye).padStart(10)} FCFA ${fmt(c.montantReductionPoints).padStart(10)} FCFA`
        );
      }
      console.log('');
    } else {
      console.log(`ℹ️  Aucune commande annulée trouvée (flag=0) pour ce client.`);
      console.log('');
    }
  }

  // ── Résumé ─────────────────────────────────────────────────────────────────
  separator('═');
  if (totalAffected === 0) {
    console.log('✅ Aucune anomalie détectée. Toutes les fidélités sont cohérentes.');
  } else {
    console.log(`⚠️  ${totalAffected} client(s) affecté(s) par le bug.`);

    if (FIX_MODE) {
      // ── Application des corrections ────────────────────────────────────────
      console.log('');
      console.log('🔧 Application des corrections...');
      let corrected = 0;
      for (const { client, correct } of fixes) {
        await conn.query(`
          UPDATE fidelite SET
            nombreLavageTotal = ?,
            poidsTotalLaveKg  = ?,
            prixTotalPaye     = ?,
            pointsDisponible  = ?,
            pointsFraction    = ?,
            creditDisponible  = ?,
            updatedAt         = NOW()
          WHERE clientUserId = ?
        `, [
          correct.nombreLavageTotal,
          correct.poidsTotalLaveKg,
          correct.prixTotalPaye,
          correct.pointsDisponible,
          correct.pointsFraction,
          correct.creditDisponible,
          client.clientUserId,
        ]);
        console.log(`   ✅ Client ${client.clientUserId} (${client.nom} ${client.prenom}) → creditDisponible corrigé à ${fmt(correct.creditDisponible)} FCFA`);
        corrected++;
      }
      console.log('');
      console.log(`✅ ${corrected} enregistrement(s) corrigé(s) en base.`);
    } else {
      console.log('');
      console.log('👉 Relancez avec --fix pour appliquer les corrections :');
      console.log('   node scripts/fix-fidelite-bug-annulation.mjs --fix');
    }
  }
  separator('═');
  console.log('');

  await conn.end();
}

main().catch((err) => {
  console.error('❌ Erreur fatale :', err);
  process.exit(1);
});
