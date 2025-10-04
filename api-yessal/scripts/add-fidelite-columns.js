#!/usr/bin/env node
/**
 * add-fidelite-columns.js
 *
 * Idempotent script to add fidelity-related columns to the database when the
 * Prisma schema was updated but migrations weren't applied. It reads the DB
 * connection from DATABASE_URL or DB_* env vars via dotenv.
 *
 * Columns added:
 *  - fidelite.pointsDisponible INT NOT NULL DEFAULT 0
 *  - fidelite.pointsFraction FLOAT NOT NULL DEFAULT 0
 *  - commande.pointsUtilises INT NOT NULL DEFAULT 0
 *  - commande.montantReductionPoints FLOAT NOT NULL DEFAULT 0
 *
 * Usage:
 *   node scripts/add-fidelite-columns.js       # prompts for confirmation
 *   node scripts/add-fidelite-columns.js --yes # run without prompt
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

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
    password: process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DATABASE_NAME || process.env.MYSQL_DATABASE,
  };

  if (!dbConfig.database) {
    console.error('Error: could not determine database name. Please set DATABASE_URL or DB_* env vars in .env.');
    process.exit(1);
  }

  console.log('DB target:', `${dbConfig.user || ''}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  if (!yes) {
    const ok = await confirmPrompt('This will add fidelity-related columns to `fidelite` and `commande` if missing. Continue? (yes/no) ');
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

    const tasks = [
      {
        table: 'fidelite',
        columns: [
          { name: 'pointsDisponible', definition: 'INT NOT NULL DEFAULT 0' },
          { name: 'pointsFraction', definition: 'FLOAT NOT NULL DEFAULT 0' }
        ]
      },
      {
        table: 'commande',
        columns: [
          { name: 'pointsUtilises', definition: 'INT NOT NULL DEFAULT 0' },
          { name: 'montantReductionPoints', definition: 'FLOAT NOT NULL DEFAULT 0' }
        ]
      }
    ];

    const added = [];
    const skipped = [];

    for (const task of tasks) {
      for (const col of task.columns) {
        try {
          const [rows] = await connection.execute(
            `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
            [dbConfig.database, task.table, col.name]
          );
          const cnt = rows && rows[0] ? rows[0].cnt : 0;
          if (cnt > 0) {
            console.log(`- Table ${task.table}: column '${col.name}' already exists. Skipping.`);
            skipped.push(`${task.table}.${col.name}`);
            continue;
          }

          const alterSql = `ALTER TABLE \`${task.table}\` ADD COLUMN \`${col.name}\` ${col.definition}`;
          console.log(`- Table ${task.table}: adding column '${col.name}'...`);
          await connection.execute(alterSql);
          console.log(`  -> Added ${task.table}.${col.name}`);
          added.push(`${task.table}.${col.name}`);
        } catch (err) {
          console.error(`  ! Error handling ${task.table}.${col.name}:`, err.message || err);
        }
      }
    }

    console.log('\nSummary:');
    console.log('  Added columns:', added.length ? added.join(', ') : '(none)');
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
