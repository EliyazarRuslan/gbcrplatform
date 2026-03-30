// Microsoft Entra ID (Azure AD) OAuth2/OIDC configuration
// No external dependencies — uses standard OAuth2 authorization code flow

const TENANT_ID = process.env.AZURE_AD_TENANT_ID || 'YOUR_TENANT_ID';
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = process.env.AZURE_AD_REDIRECT_URI || 'http://localhost:3000/api/auth/sso/callback';

const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;
const AUTHORIZE_URL = `${AUTHORITY}/oauth2/v2.0/authorize`;
const TOKEN_URL = `${AUTHORITY}/oauth2/v2.0/token`;

const SCOPES = 'openid profile email User.Read';

/**
 * Generate the Microsoft login URL with a random state for CSRF protection
 */
export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
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
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    scope: SCOPES,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Token exchange failed: ${error}`);
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
