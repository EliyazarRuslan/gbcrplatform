import { NextRequest, NextResponse } from 'next/server';
import { requireRole, hashPassword, AuthError } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import type { Role } from '@/types/auth';

const VALID_ROLES: Role[] = ['super_admin', 'branch_manager', 'customer_service', 'rental_officer', 'inspector', 'driver', 'finance'];

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['super_admin']);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * pageSize;

    const pool = await getPool();
    const req = pool.request()
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, pageSize);

    const conditions: string[] = [];

    if (search) {
      req.input('search', sql.NVarChar, `%${search}%`);
      conditions.push('(u.email LIKE @search OR u.full_name LIKE @search)');
    }
    if (role && VALID_ROLES.includes(role as Role)) {
      req.input('role', sql.NVarChar, role);
      conditions.push('u.role = @role');
    }
    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      req.input('status', sql.NVarChar, status);
      conditions.push('u.status = @status');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataResult = await req.query(`
      SELECT
        u.id, u.email, u.full_name, u.phone, u.role,
        u.branch_id, b.name AS branch_name,
        u.status, u.must_change_password, u.last_login_at,
        u.created_at, u.updated_at
      FROM users u
      LEFT JOIN branches b ON b.id = u.branch_id
      ${whereClause}
      ORDER BY u.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    const countReq = pool.request();
    if (search) countReq.input('search', sql.NVarChar, `%${search}%`);
    if (role && VALID_ROLES.includes(role as Role)) countReq.input('role', sql.NVarChar, role);
    if (status && ['active', 'inactive', 'suspended'].includes(status)) countReq.input('status', sql.NVarChar, status);

    const countResult = await countReq.query(`
      SELECT COUNT(*) AS total
      FROM users u
      ${whereClause}
    `);

    const total = countResult.recordset[0].total;
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: dataResult.recordset,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('GET /api/users error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireRole(request, ['super_admin']);

    const body = await request.json();
    const { email, full_name, role, phone, branch_id, password } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json({ success: false, error: 'email, full_name, and role are required' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role as Role)) {
      return NextResponse.json({ success: false, error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const tempPassword = typeof password === 'string' && password.length > 0 ? password : 'Temp@123';

    const pool = await getPool();

    // Check for duplicate email
    const existingResult = await pool.request()
      .input('email', sql.NVarChar, normalizedEmail)
      .query(`SELECT id FROM users WHERE LOWER(TRIM(email)) = @email`);

    if (existingResult.recordset.length > 0) {
      return NextResponse.json({ success: false, error: 'A user with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(tempPassword);

    const insertResult = await pool.request()
      .input('email', sql.NVarChar, normalizedEmail)
      .input('full_name', sql.NVarChar, String(full_name).trim())
      .input('role', sql.NVarChar, role)
      .input('phone', sql.NVarChar, phone ? String(phone).trim() : null)
      .input('branch_id', sql.Int, branch_id ? Number(branch_id) : null)
      .input('password_hash', sql.NVarChar, passwordHash)
      .query(`
        INSERT INTO users (email, full_name, role, phone, branch_id, password_hash, status, must_change_password)
        OUTPUT INSERTED.id
        VALUES (@email, @full_name, @role, @phone, @branch_id, @password_hash, 'active', 1)
      `);

    const newUserId = insertResult.recordset[0].id;

    await logAudit({
      userId: currentUser.userId,
      action: 'USER_CREATED',
      entityType: 'user',
      entityId: newUserId,
      newValues: { email: normalizedEmail, full_name, role, phone, branch_id },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newUserId,
        email: normalizedEmail,
        full_name: String(full_name).trim(),
        role,
        phone: phone ? String(phone).trim() : null,
        branch_id: branch_id ? Number(branch_id) : null,
        status: 'active',
        must_change_password: true,
        tempPassword,
      },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('POST /api/users error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
