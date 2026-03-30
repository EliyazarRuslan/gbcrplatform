// Microsoft Entra ID (Azure AD) OAuth2/OIDC configuration
// No external dependencies — uses standard OAuth2 authorization code flow

const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;
const REDIRECT_URI = process.env.AZURE_AD_REDIRECT_URI;

// Fail fast if any Azure AD config is missing or still using placeholder values
const PLACEHOLDER_PATTERN = /^YOUR_/;
const invalidVars: string[] = [];
if (!TENANT_ID || PLACEHOLDER_PATTERN.test(TENANT_ID)) invalidVars.push('AZURE_AD_TENANT_ID');
if (!CLIENT_ID || PLACEHOLDER_PATTERN.test(CLIENT_ID)) invalidVars.push('AZURE_AD_CLIENT_ID');
if (!CLIENT_SECRET || PLACEHOLDER_PATTERN.test(CLIENT_SECRET)) invalidVars.push('AZURE_AD_CLIENT_SECRET');
if (!REDIRECT_URI || PLACEHOLDER_PATTERN.test(REDIRECT_URI)) invalidVars.push('AZURE_AD_REDIRECT_URI');
if (invalidVars.length > 0) {
  throw new Error(`Azure AD configuration is missing or uses placeholder values: ${invalidVars.join(', ')}`);
}

// TypeScript cannot narrow `string | undefined` to `string` across the throw above,
// so we assign to explicit non-null constants for type-safe use in all downstream code.
const VALIDATED_TENANT_ID = TENANT_ID as string;
const VALIDATED_CLIENT_ID = CLIENT_ID as string;
const VALIDATED_CLIENT_SECRET = CLIENT_SECRET as string;
const VALIDATED_REDIRECT_URI = REDIRECT_URI as string;

const AUTHORITY = `https://login.microsoftonline.com/${VALIDATED_TENANT_ID}`;
const AUTHORIZE_URL = `${AUTHORITY}/oauth2/v2.0/authorize`;
const TOKEN_URL = `${AUTHORITY}/oauth2/v2.0/token`;

const SCOPES = 'openid profile email User.Read';

/**
 * Generate the Microsoft login URL with a random state for CSRF protection
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: VALIDATED_CLIENT_ID,
    response_type: 'code',
    redirect_uri: VALIDATED_REDIRECT_URI,
    response_mode: 'query',
    scope: SCOPES,
    state,
    prompt: 'select_account',
  });

  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}> {
  const body = new URLSearchParams({
    client_id: VALIDATED_CLIENT_ID,
    client_secret: VALIDATED_CLIENT_SECRET,
    code,
    redirect_uri: VALIDATED_REDIRECT_URI,
    grant_type: 'authorization_code',
    scope: SCOPES,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    throw new Error(`Token exchange failed: status ${res.status}`);
  }

  return res.json();
}

/**
 * Decode JWT ID token payload (without verification — token comes directly from Microsoft)
 */
export function decodeIdToken(idToken: string): {
  sub: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  oid?: string;
} {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid ID token format');

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  return payload;
}

/**
 * Get user profile from Microsoft Graph API
 */
export async function getUserProfile(accessToken: string): Promise<{
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  jobTitle: string | null;
}> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Graph API failed: ${res.status}`);
  }

  return res.json();
}
