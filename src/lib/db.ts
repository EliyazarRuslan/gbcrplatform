import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.DB_NAME || 'GBCR_Platform',
  user: process.env.DB_USER || 'ReadUser',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  requestTimeout: 30000,
  connectionTimeout: 15000,
};

const globalForDb = globalThis as unknown as { dbPool: sql.ConnectionPool | undefined; dbPoolPromise: Promise<sql.ConnectionPool> | undefined };

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!process.env.DB_PASSWORD) throw new Error('DB_PASSWORD environment variable is required');
  if (globalForDb.dbPool?.connected) {
    return globalForDb.dbPool;
  }

  if (globalForDb.dbPoolPromise) {
    return globalForDb.dbPoolPromise;
  }

  globalForDb.dbPoolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      globalForDb.dbPool = pool;
      pool.on('error', () => {
        globalForDb.dbPool = undefined;
        globalForDb.dbPoolPromise = undefined;
      });
      return pool;
    })
    .catch((err) => {
      globalForDb.dbPoolPromise = undefined;
      throw err;
    });

  return globalForDb.dbPoolPromise;
}

export { sql };
