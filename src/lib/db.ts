import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.DB_NAME || 'GBCR_Platform',
  user: process.env.DB_USER || 'ReadUser',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool || !pool.connected) {
    pool = await sql.connect(config);
    pool.on('error', () => { pool = null; });
  }
  return pool;
}

export { sql };
