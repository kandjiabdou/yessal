import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'string') return `'${value.replaceAll("'", "''").replaceAll('\\', '\\\\')}'`;
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replaceAll('T', ' ')}'`;
  if (typeof value === 'boolean') return value ? '1' : '0';
  return value;
}

async function exportFullDatabase() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  console.log('Connecting to database:', dbUrl);
  const config = {
    host: dbUrl.hostname,
    port: dbUrl.port,
    user: dbUrl.username,
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.slice(1),
    multipleStatements: true,
  };

  const connection = await mysql.createConnection(config);
  const [tables] = await connection.query('SHOW TABLES');
  const tableKey = Object.keys(tables[0])[0];

  let sqlContent = `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\nSET AUTOCOMMIT = 0;\nSTART TRANSACTION;\nSET FOREIGN_KEY_CHECKS = 0;\nDROP DATABASE IF EXISTS \`${config.database}\`;\nCREATE DATABASE \`${config.database}\`;\nUSE \`${config.database}\`;\n`;

  for (const row of tables) {
    const table = row[tableKey];

    const [createTable] = await connection.query(`SHOW CREATE TABLE \`${table}\``);
    sqlContent += `${createTable[0]['Create Table']};\n`;

    const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
    if (!rows || rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const values = rows
      .map(r => '(' + columns.map(c => escape(r[c])).join(', ') + ')')
      .join(',\n  ');

    sqlContent += `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES\n  ${values};\n`;
  }

  sqlContent += `SET FOREIGN_KEY_CHECKS = 1;\nCOMMIT;\n`;

  // Get comment from command line argument
  const comment = process.argv[2] ? process.argv[2].replace(/\s+/g, '-') : '';

  // Generate timestamp in dd-mm-yyyy_hh-mm-ss format
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2,'0')}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getFullYear()}_${now.getHours().toString().padStart(2,'0')}-${now.getMinutes().toString().padStart(2,'0')}-${now.getSeconds().toString().padStart(2,'0')}`;
const backupDir =
  process.env.BACKUP_DIR || path.join(__dirname, "..", "exports");

  const file = path.join(backupDir, `export_${dateStr}${comment ? '_' + comment : ''}.sql`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, sqlContent, 'utf8');

  console.log(`✅ Export complet terminé : ${file}`);
  await connection.end();
}

exportFullDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
