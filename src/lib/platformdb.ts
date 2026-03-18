import sql from 'mssql';

const config: sql.config = {
  server: process.env.PLATFORM_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.PLATFORM_DATABASE || 'GBCR_Platform',
  user: process.env.PLATFORM_USER || 'ReadUser',
  password: process.env.PLATFORM_PASSWORD || 'G0ldBell123',
  port: parseInt(process.env.PLATFORM_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let pool: sql.ConnectionPool | null = null;

export async function getPlatformPool(): Promise<sql.ConnectionPool> {
  if (!pool || !pool.connected) {
    pool = new sql.ConnectionPool(config);
    pool.on('error', () => { pool = null; });
    await pool.connect();
  }
  return pool;
}

export { sql };
