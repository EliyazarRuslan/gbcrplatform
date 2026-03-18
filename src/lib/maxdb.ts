import sql from 'mssql';

const config: sql.config = {
  server: process.env.MAXDB_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.MAXDB_DATABASE || 'MAXDB76',
  user: process.env.MAXDB_USER || 'ReadUser',
  password: process.env.MAXDB_PASSWORD || 'G0ldBell123',
  port: parseInt(process.env.MAXDB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let pool: sql.ConnectionPool | null = null;

export async function getMaxPool(): Promise<sql.ConnectionPool> {
  if (!pool || !pool.connected) {
    pool = new sql.ConnectionPool(config);
    pool.on('error', () => { pool = null; });
    await pool.connect();
  }
  return pool;
}

export { sql };
