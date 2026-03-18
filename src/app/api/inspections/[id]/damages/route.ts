import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ['super_admin', 'branch_manager', 'rental_officer', 'inspector']);

    const { id } = await params;
    const inspectionId = parseInt(id, 10);
    if (isNaN(inspectionId)) {
      return NextResponse.json({ success: false, error: 'Invalid inspection ID' }, { status: 400 });
    }

    const pool = await getPool();

    // Verify inspection exists
    const inspCheck = await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`SELECT id FROM inspections WHERE id = @id`);

    if (inspCheck.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Inspection not found' }, { status: 404 });
    }

    const result = await pool.request()
      .input('inspection_id', sql.Int, inspectionId)
      .query(`SELECT * FROM damage_records WHERE inspection_id = @inspection_id ORDER BY created_at ASC`);

    return NextResponse.json({ success: true, data: result.recordset });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('GET /api/inspections/[id]/damages error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole(request, ['super_admin', 'branch_manager', 'rental_officer', 'inspector']);

    const { id } = await params;
    const inspectionId = parseInt(id, 10);
    if (isNaN(inspectionId)) {
      return NextResponse.json({ success: false, error: 'Invalid inspection ID' }, { status: 400 });
    }

    const pool = await getPool();

    // Verify inspection exists and get vehicle assetnum
    const inspCheck = await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`SELECT id, vehicle_assetnum FROM inspections WHERE id = @id`);

    if (inspCheck.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Inspection not found' }, { status: 404 });
    }

    const { vehicle_assetnum } = inspCheck.recordset[0];

    const body = await request.json();
    const {
      diagram_view,
      diagram_x,
      diagram_y,
      zone,
      damage_type,
      severity,
      description,
      is_pre_existing,
    } = body;

    if (!diagram_view || diagram_x === undefined || diagram_y === undefined || !damage_type || !severity) {
      return NextResponse.json(
        { success: false, error: 'diagram_view, diagram_x, diagram_y, damage_type, and severity are required' },
        { status: 400 }
      );
    }

    const validViews = ['top', 'front', 'rear', 'left', 'right'];
    if (!validViews.includes(diagram_view)) {
      return NextResponse.json(
        { success: false, error: `diagram_view must be one of: ${validViews.join(', ')}` },
        { status: 400 }
      );
    }

    const insertResult = await pool.request()
      .input('inspection_id', sql.Int, inspectionId)
      .input('vehicle_assetnum', sql.NVarChar(50), vehicle_assetnum)
      .input('diagram_view', sql.NVarChar(10), diagram_view)
      .input('diagram_x', sql.Decimal(6, 2), diagram_x)
      .input('diagram_y', sql.Decimal(6, 2), diagram_y)
      .input('zone', sql.NVarChar(100), zone || null)
      .input('damage_type', sql.NVarChar(100), damage_type)
      .input('severity', sql.NVarChar(50), severity)
      .input('description', sql.NVarChar(sql.MAX), description || null)
      .input('is_pre_existing', sql.Bit, is_pre_existing ? 1 : 0)
      .query(`
        INSERT INTO damage_records (
          inspection_id, vehicle_assetnum, diagram_view, diagram_x, diagram_y,
          zone, damage_type, severity, description, is_pre_existing,
          charge_to_customer, created_at, updated_at
        )
        OUTPUT INSERTED.id
        VALUES (
          @inspection_id, @vehicle_assetnum, @diagram_view, @diagram_x, @diagram_y,
          @zone, @damage_type, @severity, @description, @is_pre_existing,
          0, GETDATE(), GETDATE()
        )
      `);

    const newId = insertResult.recordset[0].id;

    await logAudit({
      userId: currentUser.userId,
      action: 'DAMAGE_RECORD_CREATED',
      entityType: 'damage_record',
      entityId: newId,
      newValues: { inspection_id: inspectionId, damage_type, severity, diagram_view },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, data: { id: newId } }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('POST /api/inspections/[id]/damages error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
