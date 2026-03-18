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

    const inspectionResult = await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`
        SELECT
          i.*,
          u.full_name AS inspector_name,
          r.full_name AS reviewer_name
        FROM inspections i
        LEFT JOIN users u ON u.id = i.inspector_id
        LEFT JOIN users r ON r.id = i.reviewed_by
        WHERE i.id = @id
      `);

    if (inspectionResult.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Inspection not found' }, { status: 404 });
    }

    const inspection = inspectionResult.recordset[0];

    // Parse JSON fields
    if (typeof inspection.checklist_data === 'string') {
      try { inspection.checklist_data = JSON.parse(inspection.checklist_data); } catch { /* leave as-is */ }
    }
    if (typeof inspection.accessories_present === 'string') {
      try { inspection.accessories_present = JSON.parse(inspection.accessories_present); } catch { /* leave as-is */ }
    }

    const damagesResult = await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`SELECT * FROM damage_records WHERE inspection_id = @id ORDER BY created_at ASC`);

    const photosResult = await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`SELECT * FROM inspection_photos WHERE inspection_id = @id ORDER BY created_at ASC`);

    return NextResponse.json({
      success: true,
      data: {
        ...inspection,
        damages: damagesResult.recordset,
        photos: photosResult.recordset,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('GET /api/inspections/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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

    // Fetch current inspection to verify ownership
    const existing = await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`SELECT id, inspector_id, status FROM inspections WHERE id = @id`);

    if (existing.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Inspection not found' }, { status: 404 });
    }

    const inspection = existing.recordset[0];
    const isOwner = inspection.inspector_id === currentUser.userId;
    const isPrivileged = ['super_admin', 'branch_manager'].includes(currentUser.role);

    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ success: false, error: 'Forbidden: not your inspection' }, { status: 403 });
    }

    const body = await request.json();

    const fields: string[] = [];
    const req = pool.request().input('id', sql.Int, inspectionId);

    if (body.mileage_reading !== undefined) { fields.push('mileage_reading = @mileage_reading'); req.input('mileage_reading', sql.Int, body.mileage_reading); }
    if (body.fuel_level !== undefined) { fields.push('fuel_level = @fuel_level'); req.input('fuel_level', sql.Decimal(5, 2), body.fuel_level); }
    if (body.inspection_date !== undefined) { fields.push('inspection_date = @inspection_date'); req.input('inspection_date', sql.DateTime, body.inspection_date); }
    if (body.exterior_condition !== undefined) { fields.push('exterior_condition = @exterior_condition'); req.input('exterior_condition', sql.NVarChar(sql.MAX), body.exterior_condition); }
    if (body.interior_condition !== undefined) { fields.push('interior_condition = @interior_condition'); req.input('interior_condition', sql.NVarChar(sql.MAX), body.interior_condition); }
    if (body.functionality_check !== undefined) { fields.push('functionality_check = @functionality_check'); req.input('functionality_check', sql.NVarChar(sql.MAX), body.functionality_check); }
    if (body.tire_condition !== undefined) { fields.push('tire_condition = @tire_condition'); req.input('tire_condition', sql.NVarChar(sql.MAX), body.tire_condition); }
    if (body.safety_equipment !== undefined) { fields.push('safety_equipment = @safety_equipment'); req.input('safety_equipment', sql.NVarChar(sql.MAX), body.safety_equipment); }
    if (body.cleanliness_interior !== undefined) { fields.push('cleanliness_interior = @cleanliness_interior'); req.input('cleanliness_interior', sql.Int, body.cleanliness_interior); }
    if (body.cleanliness_exterior !== undefined) { fields.push('cleanliness_exterior = @cleanliness_exterior'); req.input('cleanliness_exterior', sql.Int, body.cleanliness_exterior); }
    if (body.smell_condition !== undefined) { fields.push('smell_condition = @smell_condition'); req.input('smell_condition', sql.NVarChar(sql.MAX), body.smell_condition); }
    if (body.overall_notes !== undefined) { fields.push('overall_notes = @overall_notes'); req.input('overall_notes', sql.NVarChar(sql.MAX), body.overall_notes); }
    if (body.checklist_data !== undefined) { fields.push('checklist_data = @checklist_data'); req.input('checklist_data', sql.NVarChar(sql.MAX), JSON.stringify(body.checklist_data)); }
    if (body.accessories_present !== undefined) { fields.push('accessories_present = @accessories_present'); req.input('accessories_present', sql.NVarChar(sql.MAX), JSON.stringify(body.accessories_present)); }
    if (body.gps_latitude !== undefined) { fields.push('gps_latitude = @gps_latitude'); req.input('gps_latitude', sql.Decimal(10, 8), body.gps_latitude); }
    if (body.gps_longitude !== undefined) { fields.push('gps_longitude = @gps_longitude'); req.input('gps_longitude', sql.Decimal(11, 8), body.gps_longitude); }
    if (body.status !== undefined && isPrivileged) { fields.push('status = @status'); req.input('status', sql.NVarChar(20), body.status); }
    if (body.review_notes !== undefined && isPrivileged) { fields.push('review_notes = @review_notes'); req.input('review_notes', sql.NVarChar(sql.MAX), body.review_notes); }
    if (body.reviewed_by !== undefined && isPrivileged) { fields.push('reviewed_by = @reviewed_by'); req.input('reviewed_by', sql.Int, body.reviewed_by); }
    if (body.reviewed_at !== undefined && isPrivileged) { fields.push('reviewed_at = @reviewed_at'); req.input('reviewed_at', sql.DateTime, body.reviewed_at); }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    fields.push('updated_at = GETDATE()');
    await req.query(`UPDATE inspections SET ${fields.join(', ')} WHERE id = @id`);

    await logAudit({
      userId: currentUser.userId,
      action: 'INSPECTION_UPDATED',
      entityType: 'inspection',
      entityId: inspectionId,
      newValues: body,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, data: { message: 'Inspection updated' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('PUT /api/inspections/[id] error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
