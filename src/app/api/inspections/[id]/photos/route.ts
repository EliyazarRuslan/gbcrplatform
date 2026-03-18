import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { requireRole, AuthError } from '@/lib/auth';
import { saveFile, deleteFile } from '@/lib/file-storage';
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
      .query(`SELECT * FROM inspection_photos WHERE inspection_id = @inspection_id ORDER BY created_at ASC`);

    return NextResponse.json({ success: true, data: result.recordset });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('GET /api/inspections/[id]/photos error:', err);
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

    // Verify inspection exists
    const inspCheck = await pool.request()
      .input('id', sql.Int, inspectionId)
      .query(`SELECT id FROM inspections WHERE id = @id`);

    if (inspCheck.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Inspection not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    const photo_type = (formData.get('photo_type') as string) || 'general';
    const damage_record_id = formData.get('damage_record_id') ? parseInt(formData.get('damage_record_id') as string, 10) : null;
    const captured_at = formData.get('captured_at') as string | null;
    const gps_latitude = formData.get('gps_latitude') ? parseFloat(formData.get('gps_latitude') as string) : null;
    const gps_longitude = formData.get('gps_longitude') ? parseFloat(formData.get('gps_longitude') as string) : null;

    // Determine file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const subPath = `inspections/${inspectionId}/photos/${timestamp}-${photo_type}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filePath = await saveFile(subPath, buffer);

    const insertResult = await pool.request()
      .input('inspection_id', sql.Int, inspectionId)
      .input('damage_record_id', sql.Int, damage_record_id || null)
      .input('photo_type', sql.NVarChar(50), photo_type)
      .input('file_path', sql.NVarChar(500), filePath)
      .input('file_size', sql.Int, buffer.length)
      .input('captured_at', sql.DateTime, captured_at || null)
      .input('gps_latitude', sql.Decimal(10, 8), gps_latitude || null)
      .input('gps_longitude', sql.Decimal(11, 8), gps_longitude || null)
      .input('uploaded_by', sql.Int, currentUser.userId)
      .query(`
        INSERT INTO inspection_photos (
          inspection_id, damage_record_id, photo_type, file_path, file_size,
          captured_at, gps_latitude, gps_longitude, uploaded_by, created_at
        )
        OUTPUT INSERTED.id
        VALUES (
          @inspection_id, @damage_record_id, @photo_type, @file_path, @file_size,
          @captured_at, @gps_latitude, @gps_longitude, @uploaded_by, GETDATE()
        )
      `);

    const newId = insertResult.recordset[0].id;

    await logAudit({
      userId: currentUser.userId,
      action: 'INSPECTION_PHOTO_UPLOADED',
      entityType: 'inspection_photo',
      entityId: newId,
      newValues: { inspection_id: inspectionId, photo_type, file_path: filePath },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, data: { id: newId, file_path: filePath } }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('POST /api/inspections/[id]/photos error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireRole(request, ['super_admin', 'branch_manager', 'rental_officer', 'inspector']);

    const { id } = await params;
    const inspectionId = parseInt(id, 10);
    const { searchParams } = new URL(request.url);
    const photoId = parseInt(searchParams.get('photoId') || '', 10);

    if (isNaN(inspectionId) || isNaN(photoId)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const pool = await getPool();

    // Get photo record
    const photo = await pool.request()
      .input('id', sql.Int, photoId)
      .input('inspection_id', sql.Int, inspectionId)
      .query('SELECT id, file_path FROM inspection_photos WHERE id = @id AND inspection_id = @inspection_id');

    if (photo.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Photo not found' }, { status: 404 });
    }

    const filePath = photo.recordset[0].file_path;

    // Delete from DB
    await pool.request()
      .input('id', sql.Int, photoId)
      .query('DELETE FROM inspection_photos WHERE id = @id');

    // Delete file from storage
    if (filePath) {
      await deleteFile(filePath);
    }

    await logAudit({
      userId: currentUser.userId,
      action: 'INSPECTION_PHOTO_DELETED',
      entityType: 'inspection_photo',
      entityId: photoId,
      newValues: { inspection_id: inspectionId, file_path: filePath },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('DELETE /api/inspections/[id]/photos error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
