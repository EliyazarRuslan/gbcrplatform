import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/msal';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  // Generate CSRF state token
  const state = crypto.randomBytes(32).toString('hex');

  // Validate redirect: must be a relative path starting with '/' and not starting with '//'
  const rawRedirect = request.nextUrl.searchParams.get('redirect') || '/';
  const redirect = /^\/(?!\/)/.test(rawRedirect) ? rawRedirect : '/';

  const origin = request.headers.get('referer')
    ? new URL(request.headers.get('referer')!).origin
    : request.nextUrl.origin;

  // Encode state components as base64 JSON to avoid '|' collision
  const stateWithRedirect = `${state}|${Buffer.from(JSON.stringify({ redirect, origin })).toString('base64url')}`;

  const authUrl = getAuthorizationUrl(stateWithRedirect);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('sso_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  });

  return response;
}
