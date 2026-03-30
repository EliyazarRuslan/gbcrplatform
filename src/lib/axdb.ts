import sql from 'mssql';

const config: sql.config = {
  server: process.env.AXDB_SERVER || '10.88.0.66',
  database: process.env.AXDB_DATABASE || 'AX_GB_LIVE_60',
  user: process.env.AXDB_USER || 'ReadUser',
  password: process.env.AXDB_PASSWORD || 'G0ldBell123',
  port: parseInt(process.env.AXDB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  requestTimeout: 60000,
  connectionTimeout: 15000,
};

const globalForDb = globalThis as unknown as { axPool: sql.ConnectionPool | undefined; axPoolPromise: Promise<sql.ConnectionPool> | undefined };

export async function getAxPool(): Promise<sql.ConnectionPool> {
  if (globalForDb.axPool?.connected) {
    return globalForDb.axPool;
  }

  if (globalForDb.axPoolPromise) {
    return globalForDb.axPoolPromise;
  }

  globalForDb.axPoolPromise = new sql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      globalForDb.axPool = pool;
      pool.on('error', () => {
        globalForDb.axPool = undefined;
        globalForDb.axPoolPromise = undefined;
      });
      return pool;
    })
    .catch((err) => {
      globalForDb.axPoolPromise = undefined;
      throw err;
    });

  return globalForDb.axPoolPromise;
}

export { sql };
