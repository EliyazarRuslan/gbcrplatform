import sql from 'mssql';

const config: sql.config = {
  server: process.env.PLATFORM_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.PLATFORM_DATABASE || 'GBCR_Platform',
  user: process.env.PLATFORM_USER || 'ReadUser',
  password: process.env.PLATFORM_PASSWORD,
  port: parseInt(process.env.PLATFORM_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  requestTimeout: 30000,
  connectionTimeout: 15000,
};

const globalForDb = globalThis as unknown as { platformPool: sql.ConnectionPool | undefined; platformPoolPromise: Promise<sql.ConnectionPool> | undefined };

export async function getPlatformPool(): Promise<sql.ConnectionPool> {
  if (!process.env.PLATFORM_PASSWORD) throw new Error('PLATFORM_PASSWORD environment variable is required');
  if (globalForDb.platformPool?.connected) {
    return globalForDb.platformPool;
  }

  if (globalForDb.platformPoolPromise) {
    return globalForDb.platformPoolPromise;
  }

  globalForDb.platformPoolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      globalForDb.platformPool = pool;
      pool.on('error', () => {
        globalForDb.platformPool = undefined;
        globalForDb.platformPoolPromise = undefined;
      });
      return pool;
    })
    .catch((err) => {
      globalForDb.platformPoolPromise = undefined;
      throw err;
    });

  return globalForDb.platformPoolPromise;
}

export { sql };
