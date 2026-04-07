import sql from 'mssql';
import { getFabricToken, getFabricServer } from './fabric-auth';

const globalForDb = globalThis as unknown as {
  axPool: sql.ConnectionPool | undefined;
  axPoolPromise: Promise<sql.ConnectionPool> | undefined;
  axTokenExpiry: number;
};

async function buildConfig(): Promise<sql.config> {
  const token = await getFabricToken();
  return {
    server: getFabricServer(),
    database: process.env.FABRIC_AX_DATABASE || 'dataverse_goldbell_cds2_workspace_unqd9df30b37bebee119048000d3a099',
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

export async function getAxPool(): Promise<sql.ConnectionPool> {
  const now = Date.now();
  if (globalForDb.axPool?.connected && globalForDb.axTokenExpiry > now) {
    return globalForDb.axPool;
  }

  if (globalForDb.axPool?.connected) {
    try { await globalForDb.axPool.close(); } catch { /* ignore */ }
    globalForDb.axPool = undefined;
    globalForDb.axPoolPromise = undefined;
  }

  if (globalForDb.axPoolPromise) {
    return globalForDb.axPoolPromise;
  }

  globalForDb.axPoolPromise = buildConfig()
    .then((config) => new sql.ConnectionPool(config).connect())
    .then((pool) => {
      globalForDb.axPool = pool;
      globalForDb.axTokenExpiry = now + 45 * 60 * 1000;
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
