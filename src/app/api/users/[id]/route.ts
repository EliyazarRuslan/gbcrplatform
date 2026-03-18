import { NextRequest, NextResponse } from 'next/server';
import { requireRole, hashPassword, AuthError } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import type { Role } from '@/types/auth';

const VALID_ROLES: Role[] = ['super_admin', 'branch_manager', 'customer_service', 'rental_officer', 'inspector', 'driver', 'finance'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ['super_admin']);

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, userId)
      .query(`
        SELECT
          u.id, u.email, u.full_name, u.phone, u.role,
          u.branch_id, b.name AS branch_name,
          u.status, u.must_change_password, u.last_login_at,
          u.created_at, u.updated_at
        FROM users u
        LEFT JOIN branches b ON b.id = u.branch_id
        WHERE u.id = @id
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('GET /api/users/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

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

    const body = await request.json();
    const { full_name, phone, role, branch_id, resetPassword } = body;

    if (role !== undefined && !VALID_ROLES.includes(role as Role)) {
      return NextResponse.json({ success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    const pool = await getPool();

    // Fetch existing user for audit comparison
    const existingResult = await pool.request()
      .input('id', sql.Int, userId)
      .query(`SELECT id, full_name, phone, role, branch_id, must_change_password FROM users WHERE id = @id`);

    if (existingResult.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const existing = existingResult.recordset[0];

    const setClauses: string[] = ['updated_at = GETDATE()'];
    const updateReq = pool.request().input('id', sql.Int, userId);

    if (full_name !== undefined) {
      updateReq.input('full_name', sql.NVarChar, String(full_name).trim());
      setClauses.push('full_name = @full_name');
    }
    if (phone !== undefined) {
      updateReq.input('phone', sql.NVarChar, phone ? String(phone).trim() : null);
      setClauses.push('phone = @phone');
    }
    if (role !== undefined) {
      updateReq.input('role', sql.NVarChar, role);
      setClauses.push('role = @role');
    }
    if (branch_id !== undefined) {
      updateReq.input('branch_id', sql.Int, branch_id !== null ? Number(branch_id) : null);
      setClauses.push('branch_id = @branch_id');
    }
    if (resetPassword === true) {
      const newHash = await hashPassword('Temp@123');
      updateReq.input('password_hash', sql.NVarChar, newHash);
      setClauses.push('password_hash = @password_hash');
      setClauses.push('must_change_password = 1');
    }

    await updateReq.query(`
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = @id
    `);

    const newValues: Record<string, unknown> = {};
    if (full_name !== undefined) newValues.full_name = String(full_name).trim();
    if (phone !== undefined) newValues.phone = phone ? String(phone).trim() : null;
    if (role !== undefined) newValues.role = role;
    if (branch_id !== undefined) newValues.branch_id = branch_id !== null ? Number(branch_id) : null;
    if (resetPassword === true) newValues.resetPassword = true;

    await logAudit({
      userId: currentUser.userId,
      action: 'USER_UPDATED',
      entityType: 'user',
      entityId: userId,
      oldValues: {
        full_name: existing.full_name,
        phone: existing.phone,
        role: existing.role,
        branch_id: existing.branch_id,
        must_change_password: existing.must_change_password,
      },
      newValues,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('PUT /api/users/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
