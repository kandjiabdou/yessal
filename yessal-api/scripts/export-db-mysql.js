const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function escape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'string') return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
  if (typeof value === 'boolean') return value ? '1' : '0';
  return value;
}

async function exportFullDatabase() {
  const dbUrl = new URL(process.env.DATABASE_URL);
  const config = {
    host: dbUrl.hostname,
    port: dbUrl.port,
    user: dbUrl.username,
    password: dbUrl.password,
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

  const file = path.join(__dirname, '..', 'exports', `export-complet-${Date.now()}.sql`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, sqlContent, 'utf8');

  console.log(`✅ Export complet terminé : ${file}`);
  await connection.end();
}

exportFullDatabase().catch(console.error);
