import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { saveFile } from '@/lib/file-storage';
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

    // Verify inspection exists
    const inspCheck = await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`SELECT id FROM inspections WHERE id = @id`);

    if (inspCheck.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Inspection not found' }, { status: 404 });
    }

    const body = await request.json();
    const { type, signature } = body;

    if (!type || !['inspector', 'customer'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be "inspector" or "customer"' },
        { status: 400 }
      );
    }

    if (!signature || typeof signature !== 'string') {
      return NextResponse.json({ success: false, error: 'signature (base64 data URL) is required' }, { status: 400 });
    }

    // Strip data URL prefix and convert to buffer
    const base64Data = signature.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const subPath = `inspections/${inspectionId}/signatures/${type}.png`;
    const filePath = await saveFile(subPath, buffer);

    // Build update fields based on signature type
    const fields: string[] = ['updated_at = GETDATE()'];
    const req = pool.request().input('id', sql.Int, inspectionId);

    if (type === 'inspector') {
      fields.push('inspector_signature = @inspector_signature');
      req.input('inspector_signature', sql.NVarChar(500), filePath);
    } else {
      fields.push('customer_signature = @customer_signature');
      fields.push('customer_acknowledged = 1');
      req.input('customer_signature', sql.NVarChar(500), filePath);
    }

    await req.query(`UPDATE inspections SET ${fields.join(', ')} WHERE id = @id`);

    await logAudit({
      userId: currentUser.userId,
      action: 'INSPECTION_SIGNATURE_SAVED',
      entityType: 'inspection',
      entityId: inspectionId,
      newValues: { type, file_path: filePath },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, data: { file_path: filePath } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('POST /api/inspections/[id]/signature error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
