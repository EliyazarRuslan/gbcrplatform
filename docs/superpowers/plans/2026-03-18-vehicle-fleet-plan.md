# Vehicle & Fleet Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite fleet pages and APIs to show GBCR vehicles from Maximo with rental-specific overrides (category, availability, notes).

**Architecture:** Fleet data comes from Maximo MAXDB76 (ASSET table, SITEID='GBCR'). Rental overrides stored in GBCR_Platform.vehicle_overrides. Cross-database joins via fully qualified table names. Read queries use maxdb pool, write queries use db pool.

**Tech Stack:** Next.js 16, MSSQL (mssql npm), TanStack Table, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-18-vehicle-fleet-design.md`

---

## File Map

### New Files
| File | Responsibility |
|------|---------------|
| `scripts/schema-v2.sql` | DDL for vehicle_overrides table |
| `src/app/api/fleet/stats/route.ts` | GET — fleet stats for dashboard |
| `src/app/api/fleet/[assetnum]/overrides/route.ts` | PUT — upsert vehicle overrides |

### Files to Rewrite
| File | Change |
|------|--------|
| `src/lib/maxdb.ts` | Add reconnection logic |
| `src/app/api/fleet/route.ts` | GBCR site, parameterized queries, cross-DB joins |
| `src/app/api/fleet/[assetnum]/route.ts` | GBCR vehicle detail with overrides |
| `src/app/(dashboard)/fleet/page.tsx` | GBCR columns, category filter, updated KPIs |
| `src/app/(dashboard)/fleet/[assetnum]/page.tsx` | GBCR detail view with editable overrides |
| `src/app/(dashboard)/page.tsx` | Update dashboard to use /api/fleet/stats |

### Files to Delete
| File | Reason |
|------|--------|
| `src/app/api/fleet/types/route.ts` | Replaced by category filter |
| `src/app/api/fleet/utilization/route.ts` | Merged into stats |
| `src/app/api/fleet/revenue-cost/route.ts` | GBE-specific |

---

## Task 1: Database Schema & maxdb Fix

**Files:**
- Create: `scripts/schema-v2.sql`
- Modify: `src/lib/maxdb.ts`

- [ ] **Step 1: Create schema-v2.sql**

```sql
-- Vehicle overrides for GBCR Platform
-- Run against GBCR_Platform database on GBITR01V

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vehicle_overrides')
CREATE TABLE vehicle_overrides (
  id INT IDENTITY(1,1) PRIMARY KEY,
  assetnum VARCHAR(30) NOT NULL UNIQUE,
  category_id INT NULL REFERENCES vehicle_categories(id),
  availability_override VARCHAR(30) NULL CHECK (availability_override IN ('blocked', 'reserved_vip')),
  override_reason NVARCHAR(200) NULL,
  notes NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_vehicle_overrides_category')
CREATE INDEX IX_vehicle_overrides_category ON vehicle_overrides (category_id);
```

- [ ] **Step 2: Run schema against GBCR_Platform**

```bash
cd "/Users/eliyazar/Documents/MX Project/gbcr-platform"
DB_USER=ReadUser DB_PASSWORD=G0ldBell123 npx tsx -e "
import sql from 'mssql';
import fs from 'fs';
const config = { server: 'GBITR01V.goldbell.com.sg', database: 'GBCR_Platform', user: 'ReadUser', password: 'G0ldBell123', port: 1433, options: { encrypt: false, trustServerCertificate: true } };
const pool = await sql.connect(config);
const schema = fs.readFileSync('scripts/schema-v2.sql', 'utf8');
await pool.request().query(schema);
console.log('Schema v2 applied');
await pool.close();
"
```

- [ ] **Step 3: Fix maxdb.ts reconnection**

Update `src/lib/maxdb.ts` to add reconnection handling (same pattern as `src/lib/db.ts`):

```typescript
import sql from 'mssql';

const config: sql.config = {
  server: process.env.MAXDB_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.MAXDB_DATABASE || 'MAXDB76',
  user: process.env.MAXDB_USER || 'ReadUser',
  password: process.env.MAXDB_PASSWORD || '',
  port: parseInt(process.env.MAXDB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let pool: sql.ConnectionPool | null = null;

export async function getMaxPool(): Promise<sql.ConnectionPool> {
  if (!pool || !pool.connected) {
    pool = await sql.connect(config);
    pool.on('error', () => { pool = null; });
  }
  return pool;
}

export { sql };
```

- [ ] **Step 4: Commit**

```bash
git add scripts/schema-v2.sql src/lib/maxdb.ts
git commit -m "feat: add vehicle_overrides schema and fix maxdb reconnection

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Fleet Stats API & Delete Old Endpoints

**Files:**
- Create: `src/app/api/fleet/stats/route.ts`
- Delete: `src/app/api/fleet/types/route.ts`
- Delete: `src/app/api/fleet/utilization/route.ts`
- Delete: `src/app/api/fleet/revenue-cost/route.ts`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create fleet stats endpoint**

Create `src/app/api/fleet/stats/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getMaxPool } from '@/lib/maxdb';

export async function GET() {
  try {
    const pool = await getMaxPool();

    const result = await pool.request().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN STATUS = 'HIRED OUT' THEN 1 ELSE 0 END) as hiredOut,
        SUM(CASE WHEN STATUS = 'NOT READY' THEN 1 ELSE 0 END) as notReady,
        SUM(CASE WHEN STATUS = 'IDLE' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN STATUS = 'BOOKED' THEN 1 ELSE 0 END) as booked
      FROM ASSET
      WHERE SITEID = 'GBCR'
        AND STATUS NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')
    `);

    const stats = result.recordset[0];
    stats.utilizationRate = stats.total > 0
      ? parseFloat(((stats.hiredOut / stats.total) * 100).toFixed(1))
      : 0;

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Fleet stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch fleet stats' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update dashboard to use /api/fleet/stats**

In `src/app/(dashboard)/page.tsx`, change the fetch URL from `/api/fleet?statsOnly=true` to `/api/fleet/stats`, and update response handling to use `data.data` (standard format):

Change line ~27:
```typescript
// Old:
fetch('/api/fleet?statsOnly=true')
  .then((res) => res.json())
  .then((data) => { setStats(data.stats); setLoading(false); })

// New:
fetch('/api/fleet/stats')
  .then((res) => res.json())
  .then((data) => { setStats(data.data); setLoading(false); })
```

- [ ] **Step 3: Delete old API endpoints**

```bash
cd "/Users/eliyazar/Documents/MX Project/gbcr-platform"
rm -rf src/app/api/fleet/types
rm -rf src/app/api/fleet/utilization
rm -rf src/app/api/fleet/revenue-cost
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add fleet stats endpoint, update dashboard, remove GBE-specific APIs

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Rewrite Fleet List API

**Files:**
- Rewrite: `src/app/api/fleet/route.ts`

- [ ] **Step 1: Rewrite fleet list API**

Replace `src/app/api/fleet/route.ts` entirely. The new version:

- Queries MAXDB76 ASSET table with SITEID='GBCR'
- Excludes SOLD, DECOMMISSIONED, LAID UP
- LEFT JOINs GBCR_Platform.dbo.vehicle_overrides and vehicle_categories
- Uses parameterized queries (NOT string concatenation)
- Supports filters: search, status, category (by category_id)
- Returns standard response format with stats + vehicles + pagination

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getMaxPool, sql } from '@/lib/maxdb';

export async function GET(request: NextRequest) {
  try {
    const pool = await getMaxPool();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const offset = (page - 1) * pageSize;

    // Stats
    const statsResult = await pool.request().query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN STATUS = 'HIRED OUT' THEN 1 ELSE 0 END) as hiredOut,
        SUM(CASE WHEN STATUS = 'NOT READY' THEN 1 ELSE 0 END) as notReady,
        SUM(CASE WHEN STATUS = 'IDLE' THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN STATUS = 'BOOKED' THEN 1 ELSE 0 END) as booked
      FROM ASSET
      WHERE SITEID = 'GBCR'
        AND STATUS NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')
    `);
    const stats = statsResult.recordset[0];
    stats.utilizationRate = stats.total > 0
      ? parseFloat(((stats.hiredOut / stats.total) * 100).toFixed(1))
      : 0;

    // Build WHERE
    const conditions: string[] = [
      "a.SITEID = 'GBCR'",
      "a.STATUS NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')",
    ];
    const req = pool.request();

    if (search) {
      conditions.push(`(a.ASSETNUM LIKE @search OR a.DESCRIPTION LIKE @search OR a.gb_registrationno LIKE @search OR a.gb_vehiclemodel LIKE @search)`);
      req.input('search', sql.NVarChar, `%${search}%`);
    }
    if (status) {
      conditions.push('a.STATUS = @status');
      req.input('status', sql.NVarChar, status);
    }
    if (category) {
      conditions.push('vo.category_id = @category');
      req.input('category', sql.Int, parseInt(category));
    }

    const whereClause = conditions.join(' AND ');

    // Count
    const countReq = pool.request();
    if (search) countReq.input('search', sql.NVarChar, `%${search}%`);
    if (status) countReq.input('status', sql.NVarChar, status);
    if (category) countReq.input('category', sql.Int, parseInt(category));
    const countResult = await countReq.query(`
      SELECT COUNT(*) as total
      FROM ASSET a
      LEFT JOIN GBCR_Platform.dbo.vehicle_overrides vo ON a.ASSETNUM = vo.assetnum
      WHERE ${whereClause}
    `);
    const total = countResult.recordset[0].total;

    // List
    req.input('offset', sql.Int, offset);
    req.input('pageSize', sql.Int, pageSize);
    const result = await req.query(`
      SELECT
        a.ASSETNUM as assetnum,
        a.DESCRIPTION as description,
        a.STATUS as status,
        a.gb_registrationno as registration_no,
        a.gb_vehiclemodel as model,
        a.gb_bodycolor as colour,
        a.gb_fueltype as fuel_type,
        a.gb_transmission as transmission,
        a.gb_yearmfg as year_mfg,
        a.gb_vehiclechassisno as chassis_no,
        a.PLUSPCUSTOMER as customer_code,
        a.CHANGEDATE as change_date,
        vo.category_id,
        vc.name as category_name,
        vo.availability_override,
        vo.override_reason,
        vo.notes
      FROM ASSET a
      LEFT JOIN GBCR_Platform.dbo.vehicle_overrides vo ON a.ASSETNUM = vo.assetnum
      LEFT JOIN GBCR_Platform.dbo.vehicle_categories vc ON vo.category_id = vc.id
      WHERE ${whereClause}
      ORDER BY a.CHANGEDATE DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        vehicles: result.recordset,
        pagination: { page, pageSize, total },
      },
    });
  } catch (error) {
    console.error('Fleet API error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch fleet data' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the API works**

```bash
curl http://localhost:3000/api/fleet?pageSize=5
```

Should return GBCR vehicles with category/override data.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/fleet/route.ts
git commit -m "feat: rewrite fleet list API for GBCR site with cross-DB joins

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Rewrite Vehicle Detail API + Overrides API

**Files:**
- Rewrite: `src/app/api/fleet/[assetnum]/route.ts`
- Create: `src/app/api/fleet/[assetnum]/overrides/route.ts`

- [ ] **Step 1: Rewrite vehicle detail API**

Replace `src/app/api/fleet/[assetnum]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getMaxPool, sql } from '@/lib/maxdb';

export async function GET(request: NextRequest, { params }: { params: Promise<{ assetnum: string }> }) {
  try {
    const { assetnum } = await params;
    const pool = await getMaxPool();

    const result = await pool.request()
      .input('assetnum', sql.NVarChar, assetnum)
      .query(`
        SELECT
          a.ASSETNUM as assetnum,
          a.DESCRIPTION as description,
          a.STATUS as status,
          a.SERIALNUM as serial_no,
          a.gb_registrationno as registration_no,
          a.gb_vehiclemodel as model,
          a.gb_bodycolor as colour,
          a.gb_fueltype as fuel_type,
          a.gb_transmission as transmission,
          a.gb_enginecap as engine_capacity,
          a.gb_yearmfg as year_mfg,
          a.gb_vehiclechassisno as chassis_no,
          a.gb_insurername as insurer,
          a.gb_insurepolicyno as policy_no,
          a.gb_policyexpirydate as policy_expiry,
          a.gb_coeexpirydate as coe_expiry,
          a.gb_vehseating as seating,
          a.gb_tonnage as tonnage,
          a.PLUSPCUSTOMER as customer_code,
          a.INSTALLDATE as install_date,
          a.PURCHASEPRICE as purchase_price,
          a.CHANGEDATE as change_date,
          vo.id as override_id,
          vo.category_id,
          vc.name as category_name,
          vo.availability_override,
          vo.override_reason,
          vo.notes
        FROM ASSET a
        LEFT JOIN GBCR_Platform.dbo.vehicle_overrides vo ON a.ASSETNUM = vo.assetnum
        LEFT JOIN GBCR_Platform.dbo.vehicle_categories vc ON vo.category_id = vc.id
        WHERE a.ASSETNUM = @assetnum AND a.SITEID = 'GBCR'
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Vehicle detail error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch vehicle details' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create overrides API**

Create `src/app/api/fleet/[assetnum]/overrides/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { getMaxPool, sql as maxSql } from '@/lib/maxdb';
import { logAudit } from '@/lib/audit';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ assetnum: string }> }) {
  try {
    const user = await requireRole(request, ['super_admin', 'branch_manager', 'rental_officer']);
    const { assetnum } = await params;
    const body = await request.json();
    const { category_id, availability_override, override_reason, notes } = body;

    // Validate availability_override value
    if (availability_override !== undefined && availability_override !== null &&
        !['blocked', 'reserved_vip'].includes(availability_override)) {
      return NextResponse.json(
        { success: false, error: 'availability_override must be "blocked", "reserved_vip", or null' },
        { status: 400 }
      );
    }

    // Verify asset exists in Maximo
    const maxPool = await getMaxPool();
    const assetCheck = await maxPool.request()
      .input('assetnum', maxSql.NVarChar, assetnum)
      .query("SELECT ASSETNUM FROM ASSET WHERE ASSETNUM = @assetnum AND SITEID = 'GBCR'");

    if (assetCheck.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'Vehicle not found in Maximo' }, { status: 404 });
    }

    // Upsert into vehicle_overrides
    const pool = await getPool();

    // Check if override exists
    const existing = await pool.request()
      .input('assetnum', sql.VarChar, assetnum)
      .query('SELECT id FROM vehicle_overrides WHERE assetnum = @assetnum');

    let overrideId: number;

    if (existing.recordset.length > 0) {
      overrideId = existing.recordset[0].id;
      const updates: string[] = ['updated_at = GETDATE()'];
      const req = pool.request().input('assetnum', sql.VarChar, assetnum);

      if (category_id !== undefined) {
        updates.push('category_id = @category_id');
        req.input('category_id', sql.Int, category_id);
      }
      if (availability_override !== undefined) {
        updates.push('availability_override = @availability_override');
        req.input('availability_override', sql.VarChar, availability_override);
      }
      if (override_reason !== undefined) {
        updates.push('override_reason = @override_reason');
        req.input('override_reason', sql.NVarChar, override_reason);
      }
      if (notes !== undefined) {
        updates.push('notes = @notes');
        req.input('notes', sql.NVarChar, notes);
      }

      await req.query(`UPDATE vehicle_overrides SET ${updates.join(', ')} WHERE assetnum = @assetnum`);
    } else {
      const result = await pool.request()
        .input('assetnum', sql.VarChar, assetnum)
        .input('category_id', sql.Int, category_id || null)
        .input('availability_override', sql.VarChar, availability_override || null)
        .input('override_reason', sql.NVarChar, override_reason || null)
        .input('notes', sql.NVarChar, notes || null)
        .query(`INSERT INTO vehicle_overrides (assetnum, category_id, availability_override, override_reason, notes)
                OUTPUT INSERTED.id
                VALUES (@assetnum, @category_id, @availability_override, @override_reason, @notes)`);
      overrideId = result.recordset[0].id;
    }

    await logAudit({
      userId: user.userId,
      action: existing.recordset.length > 0 ? 'update' : 'create',
      entityType: 'vehicle_override',
      entityId: overrideId,
      newValues: { assetnum, category_id, availability_override, override_reason, notes },
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ success: true, data: { id: overrideId, assetnum } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('Override update error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update overrides' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/fleet/
git commit -m "feat: rewrite vehicle detail API and add overrides endpoint

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Rewrite Fleet List Page

**Files:**
- Rewrite: `src/app/(dashboard)/fleet/page.tsx`

- [ ] **Step 1: Rewrite fleet page**

Replace `src/app/(dashboard)/fleet/page.tsx`. Key changes:
- Fetch from updated API (response format: `data.data.vehicles`, `data.data.stats`, `data.data.pagination`)
- Columns: Reg No (link to detail), Asset, Description, Model, Status, Category, Fuel, Transmission, Customer
- KPI cards: Total Fleet, Hired Out, Not Ready, Idle, Booked, Utilization Rate
- Filters: search input, status dropdown (HIRED OUT, NOT READY, IDLE, BOOKED), category dropdown (fetched from vehicle_categories or extracted from stats)
- Use TanStack Table (already installed)
- StatusBadge for status column
- Badge for category column (if assigned)
- Pagination controls

The page should fetch vehicle categories from the API for the category filter dropdown. Since we don't have a dedicated categories API yet, fetch them inline:
```typescript
// Fetch categories for filter
fetch('/api/fleet/categories') // We'll use a simple inline approach instead
```

Actually, simpler: just add the categories as a static list matching the seeded data, or fetch from `/api/fleet` response. For now, hardcode the category filter options from the seed data — a categories API can be added later.

Alternatively, fetch categories from the existing data: the fleet API response includes `category_name` on vehicles that have overrides. For the filter, we can use a simple API call. Let's keep it simple and add a small categories fetch in the fleet page.

Create a minimal categories endpoint or just query directly. Simplest: add a useEffect that fetches categories from GBCR_Platform:

```typescript
// In the fleet page, fetch categories for filter
useEffect(() => {
  fetch('/api/fleet/stats') // just for categories, or create a tiny endpoint
}, []);
```

Actually the simplest approach: hardcode the category options matching the seed data. They rarely change. This avoids another API call.

```typescript
const categoryOptions = [
  { label: 'All Categories', value: '' },
  { label: 'Economy Sedan', value: '1' },
  { label: 'Standard Sedan', value: '2' },
  { label: 'Premium Sedan', value: '3' },
  { label: 'SUV', value: '4' },
  { label: 'Van', value: '5' },
  { label: 'Truck (Light)', value: '6' },
  { label: 'Truck (Heavy)', value: '7' },
];
```

The fleet page should follow the same patterns as the existing page (TanStack Table, StatCard for KPIs, SkeletonTable for loading) but with updated columns and data source.

- [ ] **Step 2: Verify page loads**

Open http://localhost:3000/fleet — should show GBCR vehicles with category/override columns.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/fleet/page.tsx
git commit -m "feat: rewrite fleet list page for GBCR vehicles

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Rewrite Vehicle Detail Page

**Files:**
- Rewrite: `src/app/(dashboard)/fleet/[assetnum]/page.tsx`

- [ ] **Step 1: Rewrite vehicle detail page**

Replace `src/app/(dashboard)/fleet/[assetnum]/page.tsx`. The new page:

- Fetches from `GET /api/fleet/{assetnum}` (response: `data.data`)
- Two-column layout on desktop (single column mobile):
  - **Left:** Read-only Maximo data (registration, model, chassis, colour, fuel, transmission, year, engine, seating, tonnage, insurer, policy, policy expiry, COE expiry, customer, install date, last updated)
  - **Right:** Editable overrides card with:
    - Category dropdown (Select component from UI library)
    - Availability override dropdown: None, Blocked, Reserved VIP
    - Override reason (Input, shown when availability_override is set)
    - Notes (Textarea)
    - Save button (calls PUT /api/fleet/{assetnum}/overrides)
    - Success/error feedback
- Back link to /fleet
- Title: registration_no or assetnum + description
- Status badge + category badge in header
- Uses Card component for sections
- Uses Input, Select, Textarea, Button from UI library
- 'use client' component

Override editing should only show Save button when form data has changed from the loaded values.

- [ ] **Step 2: Verify page loads and override saving works**

1. Navigate to /fleet
2. Click on a vehicle
3. Should show detail page with Maximo data on left
4. Select a category, add notes, click Save
5. Refresh — should persist

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/fleet/\[assetnum\]/page.tsx
git commit -m "feat: rewrite vehicle detail page with editable overrides

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Schema + maxdb fix | scripts/schema-v2.sql, src/lib/maxdb.ts |
| 2 | Stats API + cleanup | src/app/api/fleet/stats/route.ts, dashboard page |
| 3 | Fleet list API rewrite | src/app/api/fleet/route.ts |
| 4 | Vehicle detail + overrides API | src/app/api/fleet/[assetnum]/route.ts, overrides/route.ts |
| 5 | Fleet list page rewrite | src/app/(dashboard)/fleet/page.tsx |
| 6 | Vehicle detail page rewrite | src/app/(dashboard)/fleet/[assetnum]/page.tsx |
