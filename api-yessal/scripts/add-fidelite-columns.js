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
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });


async function main() {

  const dbUrl = new URL(process.env.DATABASE_URL);
    const config = {
      host: dbUrl.hostname,
      port: dbUrl.port,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1),
      multipleStatements: true,
    };

  console.log('DB target:', `${config.user || ''}@${config.host}:${config.port}/${config.database}`);

  let connection;
  try {
    connection = await mysql.createConnection(config);

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
            [config.database, task.table, col.name]
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
