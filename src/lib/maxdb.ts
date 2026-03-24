import sql from 'mssql';

const config: sql.config = {
  server: process.env.MAXDB_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.MAXDB_DATABASE || 'MAXDB76',
  user: process.env.MAXDB_USER || 'ReadUser',
  password: process.env.MAXDB_PASSWORD || 'G0ldBell123',
  port: parseInt(process.env.MAXDB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  requestTimeout: 30000,
  connectionTimeout: 15000,
};

// Use globalThis to persist across Turbopack HMR
const globalForDb = globalThis as unknown as { maxPool: sql.ConnectionPool | undefined; maxPoolPromise: Promise<sql.ConnectionPool> | undefined };

export async function getMaxPool(): Promise<sql.ConnectionPool> {
  if (globalForDb.maxPool?.connected) {
    return globalForDb.maxPool;
  }

  if (globalForDb.maxPoolPromise) {
    return globalForDb.maxPoolPromise;
  }

  globalForDb.maxPoolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      globalForDb.maxPool = pool;
      pool.on('error', () => {
        globalForDb.maxPool = undefined;
        globalForDb.maxPoolPromise = undefined;
      });
      return pool;
    })
    .catch((err) => {
      globalForDb.maxPoolPromise = undefined;
      throw err;
    });

  return globalForDb.maxPoolPromise;
}

export { sql };
