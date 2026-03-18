import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

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

    // Fetch current inspection
    const existing = await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`SELECT id, inspector_id, status, mileage_reading, fuel_level FROM inspections WHERE id = @id`);

    if (existing.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Inspection not found' }, { status: 404 });
    }

    const inspection = existing.recordset[0];

    // Only the inspector who created it can submit
    if (inspection.inspector_id !== currentUser.userId) {
      return NextResponse.json({ success: false, error: 'Forbidden: only the assigned inspector can submit' }, { status: 403 });
    }

    if (inspection.status !== 'in_progress') {
      return NextResponse.json(
        { success: false, error: `Cannot submit inspection with status: ${inspection.status}` },
        { status: 422 }
      );
    }

    // Validate required fields
    const errors: string[] = [];
    if (inspection.mileage_reading === null || inspection.mileage_reading === undefined) {
      errors.push('mileage_reading is required');
    }
    if (inspection.fuel_level === null || inspection.fuel_level === undefined) {
      errors.push('fuel_level is required');
    }

    // Check at least one photo exists
    const photoCheck = await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`SELECT COUNT(*) AS cnt FROM inspection_photos WHERE inspection_id = @id`);

    if (photoCheck.recordset[0].cnt === 0) {
      errors.push('at least one photo is required');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: errors },
        { status: 422 }
      );
    }

    await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`
        UPDATE inspections
        SET status = 'submitted', updated_at = GETDATE()
        WHERE id = @id
      `);

    await logAudit({
      userId: currentUser.userId,
      action: 'INSPECTION_SUBMITTED',
      entityType: 'inspection',
      entityId: inspectionId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('POST /api/inspections/[id]/submit error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
