import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, comparePassword, hashPassword } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function PUT(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, error: 'currentPassword and newPassword are required' }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, authUser.userId)
      .query(`SELECT password_hash FROM users WHERE id = @id`);

    const user = result.recordset[0];

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const passwordMatch = await comparePassword(currentPassword, user.password_hash);

    if (!passwordMatch) {
      await logAudit({
        userId: authUser.userId,
        action: 'CHANGE_PASSWORD_FAILED',
        entityType: 'user',
        entityId: authUser.userId,
        newValues: { reason: 'Current password incorrect' },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      });
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await pool.request()
      .input('id', sql.Int, authUser.userId)
      .input('password_hash', sql.NVarChar, newPasswordHash)
      .query(`
        UPDATE users
        SET password_hash = @password_hash,
            must_change_password = 0,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    await logAudit({
      userId: authUser.userId,
      action: 'CHANGE_PASSWORD_SUCCESS',
      entityType: 'user',
      entityId: authUser.userId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
