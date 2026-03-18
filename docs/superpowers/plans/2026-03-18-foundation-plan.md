# Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authentication, role-based access, user management, and reusable UI components to the existing GBCR Platform Next.js app.

**Architecture:** The existing app has pages (Dashboard, Fleet, Bookings, Services, Customers, Analytics, AI), a Sidebar, Header, DB connection (`platformdb.ts`), and UI components. We restructure into `(auth)` and `(dashboard)` route groups, add JWT-based auth with middleware, role-based sidebar visibility, user management, and a library of reusable UI components. Existing pages and functionality are preserved.

**Tech Stack:** Next.js 16 (App Router), MSSQL (`mssql` npm), bcryptjs, jose (Edge-compatible JWT), Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-18-foundation-design.md`

**Existing codebase key files:**
- `src/app/layout.tsx` — Root layout (has Sidebar + Header, no auth)
- `src/app/page.tsx` — Dashboard page (fleet stats)
- `src/components/layout/Sidebar.tsx` — Hardcoded nav, no role filtering
- `src/components/layout/Header.tsx` — Breadcrumbs + search, no user info
- `src/lib/platformdb.ts` — MSSQL connection pool (ReadUser)
- `src/lib/utils.ts` — formatCurrency, formatDate, cn, statusColor
- `src/lib/types.ts` — Vehicle, Booking, Customer, AI types
- `src/components/ui/Toast.tsx` — Toast provider + hook (keep as-is)
- `src/components/ui/StatCard.tsx` — KPI card (keep as-is)
- `src/components/ui/StatusBadge.tsx` — Status badge (keep as-is)
- `src/components/ui/Skeleton.tsx` — Loading skeletons (keep as-is)
- `src/components/ui/InlineEdit.tsx` — Inline edit field (keep as-is)
- `src/app/globals.css` — Tailwind v4 theme tokens + animations
- `.env.local` — Has PLATFORM_* vars (ReadUser), needs WriteUser + JWT_SECRET

---

## File Map

### New Files to Create

| File | Responsibility |
|------|---------------|
| `src/lib/db.ts` | Write-capable MSSQL pool (WriteUser) for auth/user operations |
| `src/lib/auth.ts` | JWT sign/verify, bcrypt hash/compare, requireRole helper, getUser helper |
| `src/lib/audit.ts` | Insert into audit_logs table |
| `src/lib/file-storage.ts` | Read/write/delete files on network share |
| `src/middleware.ts` | Next.js middleware — JWT check, route protection, redirect to login |
| `src/types/auth.ts` | User, AuthUser, Role types |
| `src/app/(auth)/layout.tsx` | Centered card layout for login/change-password (no sidebar) |
| `src/app/(auth)/login/page.tsx` | Login form page |
| `src/app/(auth)/change-password/page.tsx` | Change password page |
| `src/app/(dashboard)/layout.tsx` | App shell with Sidebar + Header (auth-aware) |
| `src/app/(dashboard)/settings/page.tsx` | Settings overview page |
| `src/app/(dashboard)/settings/users/page.tsx` | User management CRUD page |
| `src/app/api/auth/login/route.ts` | POST — authenticate, set JWT cookie |
| `src/app/api/auth/logout/route.ts` | POST — clear JWT cookie |
| `src/app/api/auth/me/route.ts` | GET — return current user from JWT |
| `src/app/api/auth/change-password/route.ts` | PUT — change own password |
| `src/app/api/users/route.ts` | GET (list), POST (create) |
| `src/app/api/users/[id]/route.ts` | GET, PUT (update) |
| `src/app/api/users/[id]/deactivate/route.ts` | PUT — set status to inactive |
| `src/app/api/files/[...path]/route.ts` | GET — authenticated file serving |
| `src/components/ui/button.tsx` | Button component |
| `src/components/ui/input.tsx` | Input with label and error |
| `src/components/ui/select.tsx` | Select dropdown |
| `src/components/ui/textarea.tsx` | Textarea with label |
| `src/components/ui/card.tsx` | Card container |
| `src/components/ui/modal.tsx` | Modal/dialog overlay |
| `src/components/ui/data-table.tsx` | Data table with sort + pagination |
| `src/components/ui/badge.tsx` | Generic badge (replaces StatusBadge for new code) |
| `src/components/ui/spinner.tsx` | Loading spinner |
| `src/components/ui/empty-state.tsx` | Empty state placeholder |
| `scripts/schema.sql` | DDL for foundation tables |
| `scripts/seed.ts` | Node.js seed script (bcrypt + SQL) |
| `public/manifest.json` | PWA manifest |

### Files to Modify

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Strip Sidebar/Header (moved to dashboard layout), keep as minimal root |
| `src/components/layout/Sidebar.tsx` | Add role-based menu filtering, receive user prop |
| `src/components/layout/Header.tsx` | Replace search with user info + dropdown |
| `.env.local` | Add DB_* (WriteUser), JWT_SECRET, FILE_STORAGE_ROOT |
| `package.json` | Add bcryptjs, jsonwebtoken, zustand deps |

### Files to Move (route group restructure)

All existing pages move into the `(dashboard)` group:
- `src/app/page.tsx` → `src/app/(dashboard)/page.tsx`
- `src/app/fleet/` → `src/app/(dashboard)/fleet/`
- `src/app/bookings/` → `src/app/(dashboard)/bookings/`
- `src/app/services/` → `src/app/(dashboard)/services/`
- `src/app/customers/` → `src/app/(dashboard)/customers/`
- `src/app/analytics/` → `src/app/(dashboard)/analytics/`
- `src/app/ai/` → `src/app/(dashboard)/ai/`
- `src/app/globals.css` stays at `src/app/globals.css` (root level)
- `src/app/favicon.ico` stays at `src/app/favicon.ico` (root level)
- API routes stay at `src/app/api/` (not inside route groups)

---

## Task 1: Install Dependencies & Environment Setup

**Files:**
- Modify: `package.json`
- Modify: `.env.local`
- Create: `.env.example`

- [ ] **Step 1: Install auth dependencies**

```bash
cd "/Users/eliyazar/Documents/MX Project/gbcr-platform"
npm install bcryptjs jose
npm install -D @types/bcryptjs tsx
```

- [ ] **Step 2: Update .env.local with auth variables**

Add these lines to the existing `.env.local` (keep existing MAXDB/PLATFORM/OPENAI vars):

```env
# Auth & Write DB
DB_SERVER=GBITR01V.goldbell.com.sg
DB_NAME=GBCR_Platform
DB_USER=WriteUser
DB_PASSWORD=<ask user for WriteUser password>
DB_PORT=1433
JWT_SECRET=gbcr-platform-jwt-secret-change-in-production-2026
FILE_STORAGE_ROOT=./storage
```

- [ ] **Step 3: Create .env.example**

```env
# Maximo DB (read-only)
MAXDB_SERVER=GBITR01V.goldbell.com.sg
MAXDB_DATABASE=MAXDB76
MAXDB_USER=ReadUser
MAXDB_PASSWORD=
MAXDB_PORT=1433

# GBCR Platform DB (read-only queries)
PLATFORM_SERVER=GBITR01V.goldbell.com.sg
PLATFORM_DATABASE=GBCR_Platform
PLATFORM_USER=ReadUser
PLATFORM_PASSWORD=
PLATFORM_PORT=1433

# GBCR Platform DB (write operations - auth, users)
DB_SERVER=GBITR01V.goldbell.com.sg
DB_NAME=GBCR_Platform
DB_USER=WriteUser
DB_PASSWORD=
DB_PORT=1433

# Auth
JWT_SECRET=

# File Storage
FILE_STORAGE_ROOT=./storage

# OpenAI
OPENAI_API_KEY=

# Socket
SOCKET_PORT=3002
```

- [ ] **Step 4: Create storage directory**

```bash
mkdir -p storage
echo "storage/" >> .gitignore
```

- [ ] **Step 5: Verify git repo is initialized**

The project should already have a git repo. If not:
```bash
git init
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore
git commit -m "feat: add auth dependencies and environment config"
```

---

## Task 2: Database Schema & Seed Script

**Files:**
- Create: `scripts/schema.sql`
- Create: `scripts/seed.ts`

- [ ] **Step 1: Create schema.sql**

```sql
-- Foundation tables for GBCR Platform
-- Run against GBCR_Platform database on GBITR01V

-- Branches
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'branches')
CREATE TABLE branches (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  address NVARCHAR(500) NULL,
  phone VARCHAR(20) NULL,
  email VARCHAR(255) NULL,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Users
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
CREATE TABLE users (
  id INT IDENTITY(1,1) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name NVARCHAR(100) NOT NULL,
  phone VARCHAR(20) NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin','branch_manager','customer_service','rental_officer','inspector','driver','finance')),
  branch_id INT NULL REFERENCES branches(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  must_change_password BIT NOT NULL DEFAULT 1,
  last_login_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Vehicle Categories
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'vehicle_categories')
CREATE TABLE vehicle_categories (
  id INT IDENTITY(1,1) PRIMARY KEY,
  name NVARCHAR(50) NOT NULL,
  description NVARCHAR(200) NULL,
  daily_rate DECIMAL(10,2) NULL,
  weekly_rate DECIMAL(10,2) NULL,
  monthly_rate DECIMAL(10,2) NULL,
  deposit_amount DECIMAL(10,2) NULL,
  free_km_per_day INT NOT NULL DEFAULT 0,
  excess_km_rate DECIMAL(6,2) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BIT NOT NULL DEFAULT 1,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
  updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Audit Logs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'audit_logs')
CREATE TABLE audit_logs (
  id BIGINT IDENTITY(1,1) PRIMARY KEY,
  user_id INT NULL REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT NULL,
  old_values NVARCHAR(MAX) NULL,
  new_values NVARCHAR(MAX) NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Index for audit log queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_audit_logs_entity')
CREATE INDEX IX_audit_logs_entity ON audit_logs (entity_type, entity_id, created_at);
```

- [ ] **Step 2: Create seed.ts**

```typescript
// scripts/seed.ts
// Usage: npx tsx scripts/seed.ts

import sql from 'mssql';
import bcrypt from 'bcryptjs';

const config: sql.config = {
  server: process.env.DB_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.DB_NAME || 'GBCR_Platform',
  user: process.env.DB_USER || 'WriteUser',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: { encrypt: false, trustServerCertificate: true },
};

async function seed() {
  const pool = await sql.connect(config);

  // Seed branch
  const branchExists = await pool.request()
    .query("SELECT id FROM branches WHERE code = 'MAIN'");
  if (branchExists.recordset.length === 0) {
    await pool.request()
      .input('name', sql.NVarChar, 'GBCR Main')
      .input('code', sql.VarChar, 'MAIN')
      .query("INSERT INTO branches (name, code) VALUES (@name, @code)");
    console.log('Branch seeded: GBCR Main');
  } else {
    console.log('Branch already exists');
  }

  // Seed admin user
  const adminExists = await pool.request()
    .query("SELECT id FROM users WHERE email = 'admin@gbcr.com'");
  if (adminExists.recordset.length === 0) {
    const hash = await bcrypt.hash('Admin@123', 12);
    await pool.request()
      .input('email', sql.VarChar, 'admin@gbcr.com')
      .input('password_hash', sql.VarChar, hash)
      .input('full_name', sql.NVarChar, 'System Administrator')
      .input('role', sql.VarChar, 'super_admin')
      .input('branch_id', sql.Int, 1)
      .input('must_change_password', sql.Bit, 1)
      .query(`INSERT INTO users (email, password_hash, full_name, role, branch_id, must_change_password)
              VALUES (@email, @password_hash, @full_name, @role, @branch_id, @must_change_password)`);
    console.log('Admin user seeded: admin@gbcr.com / Admin@123');
  } else {
    console.log('Admin user already exists');
  }

  // Seed vehicle categories
  const catExists = await pool.request()
    .query("SELECT COUNT(*) as cnt FROM vehicle_categories");
  if (catExists.recordset[0].cnt === 0) {
    const categories = [
      { name: 'Economy Sedan', daily: 80, weekly: 480, monthly: 1600, deposit: 500, sort: 1 },
      { name: 'Standard Sedan', daily: 100, weekly: 600, monthly: 2000, deposit: 500, sort: 2 },
      { name: 'Premium Sedan', daily: 150, weekly: 900, monthly: 3000, deposit: 1000, sort: 3 },
      { name: 'SUV', daily: 180, weekly: 1080, monthly: 3600, deposit: 1000, sort: 4 },
      { name: 'Van', daily: 120, weekly: 720, monthly: 2400, deposit: 800, sort: 5 },
      { name: 'Truck (Light)', daily: 140, weekly: 840, monthly: 2800, deposit: 800, sort: 6 },
      { name: 'Truck (Heavy)', daily: 200, weekly: 1200, monthly: 4000, deposit: 1500, sort: 7 },
    ];
    for (const cat of categories) {
      await pool.request()
        .input('name', sql.NVarChar, cat.name)
        .input('daily_rate', sql.Decimal(10, 2), cat.daily)
        .input('weekly_rate', sql.Decimal(10, 2), cat.weekly)
        .input('monthly_rate', sql.Decimal(10, 2), cat.monthly)
        .input('deposit_amount', sql.Decimal(10, 2), cat.deposit)
        .input('sort_order', sql.Int, cat.sort)
        .query(`INSERT INTO vehicle_categories (name, daily_rate, weekly_rate, monthly_rate, deposit_amount, sort_order)
                VALUES (@name, @daily_rate, @weekly_rate, @monthly_rate, @deposit_amount, @sort_order)`);
    }
    console.log('Vehicle categories seeded: 7 categories');
  } else {
    console.log('Vehicle categories already exist');
  }

  await pool.close();
  console.log('Seed complete.');
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
```

- [ ] **Step 3: Run schema against database**

```bash
# Connect to MSSQL and run schema.sql
# This can be done via Azure Data Studio, SSMS, or the mssql CLI
# Or run via a quick script:
npx tsx -e "
const sql = require('mssql');
const fs = require('fs');
const config = { server: 'GBITR01V.goldbell.com.sg', database: 'GBCR_Platform', user: 'WriteUser', password: process.env.DB_PASSWORD, options: { encrypt: false, trustServerCertificate: true } };
(async () => {
  const pool = await sql.connect(config);
  const schema = fs.readFileSync('scripts/schema.sql', 'utf8');
  const statements = schema.split('IF NOT EXISTS').filter(s => s.trim()).map(s => 'IF NOT EXISTS' + s);
  for (const stmt of statements) { await pool.request().query(stmt); }
  console.log('Schema applied');
  await pool.close();
})().catch(e => { console.error(e); process.exit(1); });
"
```

Alternatively, run schema.sql manually in Azure Data Studio or SSMS against GBCR_Platform.

- [ ] **Step 4: Run seed script**

```bash
npx tsx scripts/seed.ts
```

Expected output:
```
Branch seeded: GBCR Main
Admin user seeded: admin@gbcr.com / Admin@123
Vehicle categories seeded: 7 categories
Seed complete.
```

- [ ] **Step 5: Commit**

```bash
git add scripts/
git commit -m "feat: add database schema and seed script"
```

---

## Task 3: Auth Library & DB Write Pool

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/auth.ts`
- Create: `src/lib/audit.ts`
- Create: `src/lib/file-storage.ts`
- Create: `src/types/auth.ts`

- [ ] **Step 1: Create auth types**

Create `src/types/auth.ts`:

```typescript
export type Role = 'super_admin' | 'branch_manager' | 'customer_service' | 'rental_officer' | 'inspector' | 'driver' | 'finance';

export interface AuthUser {
  userId: number;
  email: string;
  role: Role;
  branchId: number | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
  branch_id: number | null;
  branch_name?: string;
  status: 'active' | 'inactive' | 'suspended';
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Create write DB pool**

Create `src/lib/db.ts`:

```typescript
import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_SERVER || 'GBITR01V.goldbell.com.sg',
  database: process.env.DB_NAME || 'GBCR_Platform',
  user: process.env.DB_USER || 'WriteUser',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool || !pool.connected) {
    pool = await sql.connect(config);
    pool.on('error', () => { pool = null; });
  }
  return pool;
}

export { sql };
```

- [ ] **Step 3: Create auth library**

Create `src/lib/auth.ts`:

```typescript
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import type { AuthUser, Role } from '@/types/auth';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');
const COOKIE_NAME = 'gbcr_token';
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: AuthUser): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

export function setTokenCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return response;
}

export function clearTokenCookie(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return response;
}

export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(COOKIE_NAME)?.value || null;
}

export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

export async function requireRole(request: NextRequest, allowedRoles: Role[]): Promise<AuthUser> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new AuthError('Not authenticated', 401);
  }
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError('Insufficient permissions', 403);
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
```

- [ ] **Step 4: Create audit logger**

Create `src/lib/audit.ts`:

```typescript
import { getPool, sql } from './db';

export async function logAudit(params: {
  userId: number | null;
  action: string;
  entityType: string;
  entityId?: number;
  oldValues?: object;
  newValues?: object;
  ipAddress?: string;
}): Promise<void> {
  try {
    const pool = await getPool();
    await pool.request()
      .input('user_id', sql.Int, params.userId)
      .input('action', sql.VarChar, params.action)
      .input('entity_type', sql.VarChar, params.entityType)
      .input('entity_id', sql.Int, params.entityId || null)
      .input('old_values', sql.NVarChar, params.oldValues ? JSON.stringify(params.oldValues) : null)
      .input('new_values', sql.NVarChar, params.newValues ? JSON.stringify(params.newValues) : null)
      .input('ip_address', sql.VarChar, params.ipAddress || null)
      .query(`INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
              VALUES (@user_id, @action, @entity_type, @entity_id, @old_values, @new_values, @ip_address)`);
  } catch (err) {
    console.error('Audit log failed:', err);
    // Don't throw — audit logging should never break the main operation
  }
}
```

- [ ] **Step 5: Create file storage helper**

Create `src/lib/file-storage.ts`:

```typescript
import fs from 'fs/promises';
import path from 'path';

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT || './storage';

function resolvePath(subPath: string): string {
  const resolved = path.resolve(STORAGE_ROOT, subPath);
  // Prevent path traversal
  if (!resolved.startsWith(path.resolve(STORAGE_ROOT))) {
    throw new Error('Invalid file path');
  }
  return resolved;
}

export async function saveFile(subPath: string, buffer: Buffer): Promise<string> {
  const filePath = resolvePath(subPath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return subPath;
}

export async function readFile(subPath: string): Promise<Buffer> {
  const filePath = resolvePath(subPath);
  return fs.readFile(filePath);
}

export async function deleteFile(subPath: string): Promise<void> {
  const filePath = resolvePath(subPath);
  await fs.unlink(filePath).catch(() => {});
}

export async function fileExists(subPath: string): Promise<boolean> {
  try {
    const filePath = resolvePath(subPath);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/db.ts src/lib/auth.ts src/lib/audit.ts src/lib/file-storage.ts src/types/auth.ts
git commit -m "feat: add auth library, DB write pool, audit logger, and file storage"
```

---

## Task 4: Next.js Middleware for Route Protection

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create middleware**

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

async function isValidToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth needed
  if (
    pathname === '/login' ||
    pathname === '/api/auth/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/manifest.json' ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('gbcr_token')?.value;

  // API routes — return 401 if no valid token
  if (pathname.startsWith('/api/')) {
    if (!token || !(await isValidToken(token))) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Page routes — redirect to login if no valid token
  if (!token || !(await isValidToken(token))) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Change password page is always accessible if authenticated
  if (pathname === '/change-password') {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add Next.js middleware for route protection"
```

---

## Task 5: Auth API Routes

**Files:**
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/app/api/auth/change-password/route.ts`

- [ ] **Step 1: Create login route**

Create `src/app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getPool, sql } from '@/lib/db';
import { comparePassword, signToken, setTokenCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import type { AuthUser } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.VarChar, email.toLowerCase().trim())
      .query(`SELECT id, email, password_hash, full_name, phone, role, branch_id, status, must_change_password
              FROM users WHERE email = @email`);

    const user = result.recordset[0];

    if (!user) {
      await logAudit({
        userId: null,
        action: 'login_failed',
        entityType: 'auth',
        newValues: { email, reason: 'user_not_found' },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is inactive. Contact your administrator.' },
        { status: 401 }
      );
    }

    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) {
      await logAudit({
        userId: user.id,
        action: 'login_failed',
        entityType: 'auth',
        newValues: { reason: 'invalid_password' },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login + updated_at
    await pool.request()
      .input('id', sql.Int, user.id)
      .query('UPDATE users SET last_login_at = GETDATE(), updated_at = GETDATE() WHERE id = @id');

    // Generate JWT
    const payload: AuthUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branch_id,
    };
    const token = await signToken(payload);

    await logAudit({
      userId: user.id,
      action: 'login',
      entityType: 'auth',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    const responseData = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        branch_id: user.branch_id,
        mustChangePassword: !!user.must_change_password,
      },
    };

    const response = NextResponse.json(responseData);
    return setTokenCookie(response, token);
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create logout route**

Create `src/app/api/auth/logout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { clearTokenCookie, getUserFromRequest } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request);

  if (user) {
    await logAudit({
      userId: user.userId,
      action: 'logout',
      entityType: 'auth',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });
  }

  const response = NextResponse.json({ success: true });
  return clearTokenCookie(response);
}
```

- [ ] **Step 3: Create me route**

Create `src/app/api/auth/me/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, authUser.userId)
    .query(`SELECT u.id, u.email, u.full_name, u.phone, u.role, u.branch_id, u.status,
                   u.must_change_password, u.last_login_at, b.name as branch_name
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE u.id = @id`);

  const user = result.recordset[0];
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      branch_id: user.branch_id,
      branch_name: user.branch_name,
      status: user.status,
      mustChangePassword: !!user.must_change_password,
    },
  });
}
```

- [ ] **Step 4: Create change-password route**

Create `src/app/api/auth/change-password/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, hashPassword, comparePassword } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function PUT(request: NextRequest) {
  const authUser = await getUserFromRequest(request);
  if (!authUser) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { success: false, error: 'Current password and new password are required' },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { success: false, error: 'New password must be at least 8 characters' },
      { status: 400 }
    );
  }

  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, authUser.userId)
    .query('SELECT password_hash FROM users WHERE id = @id');

  const user = result.recordset[0];
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  const validCurrent = await comparePassword(currentPassword, user.password_hash);
  if (!validCurrent) {
    return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 401 });
  }

  const newHash = await hashPassword(newPassword);
  await pool.request()
    .input('id', sql.Int, authUser.userId)
    .input('password_hash', sql.VarChar, newHash)
    .query('UPDATE users SET password_hash = @password_hash, must_change_password = 0, updated_at = GETDATE() WHERE id = @id');

  await logAudit({
    userId: authUser.userId,
    action: 'change_password',
    entityType: 'user',
    entityId: authUser.userId,
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
  });

  return NextResponse.json({ success: true, data: { message: 'Password changed successfully' } });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/
git commit -m "feat: add auth API routes (login, logout, me, change-password)"
```

---

## Task 6: Users API Routes

**Files:**
- Create: `src/app/api/users/route.ts`
- Create: `src/app/api/users/[id]/route.ts`
- Create: `src/app/api/users/[id]/deactivate/route.ts`

- [ ] **Step 1: Create users list + create route**

Create `src/app/api/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, hashPassword, AuthError } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, ['super_admin']);
    const pool = await getPool();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const offset = (page - 1) * pageSize;

    let whereClause = '1=1';
    const req = pool.request();

    if (search) {
      whereClause += " AND (u.full_name LIKE @search OR u.email LIKE @search OR u.phone LIKE @search)";
      req.input('search', sql.NVarChar, `%${search}%`);
    }
    if (role) {
      whereClause += " AND u.role = @role";
      req.input('role', sql.VarChar, role);
    }
    if (status) {
      whereClause += " AND u.status = @status";
      req.input('status', sql.VarChar, status);
    }

    req.input('offset', sql.Int, offset);
    req.input('pageSize', sql.Int, pageSize);

    const result = await req.query(`
      SELECT u.id, u.email, u.full_name, u.phone, u.role, u.branch_id, u.status,
             u.must_change_password, u.last_login_at, u.created_at, u.updated_at,
             b.name as branch_name
      FROM users u
      LEFT JOIN branches b ON u.branch_id = b.id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

    // Get total count separately
    const countReq = pool.request();
    if (search) countReq.input('search', sql.NVarChar, `%${search}%`);
    if (role) countReq.input('role', sql.VarChar, role);
    if (status) countReq.input('status', sql.VarChar, status);
    const totalResult = await countReq.query(`SELECT COUNT(*) as total FROM users u WHERE ${whereClause}`);

    return NextResponse.json({
      success: true,
      data: result.recordset.map((u: Record<string, unknown>) => ({
        ...u,
        must_change_password: !!u.must_change_password,
      })),
      pagination: {
        page,
        pageSize,
        total: totalResult.recordset[0].total,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('List users error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireRole(request, ['super_admin']);
    const body = await request.json();
    const { email, full_name, phone, role, branch_id, password } = body;

    if (!email || !full_name || !role) {
      return NextResponse.json(
        { success: false, error: 'Email, full name, and role are required' },
        { status: 400 }
      );
    }

    const validRoles = ['super_admin', 'branch_manager', 'customer_service', 'rental_officer', 'inspector', 'driver', 'finance'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    const tempPassword = password || 'Temp@123';
    const passwordHash = await hashPassword(tempPassword);

    const pool = await getPool();

    // Check duplicate email
    const existing = await pool.request()
      .input('email', sql.VarChar, email.toLowerCase().trim())
      .query('SELECT id FROM users WHERE email = @email');

    if (existing.recordset.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Email already exists', code: 'DUPLICATE_EMAIL' },
        { status: 409 }
      );
    }

    const result = await pool.request()
      .input('email', sql.VarChar, email.toLowerCase().trim())
      .input('password_hash', sql.VarChar, passwordHash)
      .input('full_name', sql.NVarChar, full_name.trim())
      .input('phone', sql.VarChar, phone || null)
      .input('role', sql.VarChar, role)
      .input('branch_id', sql.Int, branch_id || null)
      .query(`INSERT INTO users (email, password_hash, full_name, phone, role, branch_id, must_change_password)
              OUTPUT INSERTED.id
              VALUES (@email, @password_hash, @full_name, @phone, @role, @branch_id, 1)`);

    const newUserId = result.recordset[0].id;

    await logAudit({
      userId: authUser.userId,
      action: 'create',
      entityType: 'user',
      entityId: newUserId,
      newValues: { email, full_name, role, branch_id },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: { id: newUserId, email, full_name, role, tempPassword },
    }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('Create user error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Create user detail + update route**

Create `src/app/api/users/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, hashPassword, AuthError } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ['super_admin']);
    const { id } = await params;
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query(`SELECT u.id, u.email, u.full_name, u.phone, u.role, u.branch_id, u.status,
                     u.must_change_password, u.last_login_at, u.created_at, u.updated_at,
                     b.name as branch_name
              FROM users u
              LEFT JOIN branches b ON u.branch_id = b.id
              WHERE u.id = @id`);

    if (result.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...result.recordset[0], must_change_password: !!result.recordset[0].must_change_password },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('Get user error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireRole(request, ['super_admin']);
    const { id } = await params;
    const body = await request.json();
    const { full_name, phone, role, branch_id, resetPassword } = body;

    const pool = await getPool();
    const userId = parseInt(id);

    // Get current user for audit
    const current = await pool.request()
      .input('id', sql.Int, userId)
      .query('SELECT * FROM users WHERE id = @id');

    if (current.recordset.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const oldUser = current.recordset[0];
    const updates: string[] = ['updated_at = GETDATE()'];
    const req = pool.request().input('id', sql.Int, userId);

    if (full_name !== undefined) {
      updates.push('full_name = @full_name');
      req.input('full_name', sql.NVarChar, full_name.trim());
    }
    if (phone !== undefined) {
      updates.push('phone = @phone');
      req.input('phone', sql.VarChar, phone || null);
    }
    if (role !== undefined) {
      updates.push('role = @role');
      req.input('role', sql.VarChar, role);
    }
    if (branch_id !== undefined) {
      updates.push('branch_id = @branch_id');
      req.input('branch_id', sql.Int, branch_id || null);
    }
    if (resetPassword) {
      const tempPassword = 'Temp@123';
      const hash = await hashPassword(tempPassword);
      updates.push('password_hash = @password_hash');
      updates.push('must_change_password = 1');
      req.input('password_hash', sql.VarChar, hash);
    }

    await req.query(`UPDATE users SET ${updates.join(', ')} WHERE id = @id`);

    await logAudit({
      userId: authUser.userId,
      action: 'update',
      entityType: 'user',
      entityId: userId,
      oldValues: { full_name: oldUser.full_name, role: oldUser.role, branch_id: oldUser.branch_id },
      newValues: { full_name, role, branch_id, resetPassword: !!resetPassword },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, data: { id: userId, message: 'User updated' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('Update user error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create deactivate route**

Create `src/app/api/users/[id]/deactivate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth';
import { getPool, sql } from '@/lib/db';
import { logAudit } from '@/lib/audit';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireRole(request, ['super_admin']);
    const { id } = await params;
    const userId = parseInt(id);

    // Prevent self-deactivation
    if (userId === authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, userId)
      .query("UPDATE users SET status = 'inactive', updated_at = GETDATE() WHERE id = @id AND status = 'active'");

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found or already inactive' },
        { status: 404 }
      );
    }

    await logAudit({
      userId: authUser.userId,
      action: 'deactivate',
      entityType: 'user',
      entityId: userId,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    return NextResponse.json({ success: true, data: { id: userId, message: 'User deactivated' } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    console.error('Deactivate user error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Create files route**

Create `src/app/api/files/[...path]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { readFile, fileExists } from '@/lib/file-storage';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }

  const { path: pathSegments } = await params;
  const filePath = pathSegments.join('/');

  if (!(await fileExists(filePath))) {
    return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
  }

  try {
    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Error reading file' }, { status: 500 });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/users/ src/app/api/files/
git commit -m "feat: add users CRUD API and authenticated file serving"
```

---

## Task 7: Route Group Restructure

Move existing pages into `(dashboard)` group and create `(auth)` group layouts.

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Move: all existing page directories into `(dashboard)/`

- [ ] **Step 1: Create auth layout**

Create `src/app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create dashboard layout**

Create `src/app/(dashboard)/layout.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import type { Role } from '@/types/auth';

interface UserData {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  branch_id: number | null;
  branch_name: string | null;
  mustChangePassword: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          if (data.data.mustChangePassword) {
            router.push('/change-password');
            return;
          }
          setUser(data.data);
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-100">
        <div className="animate-spin w-8 h-8 border-4 border-primary-light border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={user.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Simplify root layout**

Replace `src/app/layout.tsx` with:

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GBCR Platform',
  description: 'Goldbell Car Rental - Vehicle Booking & Inspection Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Move existing pages into (dashboard) group**

```bash
cd "/Users/eliyazar/Documents/MX Project/gbcr-platform/src/app"

# Create dashboard group directory
mkdir -p "(dashboard)"

# Move existing pages (keep api/ and globals.css and favicon.ico at root)
mv page.tsx "(dashboard)/page.tsx"
mv fleet "(dashboard)/fleet"
mv bookings "(dashboard)/bookings"
mv services "(dashboard)/services"
mv customers "(dashboard)/customers"
mv analytics "(dashboard)/analytics"
mv ai "(dashboard)/ai"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: restructure routes into (auth) and (dashboard) groups"
```

---

## Task 8: Login & Change Password Pages

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/change-password/page.tsx`

- [ ] **Step 1: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error);
        setLoading(false);
        return;
      }

      if (data.data.mustChangePassword) {
        router.push('/change-password');
      } else {
        const redirect = searchParams.get('redirect') || '/';
        router.push(redirect);
      }
    } catch {
      setError('Unable to connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-8">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-xl">GB</span>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900">GBCR Platform</h1>
        <p className="text-sm text-neutral-500 mt-1">Vehicle Booking & Inspection</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gbcr.com"
            required
            className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create change password page**

Create `src/app/(auth)/change-password/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error);
        setLoading(false);
        return;
      }

      router.push('/');
    } catch {
      setError('Unable to connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-8">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-neutral-900">Change Password</h1>
        <p className="text-sm text-neutral-500 mt-1">Please set a new password to continue</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add login and change password pages"
```

---

## Task 9: Update Sidebar & Header with Auth

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Update Sidebar with role-based menu**

Replace `src/components/layout/Sidebar.tsx` with role-aware version. The component now receives `userRole` as a prop from the dashboard layout.

Key changes:
- Add `visibleTo` array to each nav item
- Filter nav items by user role
- Add Settings item for super_admin only
- Keep same visual style

```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/types/auth';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  visibleTo: Role[] | 'all';
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', visibleTo: 'all' },
  { href: '/fleet', label: 'Fleet', icon: 'M8 7h8m-8 4h8m-4 4h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z', visibleTo: ['super_admin', 'branch_manager', 'customer_service', 'rental_officer'] },
  { href: '/bookings', label: 'Bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', visibleTo: ['super_admin', 'branch_manager', 'customer_service', 'rental_officer'] },
  { href: '/services', label: 'Services', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', visibleTo: ['super_admin', 'branch_manager', 'rental_officer', 'inspector'] },
  { href: '/customers', label: 'Customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', visibleTo: ['super_admin', 'branch_manager', 'customer_service', 'rental_officer'] },
  { href: '/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', visibleTo: ['super_admin', 'branch_manager', 'finance'] },
  { href: '/ai', label: 'AI Insights', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', visibleTo: ['super_admin', 'branch_manager'] },
  { href: '/settings', label: 'Settings', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4', visibleTo: ['super_admin'] },
];

export default function Sidebar({ userRole }: { userRole: Role }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const filteredItems = navItems.filter((item) =>
    item.visibleTo === 'all' || item.visibleTo.includes(userRole)
  );

  return (
    <aside className={`bg-sidebar text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-light rounded-lg flex items-center justify-center font-bold text-sm">GB</div>
            <span className="font-semibold text-sm">GBCR Platform</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg hover:bg-sidebar-hover transition-colors ${collapsed ? 'mx-auto' : 'ml-auto'}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'} />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${
                isActive ? 'bg-sidebar-active text-white' : 'text-neutral-400 hover:bg-sidebar-hover hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-white/10 text-xs text-neutral-500">
          Goldbell Car Rental v1.0
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Update Header with user info and dropdown**

Replace `src/components/layout/Header.tsx`:

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface HeaderUser {
  full_name: string;
  role: string;
  email: string;
}

const breadcrumbMap: Record<string, string> = {
  '/': 'Dashboard',
  '/fleet': 'Fleet Management',
  '/bookings': 'Bookings',
  '/services': 'Service & Maintenance',
  '/customers': 'Customers',
  '/analytics': 'Analytics',
  '/ai': 'AI Insights',
  '/settings': 'Settings',
  '/settings/users': 'User Management',
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  branch_manager: 'Branch Manager',
  customer_service: 'Customer Service',
  rental_officer: 'Rental Officer',
  inspector: 'Inspector',
  driver: 'Driver',
  finance: 'Finance',
};

export default function Header({ user }: { user: HeaderUser }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    ...segments.map((seg, i) => ({
      label: breadcrumbMap['/' + segments.slice(0, i + 1).join('/')] || seg,
      href: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 flex items-center justify-between px-6 shrink-0">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-2">
            {i > 0 && <span className="text-neutral-300">/</span>}
            <span className={i === breadcrumbs.length - 1 ? 'text-neutral-900 font-medium' : 'text-neutral-500'}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* User info */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <div className="text-right">
            <p className="text-sm font-medium text-neutral-900">{user.full_name}</p>
            <p className="text-xs text-neutral-500">{roleLabels[user.role] || user.role}</p>
          </div>
          <div className="w-8 h-8 bg-primary-light rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <svg className={`w-4 h-4 text-neutral-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 animate-fade-in">
            <div className="px-4 py-2 border-b border-neutral-100">
              <p className="text-xs text-neutral-500">{user.email}</p>
            </div>
            <button
              onClick={() => { setDropdownOpen(false); router.push('/change-password'); }}
              className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
            >
              Change Password
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/
git commit -m "feat: update Sidebar with role-based menu, Header with user dropdown"
```

---

## Task 10: UI Components Library

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/textarea.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/modal.tsx`
- Create: `src/components/ui/data-table.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/spinner.tsx`
- Create: `src/components/ui/empty-state.tsx`

These are all small, focused components. Create each file with the component implementation. All use Tailwind CSS classes from the existing theme tokens.

See the spec (Section 6.1) for prop definitions. Each component should be a default export.

- [ ] **Step 1: Create Button, Input, Select, Textarea components**

`src/components/ui/button.tsx` — Button with variants (primary/secondary/destructive/ghost/outline), sizes (sm/md/lg), loading state, icon support.

`src/components/ui/input.tsx` — Input with label, error message, hint text, required indicator.

`src/components/ui/select.tsx` — Select dropdown with label, options array `{label, value}[]`, error message.

`src/components/ui/textarea.tsx` — Textarea with label, error message, configurable rows.

- [ ] **Step 2: Create Card, Modal, Badge, Spinner, EmptyState**

`src/components/ui/card.tsx` — Card container with optional title, description, and action slots.

`src/components/ui/modal.tsx` — Modal overlay using dialog element, sizes (sm/md/lg/xl), close button, title. Uses portal.

`src/components/ui/badge.tsx` — Badge with variants (default/success/warning/destructive/info).

`src/components/ui/spinner.tsx` — Animated loading spinner with sizes (sm/md/lg).

`src/components/ui/empty-state.tsx` — Empty state with icon, title, description, and optional action button.

- [ ] **Step 3: Create DataTable component**

`src/components/ui/data-table.tsx` — Data table with column definitions, sortable headers, pagination controls, empty state. This is the most complex component — uses generics for type-safe column definitions.

```typescript
interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void };
  sortable?: boolean;
  emptyMessage?: string;
  loading?: boolean;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add reusable UI components (Button, Input, Select, Card, Modal, DataTable, Badge, Spinner, EmptyState)"
```

---

## Task 11: User Management Page

**Files:**
- Create: `src/app/(dashboard)/settings/page.tsx`
- Create: `src/app/(dashboard)/settings/users/page.tsx`

- [ ] **Step 1: Create settings overview page**

Create `src/app/(dashboard)/settings/page.tsx`:

```typescript
import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/settings/users" className="bg-white rounded-xl border border-neutral-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-neutral-900">User Management</h3>
              <p className="text-sm text-neutral-500">Manage staff accounts and roles</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create user management page**

Create `src/app/(dashboard)/settings/users/page.tsx`:

Full CRUD page with:
- User list table using DataTable component
- Search and filter by role/status
- "Add User" button opens modal with form (email, name, phone, role, branch)
- Edit button opens same modal pre-filled
- Deactivate button with confirmation
- Reset password button
- Shows temp password in success toast after create

This is a large page component (~200-300 lines). Key sections:
1. State: users list, pagination, filters, modal state, form state
2. API calls: fetch users, create user, update user, deactivate
3. Table with columns: Name, Email, Role, Status, Last Login, Actions
4. Modal form for create/edit
5. Confirmation dialog for deactivate

- [ ] **Step 3: Verify the page loads**

```bash
npm run dev
# Open http://localhost:3000/login
# Login with admin@gbcr.com / Admin@123
# Navigate to Settings > User Management
# Verify: table shows admin user, Add User button works
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/settings/
git commit -m "feat: add settings page and user management CRUD"
```

---

## Task 12: PWA Manifest & Final Touches

**Files:**
- Create: `public/manifest.json`
- Modify: `src/app/layout.tsx` (add manifest link)

- [ ] **Step 1: Create PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "GBCR Platform",
  "short_name": "GBCR",
  "description": "Goldbell Car Rental - Vehicle Booking & Inspection Platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f1f5f9",
  "theme_color": "#1e40af",
  "icons": [
    {
      "src": "/favicon.ico",
      "sizes": "64x64",
      "type": "image/x-icon"
    }
  ]
}
```

- [ ] **Step 2: Add manifest link to root layout**

Add to the `<head>` in `src/app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  title: 'GBCR Platform',
  description: 'Goldbell Car Rental - Vehicle Booking & Inspection Platform',
  manifest: '/manifest.json',
};
```

- [ ] **Step 3: Verify full flow**

```bash
npm run dev
```

Test the complete flow:
1. Open http://localhost:3000 → should redirect to /login
2. Login with admin@gbcr.com / Admin@123
3. Should redirect to /change-password (must_change_password = 1)
4. Change password → redirects to Dashboard
5. Sidebar shows all items (super_admin sees everything)
6. Header shows "System Administrator" with dropdown
7. Click "Sign Out" → redirects to /login
8. Login again with new password → goes to Dashboard directly
9. Navigate to Settings > User Management
10. Create a new user → verify temp password shown
11. Create user with role "inspector" → login with that user → verify sidebar only shows Dashboard and Services

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json src/app/layout.tsx
git commit -m "feat: add PWA manifest and finalize foundation"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Dependencies & env setup | package.json, .env.local |
| 2 | Database schema & seed | scripts/schema.sql, scripts/seed.ts |
| 3 | Auth library & helpers | src/lib/db.ts, auth.ts, audit.ts, file-storage.ts |
| 4 | Middleware | src/middleware.ts |
| 5 | Auth API routes | src/app/api/auth/* |
| 6 | Users API routes | src/app/api/users/* |
| 7 | Route group restructure | Move pages to (dashboard)/, create (auth)/ |
| 8 | Login & change password pages | src/app/(auth)/* |
| 9 | Sidebar & Header auth integration | src/components/layout/* |
| 10 | UI components library | src/components/ui/* |
| 11 | User management page | src/app/(dashboard)/settings/* |
| 12 | PWA manifest & final verification | public/manifest.json |
