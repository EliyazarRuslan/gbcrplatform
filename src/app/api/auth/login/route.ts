import { NextRequest, NextResponse } from 'next/server';
import { comparePassword, signToken, setTokenCookie } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  let email: string | undefined;

  try {
    const body = await request.json();
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
    const password: string | undefined = body.password;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query(`
        SELECT id, email, full_name, password_hash, role, branch_id, status, must_change_password, last_login_at
        FROM users
        WHERE LOWER(TRIM(email)) = @email
      `);

    const user = result.recordset[0];

    if (!user) {
      await logAudit({
        userId: null,
        action: 'LOGIN_FAILED',
        entityType: 'user',
        newValues: { email, reason: 'User not found' },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (user.status !== 'active') {
      await logAudit({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: user.id,
        newValues: { reason: `Account status: ${user.status}` },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
      return NextResponse.json({ error: 'Account is not active' }, { status: 401 });
    }

    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      await logAudit({
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'user',
        entityId: user.id,
        newValues: { reason: 'Invalid password' },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Update last_login_at and updated_at
    await pool.request()
      .input('id', sql.Int, user.id)
      .query(`UPDATE users SET last_login_at = GETDATE(), updated_at = GETDATE() WHERE id = @id`);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branch_id,
    };

    const token = await signToken(tokenPayload);

    await logAudit({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'user',
      entityId: user.id,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        branchId: user.branch_id,
        mustChangePassword: Boolean(user.must_change_password),
      },
    });

    return setTokenCookie(response, token);
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
