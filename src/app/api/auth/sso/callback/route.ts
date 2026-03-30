import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getUserProfile, decodeIdToken } from '@/lib/msal';
import { signToken, setTokenCookie } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle Microsoft error responses
  if (error) {
    console.error('SSO error from Microsoft:', error, errorDescription);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'sso_denied');
    return NextResponse.redirect(loginUrl);
  }

  if (!code || !stateParam) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'sso_missing_params');
    return NextResponse.redirect(loginUrl);
  }

  // Verify CSRF state
  const savedState = request.cookies.get('sso_state')?.value;
  const stateParts = stateParam.split('|');
  const stateToken = stateParts[0];
  // Decode redirect and origin from base64 JSON (new format) or fall back to legacy pipe-split format
  let redirect = '/';
  let userOrigin = '';
  try {
    const decoded = JSON.parse(Buffer.from(stateParts[1] || '', 'base64url').toString('utf-8'));
    redirect = decoded.redirect || '/';
    userOrigin = decoded.origin || '';
  } catch {
    redirect = stateParts[1] || '/';
    userOrigin = stateParts[2] || '';
  }

  if (!savedState || savedState !== stateToken) {
    console.error('SSO state mismatch');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'sso_state_mismatch');
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user email — try Graph API first, fall back to ID token
    let userEmail: string | undefined;
    let userName: string | undefined;

    try {
      const profile = await getUserProfile(tokens.access_token);
      userEmail = (profile.mail ?? profile.userPrincipalName ?? '').toLowerCase().trim() || undefined;
      userName = profile.displayName;
    } catch {
      // Fall back to ID token claims
      const claims = decodeIdToken(tokens.id_token);
      userEmail = (claims.email || claims.preferred_username)?.toLowerCase().trim();
      userName = claims.name;
    }

    if (!userEmail) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'sso_no_email');
      return NextResponse.redirect(loginUrl);
    }

    // Look up user in GBCR_Platform database
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, userEmail)
      .query(`
        SELECT id, email, full_name, role, branch_id, status, must_change_password
        FROM users
        WHERE LOWER(TRIM(email)) = @email
      `);

    const user = result.recordset[0];

    if (!user) {
      await logAudit({
        userId: null,
        action: 'SSO_LOGIN_FAILED',
        entityType: 'user',
        newValues: { email: userEmail, reason: 'User not found in platform' },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'sso_user_not_found');
      return NextResponse.redirect(loginUrl);
    }

    if (user.status !== 'active') {
      await logAudit({
        userId: user.id,
        action: 'SSO_LOGIN_FAILED',
        entityType: 'user',
        entityId: user.id,
        newValues: { reason: `Account status: ${user.status}` },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'sso_account_inactive');
      return NextResponse.redirect(loginUrl);
    }

    // Update last_login_at
    await pool.request()
      .input('id', sql.Int, user.id)
      .query(`UPDATE users SET last_login_at = GETDATE(), updated_at = GETDATE() WHERE id = @id`);

    // Issue JWT
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branch_id,
    };

    const token = await signToken(tokenPayload);

    await logAudit({
      userId: user.id,
      action: 'SSO_LOGIN_SUCCESS',
      entityType: 'user',
      entityId: user.id,
      newValues: { sso_email: userEmail, sso_name: userName },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    // SSO users don't need to change password — clear the flag if set
    if (user.must_change_password) {
      await pool.request()
        .input('uid', sql.Int, user.id)
        .query(`UPDATE users SET must_change_password = 0 WHERE id = @uid`);
    }

    // Redirect to dashboard using the user's original origin (not the callback origin)
    // Validate redirect: must be relative (starts with '/' and not '//')
    const safeRedirect = /^\/(?!\/)/.test(redirect) ? redirect : '/';
    // Validate origin: must match the server's own origin
    const serverOrigin = request.nextUrl.origin;
    const safeOrigin = (userOrigin && userOrigin === serverOrigin) ? userOrigin : serverOrigin;
    const redirectUrl = new URL(safeRedirect, safeOrigin);

    const response = NextResponse.redirect(redirectUrl);

    // Clear SSO state cookie
    response.cookies.set('sso_state', '', { maxAge: 0, path: '/' });

    return setTokenCookie(response, token);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('SSO callback error:', err instanceof Error ? err.name : 'Error', message);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'sso_error');
    return NextResponse.redirect(loginUrl);
  }
}
