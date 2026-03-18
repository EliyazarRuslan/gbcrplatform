import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const ALLOWED_ROLES = ['super_admin', 'branch_manager', 'rental_officer', 'inspector'] as const;

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireRole(request, [...ALLOWED_ROLES]);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const vehicle = searchParams.get('vehicle') || '';

    const offset = (page - 1) * pageSize;

    const pool = await getPool();
    const req = pool.request()
      .input('offset', sql.Int, offset)
      .input('pageSize', sql.Int, pageSize);

    const conditions: string[] = [];

    const validTypes = ['pre_rental', 'post_return', 'ad_hoc'];
    const validStatuses = ['draft', 'in_progress', 'submitted', 'reviewed', 'approved', 'disputed', 'void'];

    if (type && validTypes.includes(type)) {
      req.input('type', sql.NVarChar, type);
      conditions.push('i.inspection_type = @type');
    }
    if (status && validStatuses.includes(status)) {
      req.input('status', sql.NVarChar, status);
      conditions.push('i.status = @status');
    }
    if (vehicle) {
      req.input('vehicle', sql.NVarChar, `%${vehicle}%`);
      conditions.push('(i.vehicle_assetnum LIKE @vehicle OR i.vehicle_regno LIKE @vehicle)');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataResult = await req.query(`
      SELECT
        i.id, i.booking_id, i.vehicle_assetnum, i.vehicle_regno,
        i.inspection_type, i.status, i.inspector_id,
        i.inspection_date, i.mileage_reading, i.fuel_level,
        i.overall_notes, i.customer_acknowledged,
        i.created_at, i.updated_at,
        u.full_name AS inspector_name
      FROM inspections i
      LEFT JOIN users u ON u.id = i.inspector_id
      ${whereClause}
      ORDER BY i.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    const countReq = pool.request();
    if (type && validTypes.includes(type)) countReq.input('type', sql.NVarChar, type);
    if (status && validStatuses.includes(status)) countReq.input('status', sql.NVarChar, status);
    if (vehicle) countReq.input('vehicle', sql.NVarChar, `%${vehicle}%`);

    const countResult = await countReq.query(`
      SELECT COUNT(*) AS total
      FROM inspections i
      ${whereClause}
    `);

    const total = countResult.recordset[0].total;

    return NextResponse.json({
      success: true,
      data: {
        inspections: dataResult.recordset,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('GET /api/inspections error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireRole(request, [...ALLOWED_ROLES]);

    const body = await request.json();
    const { vehicle_assetnum, vehicle_regno, inspection_type, booking_id } = body;

    if (!vehicle_assetnum || !vehicle_regno || !inspection_type) {
      return NextResponse.json(
        { success: false, error: 'vehicle_assetnum, vehicle_regno, and inspection_type are required' },
        { status: 400 }
      );
    }

    const validTypes = ['pre_rental', 'post_return', 'ad_hoc'];
    if (!validTypes.includes(inspection_type)) {
      return NextResponse.json(
        { success: false, error: `inspection_type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const insertResult = await pool.request()
      .input('vehicle_assetnum', sql.NVarChar(50), vehicle_assetnum)
      .input('vehicle_regno', sql.NVarChar(50), vehicle_regno)
      .input('inspection_type', sql.NVarChar(20), inspection_type)
      .input('booking_id', sql.Int, booking_id || null)
      .input('inspector_id', sql.Int, currentUser.userId)
      .query(`
        INSERT INTO inspections (
          vehicle_assetnum, vehicle_regno, inspection_type, booking_id,
          inspector_id, status, created_at, updated_at
        )
        OUTPUT INSERTED.id
        VALUES (
          @vehicle_assetnum, @vehicle_regno, @inspection_type, @booking_id,
          @inspector_id, 'in_progress', GETDATE(), GETDATE()
        )
      `);

    const newId = insertResult.recordset[0].id;

    await logAudit({
      userId: currentUser.userId,
      action: 'INSPECTION_CREATED',
      entityType: 'inspection',
      entityId: newId,
      newValues: { vehicle_assetnum, vehicle_regno, inspection_type, booking_id },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, data: { id: newId } }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('POST /api/inspections error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
