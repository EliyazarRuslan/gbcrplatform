import sql from 'mssql';
import fs from 'fs';

const config: sql.config = {
  server: process.env.DB_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.DB_NAME || 'GBCR_Platform',
  user: process.env.DB_USER || 'WriteUser',
  password: process.env.DB_PASSWORD || 'G0ldBell123',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
};

async function runSchema() {
  console.log('Connecting to GBCR_Platform...');
  const pool = await sql.connect(config);
  console.log('Connected.');

  const schema = fs.readFileSync('scripts/schema.sql', 'utf8');
  // Split on GO or run entire script as one statement
  const stmts = schema.split(/^GO$/gm).filter(s => s.trim());

  for (const stmt of stmts) {
    const preview = stmt.trim().substring(0, 70).replace(/\n/g, ' ');
    try {
      await pool.request().query(stmt);
      console.log('OK:', preview);
    } catch (e: any) {
      console.error('FAILED:', preview, '\n  Error:', e.message);
    }
  }

  // Verify tables were created
  const tables = await pool.request().query(`
    SELECT name FROM sys.tables
    WHERE name IN ('branches','users','vehicle_categories','audit_logs')
    ORDER BY name
  `);
  console.log('\nTables present:', tables.recordset.map((r: any) => r.name).join(', '));

  console.log('\nSchema run complete.');
  await pool.close();
}

runSchema().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
