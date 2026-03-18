import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, authUser.userId)
      .query(`
        SELECT
          u.id,
          u.email,
          u.full_name,
          u.phone,
          u.role,
          u.branch_id,
          b.name AS branch_name,
          u.status,
          u.must_change_password,
          u.last_login_at,
          u.created_at,
          u.updated_at
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.id = @id
      `);

    const user = result.recordset[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        branchId: user.branch_id,
        branchName: user.branch_name ?? null,
        status: user.status,
        mustChangePassword: Boolean(user.must_change_password),
        lastLoginAt: user.last_login_at,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (err) {
    console.error('Me route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
