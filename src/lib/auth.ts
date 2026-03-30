import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import type { AuthUser, Role } from '@/types/auth';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
const COOKIE_NAME = 'gbcr_token';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: AuthUser): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

export function setTokenCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax', // lax required for SSO redirects from Microsoft
    secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return response;
}

export function clearTokenCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}

export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value || null;
}

export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export async function requireRole(request: NextRequest, allowedRoles: Role[]): Promise<AuthUser> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new AuthError('Not authenticated', 401);
  }
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError('Insufficient permissions', 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
