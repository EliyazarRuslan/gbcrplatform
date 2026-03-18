# GBCR Platform — Sub-Project 1: Foundation Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Project scaffolding, authentication, role-based access, app shell, database connectivity, file storage, base UI components

---

## 1. Context

GBCR (Goldbell Car Rental) needs a unified vehicle booking and inspection platform to replace manual WhatsApp-based booking, paper inspection forms, and Excel tracking. The full system spans 8 sub-projects. This spec covers Sub-Project 1: Foundation — the base infrastructure that all other modules build on.

An existing prototype (`gbcr-inspection-web`) exists as a Vite + React frontend with mock data and no backend. We are starting fresh with a Next.js 16 full-stack app in a new directory (`gbcr-platform`), as decided during design review.

### Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js 16 (App Router) | Full-stack, SSR, aligns with FMS Dashboard |
| Database | MSSQL — existing `GBCR_Platform` on GBITR01V | Reuse existing server + database, same pattern as FMS |
| DB access | `mssql` npm package, direct SQL | No ORM, same as FMS Dashboard |
| Auth | Email + password, JWT in httpOnly cookie | Simple, no external SSO dependency |
| File storage | Network file share via Node.js `fs` | Existing infrastructure, no cloud dependency |
| Mobile strategy | PWA for MVP | No separate native app needed initially |
| Branches | Single branch now, schema supports multi-branch | GBCR currently has 1 branch |
| Styling | Tailwind CSS v4 | Modern utility-first CSS |
| Deployment | Intranet only | Internal staff application |

---

## 2. Project Structure

```
/Users/eliyazar/Documents/MX Project/gbcr-platform/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (html, body, providers)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx              # Centered card layout (no sidebar)
│   │   │   ├── login/
│   │   │   │   └── page.tsx            # Login page
│   │   │   └── change-password/
│   │   │       └── page.tsx            # Change password (first login + voluntary)
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # App shell (sidebar + header)
│   │   │   ├── page.tsx                # Dashboard home
│   │   │   ├── bookings/              # (Sub-project 4)
│   │   │   ├── customers/             # (Sub-project 3)
│   │   │   ├── fleet/                 # (Sub-project 2)
│   │   │   ├── inspections/           # (Sub-project 5)
│   │   │   ├── finance/               # (Sub-project 6)
│   │   │   ├── reports/               # (Sub-project 8)
│   │   │   └── settings/
│   │   │       ├── page.tsx            # Settings overview
│   │   │       └── users/
│   │   │           └── page.tsx        # User management
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts      # POST — authenticate
│   │       │   ├── logout/route.ts     # POST — clear cookie
│   │       │   ├── me/route.ts         # GET — current user
│   │       │   └── change-password/route.ts  # PUT — change own password
│   │       ├── users/
│   │       │   ├── route.ts            # GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts        # GET, PUT (update)
│   │       │       └── deactivate/route.ts  # PUT (deactivate)
│   │       └── files/
│   │           └── [...path]/route.ts  # GET — authenticated file serving
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── card.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── spinner.tsx
│   │   │   └── empty-state.tsx
│   │   └── layouts/
│   │       ├── sidebar.tsx
│   │       ├── header.tsx
│   │       └── breadcrumbs.tsx
│   ├── lib/
│   │   ├── db.ts                       # MSSQL connection pool
│   │   ├── auth.ts                     # JWT sign/verify, password hash, requireRole middleware
│   │   ├── file-storage.ts             # Network share read/write/delete
│   │   ├── audit.ts                    # Audit log helper
│   │   └── utils.ts                    # Formatters, validators, helpers
│   ├── types/
│   │   └── index.ts                    # Shared TypeScript types
│   └── middleware.ts                   # Next.js middleware — JWT verification, route protection
├── public/
│   ├── logo.svg                        # GBCR logo
│   └── manifest.json                   # PWA manifest
├── scripts/
│   ├── seed.ts                         # Node.js seed script (bcrypt hash + SQL inserts)
│   └── schema.sql                      # Foundation table DDL
├── docs/
│   └── superpowers/specs/              # Design specs
├── .env.local                          # Environment variables
├── .gitignore
├── next.config.ts
├── tailwind.config.ts              # Tailwind v4 (CSS-based config also supported)
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## 3. Database Schema

All tables created in existing `GBCR_Platform` database on `GBITR01V.goldbell.com.sg`.

**Note:** `vehicle_categories` is intentionally included in Foundation as system reference/configuration data. It contains pricing defaults that the Super Admin configures during initial setup, before any vehicles or bookings exist. The Vehicle Management sub-project (Sub-Project 2) will reference this table but not create it.

**`updated_at` convention:** All tables with `updated_at` will use application-level updates — every UPDATE query must explicitly set `updated_at = GETDATE()`. No database triggers.

### 3.1 users

| Column | Type | Constraints |
|--------|------|-------------|
| id | INT IDENTITY(1,1) | PRIMARY KEY |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| full_name | NVARCHAR(100) | NOT NULL |
| phone | VARCHAR(20) | NULL |
| role | VARCHAR(30) | NOT NULL, CHECK IN ('super_admin','branch_manager','customer_service','rental_officer','inspector','driver','finance') |
| branch_id | INT | NULL, FK → branches(id) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active', CHECK IN ('active','inactive','suspended') |
| must_change_password | BIT | NOT NULL, DEFAULT 1 |
| last_login_at | DATETIME2 | NULL |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() |

### 3.2 branches

| Column | Type | Constraints |
|--------|------|-------------|
| id | INT IDENTITY(1,1) | PRIMARY KEY |
| name | NVARCHAR(100) | NOT NULL |
| code | VARCHAR(10) | NOT NULL, UNIQUE |
| address | NVARCHAR(500) | NULL |
| phone | VARCHAR(20) | NULL |
| email | VARCHAR(255) | NULL |
| is_active | BIT | NOT NULL, DEFAULT 1 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() |

### 3.3 vehicle_categories

| Column | Type | Constraints |
|--------|------|-------------|
| id | INT IDENTITY(1,1) | PRIMARY KEY |
| name | NVARCHAR(50) | NOT NULL |
| description | NVARCHAR(200) | NULL |
| daily_rate | DECIMAL(10,2) | NULL |
| weekly_rate | DECIMAL(10,2) | NULL |
| monthly_rate | DECIMAL(10,2) | NULL |
| deposit_amount | DECIMAL(10,2) | NULL |
| free_km_per_day | INT | NOT NULL, DEFAULT 0 |
| excess_km_rate | DECIMAL(6,2) | NULL |
| sort_order | INT | NOT NULL, DEFAULT 0 |
| is_active | BIT | NOT NULL, DEFAULT 1 |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() |
| updated_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() |

### 3.4 audit_logs

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT IDENTITY(1,1) | PRIMARY KEY |
| user_id | INT | NULL, FK → users(id) |
| action | VARCHAR(50) | NOT NULL |
| entity_type | VARCHAR(50) | NOT NULL |
| entity_id | INT | NULL |
| old_values | NVARCHAR(MAX) | NULL |
| new_values | NVARCHAR(MAX) | NULL |
| ip_address | VARCHAR(45) | NULL |
| created_at | DATETIME2 | NOT NULL, DEFAULT GETDATE() |

**Index:** `IX_audit_logs_entity` on (entity_type, entity_id, created_at)

---

## 4. Authentication

### 4.1 Login Flow

1. User submits email + password to `POST /api/auth/login`
2. Server queries `users` table by email
3. Server compares password with `password_hash` using bcrypt
4. If valid and user status is `active`:
   - Generate JWT with payload: `{ userId, email, role, branchId }`
   - Set JWT as `httpOnly`, `sameSite: strict` cookie named `gbcr_token` (`secure` flag only when served over HTTPS — intranet may use HTTP)
   - Expiry: 24 hours
   - Update `last_login_at` on user record
   - Log to `audit_logs` (action: 'login')
   - Return user profile data
5. If `must_change_password` is true, response includes `mustChangePassword: true` — client redirects to change password form
6. If invalid: return 401, log failed attempt to `audit_logs`

### 4.2 Route Protection

Next.js `middleware.ts` runs on every request:
- Requests to `/login` and `/api/auth/login` — pass through
- Requests to `/api/*` — verify JWT from cookie, attach user to request headers
- Requests to `/(dashboard)/*` — verify JWT exists, redirect to `/login` if missing
- Static assets (`/_next/*`, `/favicon.ico`) — pass through

### 4.3 API Authorization

Each API route uses a `requireRole()` helper:

```typescript
// Example usage in an API route
export async function GET(request: NextRequest) {
  const user = await requireRole(request, ['super_admin', 'branch_manager'])
  // ... handler logic
}
```

If role doesn't match, returns 403 Forbidden.

### 4.4 Role Access Map

| Route Group | Allowed Roles |
|-------------|---------------|
| `/settings/users` | super_admin |
| `/api/users` | super_admin |
| `/api/auth/me` | all authenticated |
| `/api/auth/logout` | all authenticated |
| `/(dashboard)/*` | all authenticated |
| `/api/files/*` | all authenticated |

Subsequent sub-projects will add their own role restrictions.

### 4.5 Password Management

- Hash: bcrypt with 12 salt rounds
- First login: user must change temporary password
- Change password: `PUT /api/auth/change-password` — requires current password + new password
- Password reset: Super Admin resets via user management (sets new temp password + `must_change_password = true`)
- No self-registration

---

## 5. App Shell

### 5.1 Layout Structure

```
┌──────────────────────────────────────────────────┐
│  Header Bar                          [User ▼]    │
│  GBCR Platform              Ahmad · Rental Officer│
├────────────┬─────────────────────────────────────┤
│            │  Breadcrumbs: Dashboard > ...        │
│  Sidebar   │─────────────────────────────────────│
│            │                                     │
│  Dashboard │         Main Content Area           │
│  Bookings  │                                     │
│  Customers │         (page content renders here) │
│  Fleet     │                                     │
│  Inspections│                                    │
│  Finance   │                                     │
│  Reports   │                                     │
│            │                                     │
│  ──────    │                                     │
│  Settings  │                                     │
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

### 5.2 Sidebar Menu

| Menu Item | Icon | Path | Visible To |
|-----------|------|------|------------|
| Dashboard | LayoutDashboard | `/` | All |
| Bookings | CalendarDays | `/bookings` | super_admin, branch_manager, customer_service, rental_officer |
| Customers | Users | `/customers` | super_admin, branch_manager, customer_service, rental_officer |
| Fleet | Car | `/fleet` | super_admin, branch_manager, customer_service, rental_officer |
| Inspections | ClipboardCheck | `/inspections` | super_admin, branch_manager, rental_officer, inspector |
| Finance | DollarSign | `/finance` | super_admin, branch_manager, finance |
| Reports | BarChart3 | `/reports` | super_admin, branch_manager, finance |
| Settings | Settings | `/settings` | super_admin |

**Note:** The `driver` role intentionally has no sidebar menu items beyond Dashboard. Drivers will primarily use the mobile PWA for assigned tasks (delivery/collection), which will be built in Sub-Project 5 (Inspections). In Foundation, a driver who logs in sees only the Dashboard.

### 5.3 Responsive Behavior

- **Desktop (≥1024px):** Sidebar always visible (240px wide), collapsible to icon-only (64px)
- **Tablet (768-1023px):** Sidebar collapsed to icon-only by default
- **Mobile (<768px):** Sidebar hidden, hamburger menu in header opens sidebar as overlay

### 5.4 Header

- Left: GBCR logo + "GBCR Platform" text
- Right: User name, role badge, dropdown with "Profile", "Change Password", "Logout"

### 5.5 Dashboard Home Page

For Foundation, the dashboard is a placeholder landing page with:
- Welcome message with user name
- Quick stats cards (empty/zero state — will be populated by later sub-projects)
- Quick action buttons to navigate to main modules (greyed out if module not yet built)

---

## 6. UI Components

All built with Tailwind CSS v4. No external component library.

### 6.1 Component List

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | variant (primary/secondary/destructive/ghost/outline), size (sm/md/lg), loading, disabled, icon | Standard button with loading spinner state |
| `Input` | label, error, hint, type, required | Text input with label and validation display |
| `Select` | label, options, error, placeholder | Dropdown select |
| `Textarea` | label, error, rows | Multi-line text input |
| `Card` | title, description, actions, padding | Container card with optional header |
| `Modal` | open, onClose, title, size (sm/md/lg/xl) | Dialog overlay with close button |
| `Table` | columns, data, sortable, pagination, emptyMessage | Data table with sorting and pagination |
| `Badge` | variant (default/success/warning/destructive/info), size | Status indicator |
| `Toast` | message, type (success/error/warning/info), duration | Notification popup (auto-dismiss) |
| `Spinner` | size (sm/md/lg) | Loading spinner |
| `EmptyState` | icon, title, description, action | Empty data placeholder |

### 6.2 Design Tokens

| Token | Value |
|-------|-------|
| Primary color | Blue (#2563EB) |
| Success | Green (#16A34A) |
| Warning | Amber (#D97706) |
| Destructive | Red (#DC2626) |
| Background | White (#FFFFFF) |
| Sidebar background | Slate-900 (#0F172A) |
| Text primary | Slate-900 (#0F172A) |
| Text secondary | Slate-500 (#64748B) |
| Border | Slate-200 (#E2E8F0) |
| Border radius | 8px (rounded-lg) |
| Font | System font stack (Inter if available) |

---

## 7. API Patterns

### 7.1 Response Format

```typescript
// Success (single entity)
{ "success": true, "data": { "id": 1, "email": "..." } }

// Success (list with pagination)
{ "success": true, "data": [...], "pagination": { "page": 1, "pageSize": 20, "total": 42 } }

// Error
{ "success": false, "error": "Email already exists", "code": "DUPLICATE_EMAIL" }

// Validation error
{ "success": false, "error": "Validation failed", "details": [
  { "field": "email", "message": "Email is required" }
]}
```

### 7.2 Foundation API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | Public | Authenticate user |
| POST | /api/auth/logout | Authenticated | Clear session |
| GET | /api/auth/me | Authenticated | Get current user |
| PUT | /api/auth/change-password | Authenticated | Change own password |
| GET | /api/users | super_admin | List all users |
| POST | /api/users | super_admin | Create user |
| GET | /api/users/[id] | super_admin | Get user detail |
| PUT | /api/users/[id] | super_admin | Update user |
| PUT | /api/users/[id]/deactivate | super_admin | Deactivate user (sets status to 'inactive') |

### 7.3 Database Helper

```typescript
// src/lib/db.ts
import sql from 'mssql'

const config: sql.config = {
  server: process.env.DB_SERVER!,       // GBITR01V.goldbell.com.sg
  database: process.env.DB_NAME!,       // GBCR_Platform
  user: process.env.DB_USER!,           // WriteUser (needs write access)
  password: process.env.DB_PASSWORD!,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
}

let pool: sql.ConnectionPool | null = null

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool || !pool.connected) {
    pool = await sql.connect(config)
    pool.on('error', () => { pool = null })  // Reset on connection loss
  }
  return pool
}
```

### 7.4 Audit Helper

```typescript
// src/lib/audit.ts
export async function logAudit(params: {
  userId: number | null
  action: string
  entityType: string
  entityId?: number
  oldValues?: object
  newValues?: object
  ipAddress?: string
}) { /* INSERT INTO audit_logs ... */ }
```

---

## 8. File Storage

### 8.1 Configuration

```env
# .env.local
FILE_STORAGE_ROOT=\\\\server\\share\\gbcr-platform
# or local path for development: ./storage
```

### 8.2 Directory Structure

```
{FILE_STORAGE_ROOT}/
├── inspections/{inspectionId}/
│   ├── photos/
│   └── signatures/
├── customers/{customerId}/
└── documents/{bookingId}/
```

### 8.3 File API

```typescript
// src/lib/file-storage.ts
export async function saveFile(subPath: string, buffer: Buffer): Promise<string>
export async function readFile(subPath: string): Promise<Buffer>
export async function deleteFile(subPath: string): Promise<void>
export function getFilePath(subPath: string): string
```

Files served via `GET /api/files/[...path]` — authenticated, streams file from network share.

---

## 9. Environment Variables

```env
# .env.local
DB_SERVER=GBITR01V.goldbell.com.sg
DB_NAME=GBCR_Platform
DB_USER=WriteUser
DB_PASSWORD=<password>
JWT_SECRET=<random-64-char-string>
FILE_STORAGE_ROOT=./storage
NEXT_PUBLIC_APP_NAME=GBCR Platform
```

---

## 10. Seed Data

### 10.1 Default Branch

| Field | Value |
|-------|-------|
| name | GBCR Main |
| code | MAIN |
| address | (to be filled) |
| is_active | 1 |

### 10.2 Default Super Admin

| Field | Value |
|-------|-------|
| email | admin@gbcr.com |
| password | Temp password (hashed), must_change_password = 1 |
| full_name | System Administrator |
| role | super_admin |
| branch_id | 1 |
| status | active |

### 10.3 Default Vehicle Categories

| Name | Daily Rate | Weekly Rate | Monthly Rate | Deposit |
|------|-----------|------------|-------------|---------|
| Economy Sedan | 80.00 | 480.00 | 1,600.00 | 500.00 |
| Standard Sedan | 100.00 | 600.00 | 2,000.00 | 500.00 |
| Premium Sedan | 150.00 | 900.00 | 3,000.00 | 1,000.00 |
| SUV | 180.00 | 1,080.00 | 3,600.00 | 1,000.00 |
| Van | 120.00 | 720.00 | 2,400.00 | 800.00 |
| Truck (Light) | 140.00 | 840.00 | 2,800.00 | 800.00 |
| Truck (Heavy) | 200.00 | 1,200.00 | 4,000.00 | 1,500.00 |

---

## 11. PWA Configuration

Minimal PWA setup for MVP:

- `manifest.json` with app name, icons, theme color
- Service worker for basic caching (Next.js built-in or `next-pwa`)
- "Add to Home Screen" capability
- Offline page (simple "You are offline" message — full offline support in inspection sub-project)

---

## 12. What This Sub-Project Delivers

- [ ] Next.js 16 project initialized with App Router
- [ ] Tailwind CSS v4 configured
- [ ] MSSQL connection to `GBCR_Platform` database
- [ ] Foundation tables created (users, branches, vehicle_categories, audit_logs)
- [ ] Seed data inserted (admin user, branch, categories)
- [ ] Login page and authentication flow (JWT + httpOnly cookie)
- [ ] Change password flow (including first-login force change)
- [ ] Next.js middleware for route protection
- [ ] App shell: sidebar, header, breadcrumbs (responsive)
- [ ] Sidebar menu with role-based visibility
- [ ] Dashboard placeholder page
- [ ] User management page (CRUD, Super Admin only)
- [ ] 11 reusable UI components
- [ ] File storage abstraction (network share)
- [ ] Authenticated file serving endpoint
- [ ] Audit logging helper
- [ ] API response format utilities
- [ ] `.env.local` template
- [ ] PWA manifest
- [ ] Git repository initialized

## 13. What This Sub-Project Does NOT Deliver

- Customer management (Sub-Project 3)
- Vehicle management (Sub-Project 2)
- Booking management (Sub-Project 4)
- Inspections (Sub-Project 5)
- Payments and finance (Sub-Project 6)
- Documents and communication (Sub-Project 7)
- Dashboards with real data (Sub-Project 8)
- AI features (Phase 2-3)
