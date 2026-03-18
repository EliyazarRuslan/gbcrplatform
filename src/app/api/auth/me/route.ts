import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
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
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        branch_id: user.branch_id,
        branch_name: user.branch_name ?? null,
        status: user.status,
        mustChangePassword: Boolean(user.must_change_password),
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (err) {
    console.error('Me route error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
