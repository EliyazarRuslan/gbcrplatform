import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole(request, ['super_admin']);

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
    }

    // Prevent self-deactivation
    if (userId === currentUser.userId) {
      return NextResponse.json({ success: false, error: 'You cannot deactivate your own account' }, { status: 400 });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, userId)
      .query(`
        UPDATE users
        SET status = 'inactive', updated_at = GETDATE()
        WHERE id = @id AND status = 'active'
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json({ success: false, error: 'User not found or already inactive' }, { status: 404 });
    }

    await logAudit({
      userId: currentUser.userId,
      action: 'USER_DEACTIVATED',
      entityType: 'user',
      entityId: userId,
      oldValues: { status: 'active' },
      newValues: { status: 'inactive' },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, message: 'User deactivated successfully' });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('PUT /api/users/[id]/deactivate error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
