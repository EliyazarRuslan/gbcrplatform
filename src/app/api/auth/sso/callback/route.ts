import { NextRequest, NextResponse } from 'next/server';
import { signToken, setTokenCookie } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';

const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET;
const STATIC_REDIRECT_URI = process.env.AZURE_AD_REDIRECT_URI;

export async function GET(request: NextRequest) {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !STATIC_REDIRECT_URI) {
    const missing = ['AZURE_AD_TENANT_ID', 'AZURE_AD_CLIENT_ID', 'AZURE_AD_CLIENT_SECRET', 'AZURE_AD_REDIRECT_URI']
      .filter(k => !process.env[k]);
    console.error('SSO callback misconfigured: missing env vars:', missing.join(', '));
    return NextResponse.json(
      { error: `SSO not configured: missing env vars: ${missing.join(', ')}` },
      { status: 500 }
    );
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state') || '/';
  const error = request.nextUrl.searchParams.get('error');

  // Build origin from Host header so it works from any host (localhost, LAN IP, etc)
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const base = `${protocol}://${host}`;
  const redirectUri = `${base}/api/auth/sso/callback`;

  if (error || !code) {
    console.error('SSO error:', error);
    return NextResponse.redirect(`${base}/login?error=sso_denied`);
  }

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: STATIC_REDIRECT_URI || redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email User.Read',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', tokenRes.status);
      return NextResponse.redirect(`${base}/login?error=sso_error`);
    }

    const tokens = await tokenRes.json();

    // 2. Get user email from Graph API
    let userEmail = '';
    let userName = '';

    try {
      const graphRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (graphRes.ok) {
        const profile = await graphRes.json();
        userEmail = (profile.mail || profile.userPrincipalName || '').toLowerCase().trim();
        userName = profile.displayName || '';
      }
    } catch {
      // fall through to ID token
    }

    // Fallback: decode ID token
    if (!userEmail && tokens.id_token) {
      try {
        const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString());
        userEmail = (payload.email || payload.preferred_username || '').toLowerCase().trim();
        userName = payload.name || '';
      } catch {
        // ignore
      }
    }

    if (!userEmail) {
      return NextResponse.redirect(`${base}/login?error=sso_no_email`);
    }

    // 3. Look up user in DB
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, userEmail)
      .query(`SELECT id, email, full_name, role, branch_id, status, must_change_password FROM users WHERE LOWER(TRIM(email)) = @email`);

    const user = result.recordset[0];

    if (!user) {
      await logAudit({ userId: null, action: 'SSO_LOGIN_FAILED', entityType: 'user', newValues: { email: userEmail, reason: 'Not found' } });
      return NextResponse.redirect(`${base}/login?error=sso_user_not_found`);
    }

    if (user.status !== 'active') {
      await logAudit({ userId: user.id, action: 'SSO_LOGIN_FAILED', entityType: 'user', entityId: user.id, newValues: { reason: 'Inactive' } });
      return NextResponse.redirect(`${base}/login?error=sso_account_inactive`);
    }

    // 4. Clear must_change_password for SSO users & update last login
    await pool.request()
      .input('id', sql.Int, user.id)
      .query(`UPDATE users SET must_change_password = 0, last_login_at = GETDATE(), updated_at = GETDATE() WHERE id = @id`);

    // 5. Issue JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branch_id,
    });

    await logAudit({ userId: user.id, action: 'SSO_LOGIN_SUCCESS', entityType: 'user', entityId: user.id, newValues: { sso_email: userEmail, sso_name: userName } });

    // 6. Redirect to dashboard ON LOCALHOST (where cookie is set)
    const redirectPath = (state && state.startsWith('/') && !state.startsWith('//')) ? state : '/';
    const response = NextResponse.redirect(`${base}${redirectPath}`);

    return setTokenCookie(response, token);
  } catch (err) {
    console.error('SSO callback error:', err);
    return NextResponse.redirect(`${base}/login?error=sso_error`);
  }
}
