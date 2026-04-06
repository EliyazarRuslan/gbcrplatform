import { NextRequest, NextResponse } from 'next/server';

const TENANT_ID = process.env.AZURE_AD_TENANT_ID;
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID;
const STATIC_REDIRECT_URI = process.env.AZURE_AD_REDIRECT_URI!;

export async function GET(request: NextRequest) {
  if (!TENANT_ID || !CLIENT_ID) {
    return NextResponse.json(
      { error: 'SSO not configured: missing AZURE_AD_TENANT_ID or AZURE_AD_CLIENT_ID' },
      { status: 500 }
    );
  }

  const redirect = request.nextUrl.searchParams.get('redirect') || '/';

  // Build redirect URI from the Host header so SSO works from any host
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  const redirectUri = `${protocol}://${host}/api/auth/sso/callback`;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email User.Read',
    state: redirect,
    prompt: 'select_account',
  });

  const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?${params}`;

  return NextResponse.redirect(authUrl);
}
