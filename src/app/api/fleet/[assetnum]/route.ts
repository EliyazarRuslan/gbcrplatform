import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { getMaxPool, sql as maxSql } from '@/lib/maxdb';

export async function GET(req: NextRequest, { params }: { params: Promise<{ assetnum: string }> }) {
  try {
    const { assetnum } = await params;

    // Query Fabric for asset data
    const maxPool = await getMaxPool();
    const result = await maxPool.request()
      .input('assetnum', maxSql.VarChar(30), assetnum)
      .input('siteid', maxSql.VarChar(10), 'GBCR')
      .query(`
        SELECT
          a.assetnum,
          a.description,
          a.status,
          a.siteid,
          a.pluspcustomer        AS customer_code,
          a.gb_assetregistrationno   AS registration_no,
          a.gb_vehiclemodel     AS model,
          a.gb_bodycolor        AS colour,
          a.gb_fueltype         AS fuel_type,
          a.gb_transmission     AS transmission,
          a.gb_vehenginecapacity AS engine_capacity,
          a.gb_yearmfg          AS year_mfg,
          a.gb_vehiclechassisno AS chassis_no,
          a.gb_insurername      AS insurer,
          a.gb_insurepolicyno   AS policy_no,
          a.gb_policyexpirydate AS policy_expiry,
          a.gb_coeexpirydate    AS coe_expiry,
          a.gb_vehseating       AS seating,
          a.gb_tonnage          AS tonnage,
          a.installdate          AS install_date,
          a.purchaseprice        AS purchase_price,
          a.changedate           AS change_date
        FROM asset a
        WHERE (a.assetnum = @assetnum OR a.gb_assetregistrationno = @assetnum)
          AND a.siteid = @siteid
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }

    const vehicle = result.recordset[0];

    // Query GBCR_Platform (GBITR01V) for overrides
    const dbPool = await getPool();
    const ovResult = await dbPool.request()
      .input('assetnum', sql.VarChar(30), vehicle.assetnum)
      .query(`
        SELECT vo.id AS override_id, vo.category_id,
          vc.name AS category_name,
          vo.availability_override, vo.override_reason, vo.notes
        FROM vehicle_overrides vo
        LEFT JOIN vehicle_categories vc ON vc.id = vo.category_id
        WHERE vo.assetnum = @assetnum
      `);

    const override = ovResult.recordset[0] || {};

    return NextResponse.json({
      success: true,
      data: {
        ...vehicle,
        override_id: override.override_id ?? null,
        category_id: override.category_id ?? null,
        category_name: override.category_name ?? null,
        availability_override: override.availability_override ?? null,
        override_reason: override.override_reason ?? null,
        notes: override.notes ?? null,
      },
    });
  } catch (error: unknown) {
    console.error('Vehicle detail error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch vehicle details' }, { status: 500 });
  }
}
