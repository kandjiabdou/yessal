#!/usr/bin/env node
/**
 * add-missing-columns.js
 *
 * Idempotent script to add specific missing columns to tables in the MySQL
 * database used by the project. It reads DATABASE_URL from .env.
 *
 * Current behavior: ensures `fidelite.prixTotalPaye` exists (DOUBLE DEFAULT 0)
 * and can also add the common `flag` BOOLEAN DEFAULT TRUE across tables.
 *
 * Usage:
 *   node scripts/add-missing-columns.js --yes
 */

const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    const url = new URL(databaseUrl);
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname ? url.pathname.replace(/^\//, '') : undefined,
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
      resolve(/^(y|yes)$/i.test(answer.trim()));
    });
  });
}

const COLUMNS_TO_ADD = {
  fidelite: [
    { name: 'prixTotalPaye', definition: 'DOUBLE NOT NULL DEFAULT 0' },
  ],
  // If you want to also add flags for all tables, list them here.
  // Example:
  // user: [{ name: 'flag', definition: 'BOOLEAN NOT NULL DEFAULT TRUE' }],
};

const FLAG_TABLES = [
  'user', 'livreur', 'sitelavage', 'machinelavage', 'clientinvite', 'adresselivraison',
  'commande', 'commandeoptions', 'repartitionmachine', 'historiquestatutcommande',
  'paiement', 'fidelite', 'abonnementpremiummensuel', 'statjournalsite', 'logadminaction'
];

async function main() {
  const yes = process.argv.includes('--yes') || process.argv.includes('-y');

  const dbConfig = parseDatabaseUrl(process.env.DATABASE_URL) || {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DATABASE_NAME,
  };

  if (!dbConfig.database) {
    console.error('Could not determine database name. Set DATABASE_URL or DB_* env vars in .env');
    process.exit(1);
  }

  console.log('Target DB:', `${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  if (!yes) {
    const ok = await confirmPrompt('This will add missing columns to your database (idempotent). Continue? (yes/no) ');
    if (!ok) {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  let conn;
  try {
    conn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    });

    console.log('Connected to database.');

    const added = [];
    const skipped = [];

    // First handle explicit COLUMNS_TO_ADD map
    for (const [table, cols] of Object.entries(COLUMNS_TO_ADD)) {
      for (const col of cols) {
        try {
          const [rows] = await conn.execute(
            `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [dbConfig.database, table, col.name]
          );
          const cnt = rows && rows[0] ? rows[0].cnt : 0;
          if (cnt > 0) {
            skipped.push(`${table}.${col.name}`);
            console.log(`- ${table}.${col.name}: already exists. Skipping.`);
            continue;
          }
          const sql = `ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${col.definition}`;
          console.log(`- Adding ${table}.${col.name} -> ${col.definition}`);
          await conn.execute(sql);
          added.push(`${table}.${col.name}`);
        } catch (err) {
          console.error(`  ! Error adding ${table}.${col.name}:`, err.message);
        }
      }
    }

    // Optionally ensure flag on common tables (idempotent)
    for (const table of FLAG_TABLES) {
      try {
        const [rows] = await conn.execute(
          `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'flag'`,
          [dbConfig.database, table]
        );
        const cnt = rows && rows[0] ? rows[0].cnt : 0;
        if (cnt > 0) {
          skipped.push(`${table}.flag`);
          console.log(`- ${table}.flag: exists. Skipping.`);
          continue;
        }
        const sql = `ALTER TABLE \`${table}\` ADD COLUMN \`flag\` BOOLEAN NOT NULL DEFAULT TRUE`;
        console.log(`- Adding ${table}.flag`);
        await conn.execute(sql);
        added.push(`${table}.flag`);
      } catch (err) {
        console.error(`  ! Error adding flag to ${table}:`, err.message);
      }
    }

    console.log('\nSummary:');
    console.log('  Added:', added.length ? added.join(', ') : '(none)');
    console.log('  Skipped:', skipped.length ? skipped.join(', ') : '(none)');

    await conn.end();
    console.log('Done. Please run `npx prisma generate` and restart your server.');
  } catch (err) {
    console.error('Fatal error:', err.message || err);
    if (conn && conn.end) await conn.end();
    process.exit(1);
  }
}

if (require.main === module) main();
