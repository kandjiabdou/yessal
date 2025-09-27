#!/usr/bin/env node
/**
 * add-flag-columns.js
 *
 * Idempotent script to add a `flag` BOOLEAN column (default TRUE) to several
 * tables in the MySQL database used by the project. It reads the database
 * connection from the `DATABASE_URL` environment variable (or individual
 * DB_* env vars) via dotenv.
 *
 * Usage:
 *   node scripts/add-flag-columns.js       # prompts for confirmation
 *   node scripts/add-flag-columns.js --yes # run without prompt
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const TABLES = [
  'user',
  'livreur',
  'sitelavage',
  'machinelavage',
  'clientinvite',
  'adresselivraison',
  'commande',
  'commandeoptions',
  'repartitionmachine',
  'historiquestatutcommande',
  'paiement',
  'fidelite',
  'abonnementpremiummensuel',
  'statjournalsite',
  'logadminaction'
];

function parseDatabaseUrl(databaseUrl) {
  // Expected format: mysql://user:pass@host:port/dbname
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
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DATABASE_NAME || process.env.MYSQL_DATABASE,
  };

  if (!dbConfig.database) {
    console.error('Error: could not determine database name. Please set DATABASE_URL or DB_* env vars in .env.');
    process.exit(1);
  }

  console.log('DB target:', `${dbConfig.user || ''}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  if (!yes) {
    const ok = await confirmPrompt('This will add a `flag` column (BOOLEAN DEFAULT TRUE) to the listed tables if missing. Continue? (yes/no) ');
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

    const added = [];
    const skipped = [];

    for (const table of TABLES) {
      try {
        const [rows] = await connection.execute(
          `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'flag'`,
          [dbConfig.database, table]
        );
        const cnt = rows && rows[0] ? rows[0].cnt : 0;
        if (cnt > 0) {
          console.log(`- Table ${table}: already has 'flag' column. Skipping.`);
          skipped.push(table);
          continue;
        }

        // Add the flag column with default true. Use BOOLEAN which maps to tinyint(1).
        const alterSql = `ALTER TABLE \`${table}\` ADD COLUMN \`flag\` BOOLEAN NOT NULL DEFAULT TRUE`;
        console.log(`- Table ${table}: adding 'flag' column...`);
        await connection.execute(alterSql);
        console.log(`  -> Added 'flag' to ${table}`);
        added.push(table);
      } catch (err) {
        console.error(`  ! Error handling table ${table}:`, err.message);
      }
    }

    console.log('\nSummary:');
    console.log('  Added flag to:', added.length ? added.join(', ') : '(none)');
    console.log('  Skipped (already present):', skipped.length ? skipped.join(', ') : '(none)');

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
