import { DefaultAzureCredential } from '@azure/identity';

const FABRIC_SQL_SCOPE = 'https://database.windows.net/.default';

let credential: DefaultAzureCredential | undefined;

function getCredential(): DefaultAzureCredential {
  if (!credential) {
    credential = new DefaultAzureCredential();
  }
  return credential;
}

/**
 * Get an Azure AD access token for Fabric SQL endpoint.
 * Uses DefaultAzureCredential which supports:
 * - Development: Azure CLI credentials (az login)
 * - Production: Managed Identity or Service Principal (env vars)
 */
export async function getFabricToken(): Promise<string> {
  const cred = getCredential();
  const token = await cred.getToken(FABRIC_SQL_SCOPE);
  if (!token) {
    throw new Error('Failed to acquire Azure AD token for Fabric SQL');
  }
  return token.token;
}

/**
 * Build mssql config for a Fabric SQL endpoint connection.
 */
export function getFabricServer(): string {
  const server = process.env.FABRIC_SQL_ENDPOINT;
  if (!server) {
    throw new Error('FABRIC_SQL_ENDPOINT environment variable is not set. Get it from Fabric portal → Lakehouse → SQL analytics endpoint.');
  }
  return server;
}
