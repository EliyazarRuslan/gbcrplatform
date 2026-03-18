import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; damageId: string }> }
) {
  try {
    const currentUser = await requireRole(request, ['super_admin', 'branch_manager', 'rental_officer', 'inspector']);

    const { id, damageId } = await params;
    const inspectionId = parseInt(id, 10);
    const damageRecordId = parseInt(damageId, 10);

    if (isNaN(inspectionId) || isNaN(damageRecordId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const pool = await getPool();

    // Verify damage record belongs to this inspection
    const existing = await pool.request()
      .input('id', sql.Int, damageRecordId)
      .input('inspection_id', sql.Int, inspectionId)
      .query(`SELECT id FROM damage_records WHERE id = @id AND inspection_id = @inspection_id`);

    if (existing.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Damage record not found' }, { status: 404 });
    }

    const body = await request.json();

    const fields: string[] = [];
    const req = pool.request()
      .input('id', sql.Int, damageRecordId)
      .input('inspection_id', sql.Int, inspectionId);

    const validViews = ['top', 'front', 'rear', 'left', 'right'];
    if (body.diagram_view !== undefined && validViews.includes(body.diagram_view)) {
      fields.push('diagram_view = @diagram_view');
      req.input('diagram_view', sql.NVarChar(10), body.diagram_view);
    }
    if (body.diagram_x !== undefined) { fields.push('diagram_x = @diagram_x'); req.input('diagram_x', sql.Decimal(6, 2), body.diagram_x); }
    if (body.diagram_y !== undefined) { fields.push('diagram_y = @diagram_y'); req.input('diagram_y', sql.Decimal(6, 2), body.diagram_y); }
    if (body.zone !== undefined) { fields.push('zone = @zone'); req.input('zone', sql.NVarChar(100), body.zone); }
    if (body.damage_type !== undefined) { fields.push('damage_type = @damage_type'); req.input('damage_type', sql.NVarChar(100), body.damage_type); }
    if (body.severity !== undefined) { fields.push('severity = @severity'); req.input('severity', sql.NVarChar(50), body.severity); }
    if (body.description !== undefined) { fields.push('description = @description'); req.input('description', sql.NVarChar(sql.MAX), body.description); }
    if (body.is_pre_existing !== undefined) { fields.push('is_pre_existing = @is_pre_existing'); req.input('is_pre_existing', sql.Bit, body.is_pre_existing ? 1 : 0); }
    if (body.estimated_repair_cost !== undefined) { fields.push('estimated_repair_cost = @estimated_repair_cost'); req.input('estimated_repair_cost', sql.Decimal(12, 2), body.estimated_repair_cost); }
    if (body.charge_to_customer !== undefined) { fields.push('charge_to_customer = @charge_to_customer'); req.input('charge_to_customer', sql.Bit, body.charge_to_customer ? 1 : 0); }
    if (body.repair_status !== undefined) { fields.push('repair_status = @repair_status'); req.input('repair_status', sql.NVarChar(20), body.repair_status); }
    if (body.approved_by !== undefined) { fields.push('approved_by = @approved_by'); req.input('approved_by', sql.Int, body.approved_by); }
    if (body.approved_at !== undefined) { fields.push('approved_at = @approved_at'); req.input('approved_at', sql.DateTime, body.approved_at); }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    fields.push('updated_at = GETDATE()');
    await req.query(`UPDATE damage_records SET ${fields.join(', ')} WHERE id = @id AND inspection_id = @inspection_id`);

    await logAudit({
      userId: currentUser.userId,
      action: 'DAMAGE_RECORD_UPDATED',
      entityType: 'damage_record',
      entityId: damageRecordId,
      newValues: body,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, data: { message: 'Damage record updated' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('PUT /api/inspections/[id]/damages/[damageId] error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; damageId: string }> }
) {
  try {
    const currentUser = await requireRole(request, ['super_admin', 'branch_manager', 'rental_officer', 'inspector']);

    const { id, damageId } = await params;
    const inspectionId = parseInt(id, 10);
    const damageRecordId = parseInt(damageId, 10);

    if (isNaN(inspectionId) || isNaN(damageRecordId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const pool = await getPool();

    // Verify damage record belongs to this inspection
    const existing = await pool.request()
      .input('id', sql.Int, damageRecordId)
      .input('inspection_id', sql.Int, inspectionId)
      .query(`SELECT id FROM damage_records WHERE id = @id AND inspection_id = @inspection_id`);

    if (existing.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Damage record not found' }, { status: 404 });
    }

    await pool.request()
      .input('id', sql.Int, damageRecordId)
      .input('inspection_id', sql.Int, inspectionId)
      .query(`DELETE FROM damage_records WHERE id = @id AND inspection_id = @inspection_id`);

    await logAudit({
      userId: currentUser.userId,
      action: 'DAMAGE_RECORD_DELETED',
      entityType: 'damage_record',
      entityId: damageRecordId,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, data: { message: 'Damage record deleted' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('DELETE /api/inspections/[id]/damages/[damageId] error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
