import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';

// GET: Return current nav access config
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['super_admin']);
    const pool = await getPool();

    // Ensure table exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'nav_access')
      CREATE TABLE nav_access (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nav_href NVARCHAR(100) NOT NULL,
        role NVARCHAR(50) NOT NULL,
        has_access BIT NOT NULL DEFAULT 1,
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT UQ_nav_role UNIQUE (nav_href, role)
      )
    `);

    const result = await pool.request().query(`SELECT nav_href, role, has_access FROM nav_access`);

    return NextResponse.json({ success: true, data: result.recordset });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch nav access';
    const status = message.includes('Unauthorized') || message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

// PUT: Update nav access config (bulk)
export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireRole(request, ['super_admin']);
    const body = await request.json();
    const { updates } = body as { updates: Array<{ nav_href: string; role: string; has_access: boolean }> };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const pool = await getPool();

    // Ensure table exists
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'nav_access')
      CREATE TABLE nav_access (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nav_href NVARCHAR(100) NOT NULL,
        role NVARCHAR(50) NOT NULL,
        has_access BIT NOT NULL DEFAULT 1,
        updated_at DATETIME2 DEFAULT GETDATE(),
        CONSTRAINT UQ_nav_role UNIQUE (nav_href, role)
      )
    `);

    for (const update of updates) {
      await pool.request()
        .input('nav_href', sql.NVarChar(100), update.nav_href)
        .input('role', sql.NVarChar(50), update.role)
        .input('has_access', sql.Bit, update.has_access ? 1 : 0)
        .query(`
          MERGE nav_access AS target
          USING (SELECT @nav_href AS nav_href, @role AS role) AS source
          ON target.nav_href = source.nav_href AND target.role = source.role
          WHEN MATCHED THEN
            UPDATE SET has_access = @has_access, updated_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (nav_href, role, has_access) VALUES (@nav_href, @role, @has_access);
        `);
    }

    await logAudit({
      userId: authUser.userId,
      action: 'UPDATE_NAV_ACCESS',
      details: `Updated ${updates.length} nav access rules`,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update nav access';
    const status = message.includes('Unauthorized') || message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
