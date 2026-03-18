import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { getMaxPool, sql as maxSql } from '@/lib/maxdb';
import { requireRole, AuthError } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

const VALID_AVAILABILITY_OVERRIDES = ['blocked', 'reserved_vip'] as const;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ assetnum: string }> }) {
  try {
    const user = await requireRole(req, ['super_admin', 'branch_manager', 'rental_officer']);
    const { assetnum } = await params;

    const body = await req.json();
    const { category_id, availability_override, override_reason, notes } = body;

    // Validate availability_override
    if (
      availability_override !== undefined &&
      availability_override !== null &&
      !VALID_AVAILABILITY_OVERRIDES.includes(availability_override)
    ) {
      return NextResponse.json(
        { success: false, error: "availability_override must be 'blocked', 'reserved_vip', or null" },
        { status: 400 }
      );
    }

    // Verify assetnum exists in Maximo
    const maxPool = await getMaxPool();
    const assetCheck = await maxPool.request()
      .input('assetnum', maxSql.VarChar(30), assetnum)
      .input('siteid', maxSql.VarChar(10), 'GBCR')
      .query(`
        SELECT 1 AS found
        FROM asset
        WHERE assetnum = @assetnum
          AND siteid = @siteid
      `);

    if (assetCheck.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }

    // Upsert into vehicle_overrides
    const pool = await getPool();

    // Check if override record already exists
    const existingResult = await pool.request()
      .input('assetnum', sql.VarChar(30), assetnum)
      .query(`SELECT id FROM vehicle_overrides WHERE assetnum = @assetnum`);

    let overrideId: number;

    if (existingResult.recordset.length > 0) {
      // UPDATE — only update provided fields
      overrideId = existingResult.recordset[0].id;

      const updateRequest = pool.request()
        .input('assetnum', sql.VarChar(30), assetnum);

      const setClauses: string[] = ['updated_at = GETDATE()'];

      if (category_id !== undefined) {
        updateRequest.input('category_id', sql.Int, category_id ?? null);
        setClauses.push('category_id = @category_id');
      }
      if (availability_override !== undefined) {
        updateRequest.input('availability_override', sql.VarChar(30), availability_override ?? null);
        setClauses.push('availability_override = @availability_override');
      }
      if (override_reason !== undefined) {
        updateRequest.input('override_reason', sql.NVarChar(200), override_reason ?? null);
        setClauses.push('override_reason = @override_reason');
      }
      if (notes !== undefined) {
        updateRequest.input('notes', sql.NVarChar(sql.MAX), notes ?? null);
        setClauses.push('notes = @notes');
      }

      await updateRequest.query(`
        UPDATE vehicle_overrides
        SET ${setClauses.join(', ')}
        WHERE assetnum = @assetnum
      `);
    } else {
      // INSERT
      const insertResult = await pool.request()
        .input('assetnum', sql.VarChar(30), assetnum)
        .input('category_id', sql.Int, category_id ?? null)
        .input('availability_override', sql.VarChar(30), availability_override ?? null)
        .input('override_reason', sql.NVarChar(200), override_reason ?? null)
        .input('notes', sql.NVarChar(sql.MAX), notes ?? null)
        .query(`
          INSERT INTO vehicle_overrides (assetnum, category_id, availability_override, override_reason, notes)
          OUTPUT INSERTED.id
          VALUES (@assetnum, @category_id, @availability_override, @override_reason, @notes)
        `);

      overrideId = insertResult.recordset[0].id;
    }

    // Audit log
    await logAudit({
      userId: user.id,
      action: existingResult.recordset.length > 0 ? 'UPDATE' : 'INSERT',
      entityType: 'vehicle_override',
      entityId: overrideId,
      newValues: {
        assetnum,
        category_id: category_id ?? null,
        availability_override: availability_override ?? null,
        override_reason: override_reason ?? null,
        notes: notes ?? null,
      },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return NextResponse.json({ success: true, data: { id: overrideId, assetnum } });
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error('Override upsert error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update vehicle override' }, { status: 500 });
  }
}
