import sql from 'mssql';

// Validate required environment variables at startup
const REQUIRED_VARS = ['AXDB_SERVER', 'AXDB_DATABASE', 'AXDB_USER', 'AXDB_PASSWORD', 'AXDB_PORT'] as const;
const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
const parsedPort = parseInt(process.env.AXDB_PORT!, 10);
if (isNaN(parsedPort)) {
  throw new Error('AXDB_PORT must be a valid integer');
}

const config: sql.config = {
  server: process.env.AXDB_SERVER!,
  database: process.env.AXDB_DATABASE!,
  user: process.env.AXDB_USER!,
  password: process.env.AXDB_PASSWORD!,
  port: parsedPort,
  options: {
    // Enable TLS in production; allow override via DB_ENCRYPT for local dev
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.NODE_ENV !== 'production' && process.env.DB_TRUST_SERVER_CERT === 'true',
  },
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
