import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { navItems } from '@/lib/nav-items';

// GET: Return nav items filtered by user role + DB overrides
export async function GET(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const role = authUser.role;

    // Start with default hardcoded access
    const defaults = navItems.filter(
      (item) => item.visibleTo === 'all' || item.visibleTo.includes(role)
    );

    try {
      const pool = await getPool();
      const result = await pool.request().query(
        `SELECT nav_href, role, has_access FROM nav_access WHERE role = '${role}'`
      );

      if (result.recordset.length > 0) {
        const overrides = new Map(
          result.recordset.map((r: { nav_href: string; has_access: boolean }) => [r.nav_href, r.has_access])
        );

        // Apply overrides: remove items explicitly denied, add items explicitly granted
        const finalItems = navItems.filter((item) => {
          const override = overrides.get(item.href);
          if (override !== undefined) return override;
          // Fall back to default
          return item.visibleTo === 'all' || item.visibleTo.includes(role);
        });

        return NextResponse.json({ success: true, data: finalItems });
      }
    } catch {
      // DB not available, use defaults
    }

    return NextResponse.json({ success: true, data: defaults });
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}
