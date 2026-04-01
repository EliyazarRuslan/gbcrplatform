import sql from 'mssql';

const REQUIRED_VARS = ['AXDB_SERVER', 'AXDB_DATABASE', 'AXDB_USER', 'AXDB_PASSWORD', 'AXDB_PORT'] as const;

const globalForDb = globalThis as unknown as { axPool: sql.ConnectionPool | undefined; axPoolPromise: Promise<sql.ConnectionPool> | undefined };

function buildConfig(): sql.config {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  const parsedPort = parseInt(process.env.AXDB_PORT!, 10);
  if (isNaN(parsedPort)) {
    throw new Error('AXDB_PORT must be a valid integer');
  }
  return {
    server: process.env.AXDB_SERVER!,
    database: process.env.AXDB_DATABASE!,
    user: process.env.AXDB_USER!,
    password: process.env.AXDB_PASSWORD!,
    port: parsedPort,
    options: {
      // On-premises server without TLS — encrypt disabled intentionally
      encrypt: false,
      trustServerCertificate: true,
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 60000,
    connectionTimeout: 15000,
  };
}

export async function getAxPool(): Promise<sql.ConnectionPool> {
  if (globalForDb.axPool?.connected) {
    return globalForDb.axPool;
  }

  if (globalForDb.axPoolPromise) {
    return globalForDb.axPoolPromise;
  }

  const config = buildConfig();
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
