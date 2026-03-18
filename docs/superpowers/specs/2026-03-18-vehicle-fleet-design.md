# GBCR Platform — Sub-Project 2: Vehicle & Fleet Management Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Rewrite fleet page to show GBCR vehicles from Maximo, add vehicle_overrides table, vehicle detail/edit page

---

## 1. Context

The GBCR Platform already has a fleet page and API routes that query Maximo (MAXDB76) for GBE/HAPL/MV sites. Sub-Project 2 rewrites these to query GBCR site vehicles instead, and adds a `vehicle_overrides` table in GBCR_Platform for rental-specific data (category assignment, availability overrides, notes).

### Data Strategy

- **Source of truth for vehicle master data:** Maximo MAXDB76, `ASSET` table, `SITEID = 'GBCR'`
- **Rental-specific overrides:** `vehicle_overrides` table in GBCR_Platform database
- **Join strategy:** Fleet API queries Maximo for master data, LEFT JOINs with GBCR_Platform for overrides and category names
- **Active fleet filter:** STATUS NOT IN ('SOLD', 'DECOMMISSIONED', 'LAID UP')

### Key Maximo Columns Used

| Maximo Column | Purpose |
|---------------|---------|
| ASSETNUM | Primary identifier |
| DESCRIPTION | Vehicle description |
| STATUS | Current status (HIRED OUT, IDLE, BOOKED, NOT READY) |
| SERIALNUM | Serial number |
| gb_registrationno | Registration plate number |
| gb_vehiclemodel | Make/model |
| gb_bodycolor | Vehicle colour |
| gb_fueltype | Petrol/Diesel/Hybrid/Electric |
| gb_transmission | Auto/Manual |
| gb_enginecap | Engine capacity |
| gb_yearmfg | Year of manufacture |
| gb_vehiclechassisno | VIN/Chassis number |
| gb_insurername | Insurance provider |
| gb_insurepolicyno | Insurance policy number |
| gb_policyexpirydate | Insurance expiry |
| gb_coeexpirydate | COE expiry date |
| gb_vehseating | Seating capacity |
| gb_tonnage | Vehicle tonnage |
| PLUSPCUSTOMER | Current customer code (if hired out) |
| INSTALLDATE | Install/registration date |
| PURCHASEPRICE | Purchase price |
| CHANGEDATE | Last modified date |

---

## 2. Database Schema

### vehicle_overrides (GBCR_Platform)

| Column | Type | Constraints |
|--------|------|-------------|
| id | INT IDENTITY(1,1) | PRIMARY KEY |
| assetnum | VARCHAR(30) | NOT NULL, UNIQUE |
| category_id | INT | NULL, FK → vehicle_categories(id) |
| availability_override | VARCHAR(30) | NULL, CHECK IN ('blocked', 'reserved_vip', NULL) |
| override_reason | NVARCHAR(200) | NULL |
| notes | NVARCHAR(MAX) | NULL |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() |

When `availability_override` is set, the vehicle is treated as unavailable for booking regardless of Maximo status.

---

## 3. API Endpoints

### GET /api/fleet

Rewrite existing endpoint. Queries MAXDB76 for GBCR vehicles, cross-database joins with GBCR_Platform for overrides.

**Query params:** page, pageSize (default 50), search, status, category, statsOnly

**Stats query:** Count by status for KPI cards (HIRED OUT, NOT READY, IDLE, BOOKED).

**List query:**
- Source: MAXDB76.dbo.ASSET WHERE SITEID='GBCR' AND STATUS NOT IN ('SOLD','DECOMMISSIONED','LAID UP')
- LEFT JOIN: GBCR_Platform.dbo.vehicle_overrides ON assetnum
- LEFT JOIN: GBCR_Platform.dbo.vehicle_categories ON category_id
- Filters: search (assetnum, description, gb_registrationno, gb_vehiclemodel), status, category_id
- Pagination: OFFSET/FETCH
- All filters use parameterized queries (no string concatenation)

**Response format:**
```json
{
  "success": true,
  "data": {
    "stats": { "total": 3558, "hiredOut": 1396, "notReady": 1788, "idle": 352, "booked": 22, "utilizationRate": 39.2 },
    "vehicles": [
      {
        "assetnum": "FA-GBCR-02861",
        "description": "MAZDA CX-5 ...",
        "status": "IDLE",
        "registration_no": "SLC1401L",
        "model": "CX-5 SKYACTI-G 2.0L",
        "colour": null,
        "fuel_type": "PETROL",
        "transmission": "AUTO",
        "year_mfg": "2016",
        "chassis_no": "JM6KE1072G0363131",
        "customer_code": null,
        "category_name": "Standard Sedan",
        "category_id": 2,
        "availability_override": null,
        "override_reason": null,
        "notes": null
      }
    ],
    "pagination": { "page": 1, "pageSize": 50, "total": 3558 }
  }
}
```

### GET /api/fleet/[assetnum]

Single vehicle detail. Queries Maximo for full vehicle data + GBCR_Platform for overrides.

**Response:** Full vehicle object with all Maximo fields + override fields + category info.

### PUT /api/fleet/[assetnum]/overrides

Create or update vehicle overrides. Upserts into vehicle_overrides table.

**Auth:** requireRole — super_admin, branch_manager, rental_officer

**Body:**
```json
{
  "category_id": 2,
  "availability_override": "blocked",
  "override_reason": "Pending inspection",
  "notes": "Customer reported strange noise"
}
```

All fields optional — only updates provided fields. Sets updated_at = GETDATE().

Logs to audit_logs.

### GET /api/fleet/stats

Dedicated stats endpoint (extracted from fleet list for dashboard use).

Returns status counts + utilization rate for GBCR fleet.

---

## 4. Page Changes

### Fleet List Page (`src/app/(dashboard)/fleet/page.tsx`)

**Rewrite** to use updated API. Changes from current:

| Current | New |
|---------|-----|
| Queries GBE/HAPL/MV sites | Queries GBCR site |
| Columns: Reg No, Asset, Description, Make, Model, Status, Customer, Type, Total Cost, Last Updated | Columns: Reg No, Asset, Description, Model, Status, Category, Fuel, Transmission, Customer |
| Status filter: GBE statuses | Status filter: HIRED OUT, NOT READY, IDLE, BOOKED |
| No category filter | Category filter dropdown (from vehicle_categories) |
| Uses `gb_make` from franchise code | Uses `gb_vehiclemodel` directly |

KPI cards remain: Total Fleet, Hired Out, Not Ready, Idle, Booked, Utilization Rate.

### Vehicle Detail Page (`src/app/(dashboard)/fleet/[assetnum]/page.tsx`)

**Rewrite** to show GBCR vehicle detail with editable overrides.

**Layout:**
```
┌─────────────────────────────────────────────┐
│ ← Back to Fleet                             │
│                                             │
│ SLC1401L — MAZDA CX-5 SKYACTI-G 2.0        │
│ Status: IDLE    Category: Standard Sedan    │
├─────────────────────────────────────────────┤
│                                             │
│ Vehicle Details          │ Rental Settings  │
│ ─────────────────        │ ──────────────── │
│ Registration: SLC1401L   │ Category: [▼]    │
│ Model: CX-5 2.0L        │ Availability: [▼]│
│ Chassis: JM6KE...        │ Reason: [____]   │
│ Colour: —                │ Notes: [____]    │
│ Fuel: PETROL             │                  │
│ Transmission: AUTO       │ [Save Changes]   │
│ Year: 2016               │                  │
│ Engine: —                │                  │
│ Seating: —               │                  │
│ Tonnage: —               │                  │
│                          │                  │
│ Insurance & Compliance   │                  │
│ ─────────────────        │                  │
│ Insurer: —               │                  │
│ Policy: —                │                  │
│ Policy Expiry: —         │                  │
│ COE Expiry: —            │                  │
│                          │                  │
│ Customer: C00004908      │                  │
│ Install Date: 2016-05-03 │                  │
│ Last Updated: 2026-03-18 │                  │
└─────────────────────────────────────────────┘
```

Left side: read-only Maximo data. Right side: editable overrides (category, availability, reason, notes). Save button calls PUT /api/fleet/[assetnum]/overrides.

---

## 5. Role Access

| Action | Allowed Roles |
|--------|---------------|
| View fleet list | super_admin, branch_manager, customer_service, rental_officer |
| View vehicle detail | super_admin, branch_manager, customer_service, rental_officer |
| Edit vehicle overrides | super_admin, branch_manager, rental_officer |

---

## 6. Cross-Database Query Pattern

Since Maximo is on MAXDB76 and overrides are on GBCR_Platform (same server, different databases), queries use fully qualified table names:

```sql
-- From a MAXDB76 connection:
SELECT a.*, vo.category_id, vo.availability_override, vo.notes, vc.name as category_name
FROM ASSET a
LEFT JOIN GBCR_Platform.dbo.vehicle_overrides vo ON a.ASSETNUM = vo.assetnum
LEFT JOIN GBCR_Platform.dbo.vehicle_categories vc ON vo.category_id = vc.id
WHERE a.SITEID = 'GBCR'
```

This uses the existing `maxdb.ts` connection pool (connected to MAXDB76) and cross-references GBCR_Platform tables via `GBCR_Platform.dbo.` prefix. ReadUser has access to both databases.

---

## 7. Files Changed/Created

### New Files
| File | Purpose |
|------|---------|
| `src/app/api/fleet/[assetnum]/overrides/route.ts` | PUT — upsert vehicle overrides |
| `src/app/api/fleet/stats/route.ts` | GET — fleet stats for dashboard |

### Files to Rewrite
| File | Change |
|------|--------|
| `src/app/api/fleet/route.ts` | Rewrite: GBCR site, parameterized queries, cross-DB join, standard response format |
| `src/app/api/fleet/[assetnum]/route.ts` | Rewrite: GBCR vehicle detail with overrides |
| `src/app/(dashboard)/fleet/page.tsx` | Rewrite: GBCR columns, category filter, updated KPI cards |
| `src/app/(dashboard)/fleet/[assetnum]/page.tsx` | Rewrite: GBCR detail view with editable overrides |

### Files to Delete
| File | Reason |
|------|--------|
| `src/app/api/fleet/types/route.ts` | Replaced by category filter from vehicle_categories |
| `src/app/api/fleet/utilization/route.ts` | Merged into stats endpoint |
| `src/app/api/fleet/revenue-cost/route.ts` | GBE-specific, not needed for GBCR |

### Schema
| File | Purpose |
|------|---------|
| `scripts/schema-v2.sql` | DDL for vehicle_overrides table |

---

## 8. What This Sub-Project Delivers

- [ ] vehicle_overrides table created in GBCR_Platform
- [ ] Fleet list page showing GBCR vehicles from Maximo
- [ ] Cross-database joins (MAXDB76 + GBCR_Platform)
- [ ] Vehicle category assignment per vehicle
- [ ] Availability override (block/reserve vehicles)
- [ ] Vehicle detail page with editable rental settings
- [ ] Parameterized queries (fix SQL injection in current code)
- [ ] Standard API response format ({ success, data })
- [ ] Role-based access on override editing
- [ ] Fleet stats endpoint for dashboard
- [ ] Audit logging on override changes

## 9. What This Sub-Project Does NOT Deliver

- Vehicle CRUD (vehicles are managed in Maximo)
- Vehicle photos/gallery (Sub-Project 5 — Inspections)
- Booking integration (Sub-Project 4)
- Maintenance scheduling (future)
- GPS/tracking integration (Phase 3)
