import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/msal';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  // Generate CSRF state token
  const state = crypto.randomBytes(32).toString('hex');

  // Store redirect path and the user's origin in state
  const redirect = request.nextUrl.searchParams.get('redirect') || '/';
  const origin = request.headers.get('referer')
    ? new URL(request.headers.get('referer')!).origin
    : request.nextUrl.origin;

  // state format: stateToken|redirect|origin
  const stateWithRedirect = `${state}|${redirect}|${origin}`;

  const authUrl = getAuthorizationUrl(stateWithRedirect);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('sso_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 600,
    path: '/',
  });

  return response;
}
