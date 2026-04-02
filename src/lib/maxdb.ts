import sql from 'mssql';
import { getFabricToken, getFabricServer } from './fabric-auth';

const globalForDb = globalThis as unknown as {
  maxPool: sql.ConnectionPool | undefined;
  maxPoolPromise: Promise<sql.ConnectionPool> | undefined;
  maxTokenExpiry: number;
};

async function buildConfig(): Promise<sql.config> {
  const token = await getFabricToken();
  return {
    server: getFabricServer(),
    database: process.env.FABRIC_MX_DATABASE || 'GBMXDB01V',
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
    authentication: {
      type: 'azure-active-directory-access-token',
      options: { token },
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    requestTimeout: 120000,
    connectionTimeout: 15000,
  };
}

export async function getMaxPool(): Promise<sql.ConnectionPool> {
  // Refresh pool every 45 minutes (tokens expire at 60 min)
  const now = Date.now();
  if (globalForDb.maxPool?.connected && globalForDb.maxTokenExpiry > now) {
    return globalForDb.maxPool;
  }

  // Close stale pool if token expired
  if (globalForDb.maxPool?.connected) {
    try { await globalForDb.maxPool.close(); } catch { /* ignore */ }
    globalForDb.maxPool = undefined;
    globalForDb.maxPoolPromise = undefined;
  }

  if (globalForDb.maxPoolPromise) {
    return globalForDb.maxPoolPromise;
  }

  globalForDb.maxPoolPromise = buildConfig()
    .then((config) => new sql.ConnectionPool(config).connect())
    .then((pool) => {
      globalForDb.maxPool = pool;
      globalForDb.maxTokenExpiry = now + 45 * 60 * 1000;
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
