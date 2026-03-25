# GBCR Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a field-focused Expo mobile app for GBCR inspectors with offline inspections, AI chat, and push notifications.

**Architecture:** Monorepo (Turborepo) with existing Next.js web app + new Expo mobile app + shared TypeScript packages. Mobile consumes existing API with Bearer token auth adaptation. Offline inspections stored in SQLite, synced over company WiFi. Photos uploaded to OneDrive via Microsoft Graph API.

**Tech Stack:** Expo SDK 53, React Native, TypeScript, expo-router, expo-sqlite, expo-camera, expo-notifications, expo-secure-store, react-native-svg, @microsoft/microsoft-graph-client, Turborepo

**Spec:** `docs/superpowers/specs/2026-03-24-gbcr-mobile-app-design.md`

**Parallelization:** After Phase 4 (offline DB/sync), Phases 5 (Inspections), 6 (AI Chat), and 7 (Push Notifications) can run in parallel as they are independent.

**Deliberate deferrals:** The spec's `packages/api-client/` is deferred to v2 — the API client lives in `apps/mobile/lib/api.ts` for now since only mobile uses it. Socket.io real-time updates are also deferred — push notifications cover the real-time use case for v1.

---

## Phase 1: Monorepo Migration

Move the existing Next.js app into `apps/web/` and set up the monorepo structure. This phase must be completed and verified before any mobile development begins.

### Task 1: Set Up Monorepo Root

**Files:**
- Create: `turbo.json`
- Modify: `package.json` (root — replace contents with workspace config)

- [ ] **Step 1: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 2: Create new root package.json**

Save the current `package.json` content for reference (we'll use it for `apps/web/package.json`). Replace root with:

```json
{
  "name": "gbcr-platform",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "dev:web": "turbo dev --filter=@gbcr/web",
    "dev:mobile": "turbo dev --filter=@gbcr/mobile",
    "build:web": "turbo build --filter=@gbcr/web"
  },
  "devDependencies": {
    "turbo": "^2.5.0"
  }
}
```

- [ ] **Step 3: Install turbo**

Run: `npm install`
Expected: turbo installed, `node_modules` updated

- [ ] **Step 4: Commit**

```bash
git add turbo.json package.json package-lock.json
git commit -m "chore: initialize turborepo workspace root"
```

---

### Task 2: Move Web App to apps/web/

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/postcss.config.mjs`
- Move: `src/` → `apps/web/src/`, `public/` → `apps/web/public/`, `server.js` → `apps/web/server.js`, `start.sh` → `apps/web/start.sh`, `eslint.config.mjs` → `apps/web/eslint.config.mjs`, `scripts/` → `apps/web/scripts/`

- [ ] **Step 1: Create apps/web directory and move files**

```bash
mkdir -p apps/web
# Move source files
mv src apps/web/
mv public apps/web/
mv server.js apps/web/
mv next.config.ts apps/web/
mv postcss.config.mjs apps/web/
mv eslint.config.mjs apps/web/
mv start.sh apps/web/
mv scripts apps/web/
```

- [ ] **Step 1b: Update start.sh for new location**

The `start.sh` references `server.js` and `next dev` which are now relative to `apps/web/`:

```bash
#!/bin/bash
echo "Starting GBCR Platform..."
node server.js &
SOCKET_PID=$!
echo "Socket.io server started (PID: $SOCKET_PID)"
npx next dev -H 0.0.0.0
kill $SOCKET_PID 2>/dev/null
```

No path changes needed since `start.sh` is now inside `apps/web/` alongside `server.js`. But add a convenience script at root:

```bash
# Root start.sh
#!/bin/bash
cd apps/web && ./start.sh
```

- [ ] **Step 2: Create apps/web/package.json**

Use the dependencies from the original root `package.json`:

```json
{
  "name": "@gbcr/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -H 0.0.0.0",
    "build": "next build",
    "start": "next start",
    "socket": "node server.js",
    "lint": "eslint"
  },
  "dependencies": {
    "@gbcr/shared": "workspace:*",
    "@tanstack/react-table": "^8.21.3",
    "@types/mssql": "^9.1.9",
    "bcryptjs": "^3.0.3",
    "date-fns": "^4.1.0",
    "jose": "^6.2.1",
    "mssql": "^12.2.0",
    "next": "16.1.6",
    "openai": "^6.29.0",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "recharts": "^3.8.0",
    "socket.io": "^4.8.3",
    "socket.io-client": "^4.8.3",
    "swr": "^2.4.1",
    "uuid": "^13.0.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/uuid": "^10.0.0",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "tsx": "^4.21.0",
    "typescript": "^5"
  }
}
```

- [ ] **Step 3: Create apps/web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@gbcr/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Update apps/web/next.config.ts**

```typescript
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, '..', '..'),
  },
  serverExternalPackages: ['mssql'],
  transpilePackages: ['@gbcr/shared'],
};

export default nextConfig;
```

- [ ] **Step 5: Copy postcss.config.mjs to apps/web/**

Already moved in Step 1. Verify it exists at `apps/web/postcss.config.mjs`.

- [ ] **Step 6: Copy .env file to apps/web/**

```bash
cp .env apps/web/.env
```

The `.env` file needs to be in `apps/web/` where Next.js runs.

- [ ] **Step 7: Update .gitignore**

Add to root `.gitignore`:
```
# turborepo
.turbo

# superpowers
.superpowers/
```

- [ ] **Step 8: Update FILE_STORAGE_ROOT in apps/web/.env**

Change `FILE_STORAGE_ROOT=./storage` to an absolute path or `FILE_STORAGE_ROOT=../../storage` so it resolves correctly from `apps/web/`.

- [ ] **Step 9: Install dependencies from root**

```bash
npm install
```

Expected: Workspace dependencies resolved, `node_modules` in root and `apps/web/`

- [ ] **Step 10: Verify web app builds**

```bash
cd apps/web && npx next build
```

Expected: Build succeeds with no errors

- [ ] **Step 11: Verify web app runs**

```bash
cd apps/web && npm run dev
```

Expected: App starts on http://0.0.0.0:3000, pages load, API routes work

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: move web app to apps/web/ monorepo structure"
```

---

### Task 3: Create Shared Package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/inspection.ts`
- Create: `packages/shared/src/types/auth.ts`
- Create: `packages/shared/src/types/fleet.ts`
- Create: `packages/shared/src/types/ai.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@gbcr/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Extract types from web app into shared package**

Copy the type definitions from the web app into the shared package. These files are direct copies of:
- `apps/web/src/types/inspection.ts` → `packages/shared/src/types/inspection.ts`
- `apps/web/src/types/auth.ts` → `packages/shared/src/types/auth.ts`

Create `packages/shared/src/types/fleet.ts` with types extracted from `apps/web/src/lib/types.ts`:
- `Vehicle`, `FleetStats`, `VehicleDetail`, `Booking`, `BookingFormData`
- `WorkOrderSummary`, `Customer`, `RevenueData`, `UtilizationData`

Create `packages/shared/src/types/ai.ts`:
- `AIForecast`, `AIAnomaly`, `AIChatMessage`, `AIRecommendation`, `MaintenanceScore`

- [ ] **Step 4: Create packages/shared/src/index.ts**

```typescript
// Auth types
export type { Role, AuthUser, User } from './types/auth';

// Inspection types
export type {
  InspectionType,
  InspectionStatus,
  DiagramView,
  RepairStatus,
  Inspection,
  DamageRecord,
  InspectionPhoto,
} from './types/inspection';

// Fleet types
export type {
  Vehicle,
  FleetStats,
  VehicleDetail,
  Booking,
  BookingFormData,
  WorkOrderSummary,
  Customer,
  RevenueData,
  UtilizationData,
} from './types/fleet';

// AI types
export type {
  AIForecast,
  AIAnomaly,
  AIChatMessage,
  AIRecommendation,
  MaintenanceScore,
} from './types/ai';
```

- [ ] **Step 5: Update web app imports to use shared package**

In `apps/web/src/types/inspection.ts` and `apps/web/src/types/auth.ts`, re-export from shared:

```typescript
// apps/web/src/types/inspection.ts
export type {
  InspectionType,
  InspectionStatus,
  DiagramView,
  RepairStatus,
  Inspection,
  DamageRecord,
  InspectionPhoto,
} from '@gbcr/shared';
```

```typescript
// apps/web/src/types/auth.ts
export type { Role, AuthUser, User } from '@gbcr/shared';
```

Similarly update `apps/web/src/lib/types.ts` to re-export from `@gbcr/shared`.

- [ ] **Step 6: Install dependencies and verify build**

```bash
npm install
cd apps/web && npx next build
```

Expected: Build succeeds with shared package types resolved

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: create shared types package for monorepo"
```

---

## Phase 2: Backend Changes

Add Bearer token auth support, new API endpoints, and database changes needed by the mobile app.

### Task 4: Add Bearer Token Auth Support

**Files:**
- Modify: `apps/web/src/lib/auth.ts:52-54` (getTokenFromRequest)
- Modify: `apps/web/src/app/api/auth/login/route.ts:85-95` (return token in body)

- [ ] **Step 1: Update getTokenFromRequest to support Authorization header**

In `apps/web/src/lib/auth.ts`, modify `getTokenFromRequest`. Note: the cookie name is `gbcr_token` (defined as `COOKIE_NAME` constant on line 7):

```typescript
export function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header first (mobile app)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  // Fall back to cookie (web app)
  return request.cookies.get(COOKIE_NAME)?.value ?? null;
}
```

- [ ] **Step 2: Update middleware to support Authorization header**

In `apps/web/src/middleware.ts` (line 32), the token is extracted from `request.cookies.get('gbcr_token')`. Update to also check the Authorization header:

```typescript
// Replace line 32:
const token = request.cookies.get('gbcr_token')?.value
  ?? request.headers.get('authorization')?.replace('Bearer ', '') ?? null;
```

Also add `/api/app-config` to the public routes list (line 19-30) since it needs to be accessible without auth for mobile version checking.

- [ ] **Step 3: Update login route to return token in body**

In `apps/web/src/app/api/auth/login/route.ts`, modify lines 88-100 to include the JWT token in the response body. Note: the response body uses database field names (`id`, `full_name`, `branch_id`) while the JWT payload uses camelCase (`userId`, `email`, `role`, `branchId`). The mobile app should use the response body fields for display and the JWT for auth.

```typescript
// Replace lines 88-100:
const response = NextResponse.json({
  success: true,
  data: {
    token,  // <-- add JWT token to response body
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    branch_id: user.branch_id,
    mustChangePassword: Boolean(user.must_change_password),
  },
});

return setTokenCookie(response, token);
```

- [ ] **Step 4: Verify web app still works**

```bash
cd apps/web && npx next build
```

Expected: Build succeeds. Existing cookie-based auth still works for web.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auth.ts apps/web/src/middleware.ts apps/web/src/app/api/auth/login/route.ts
git commit -m "feat: add Bearer token auth support for mobile clients"
```

---

### Task 5: Add Token Refresh Endpoint

**Files:**
- Create: `apps/web/src/app/api/auth/refresh/route.ts`

- [ ] **Step 1: Create the refresh endpoint**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, signToken, setTokenCookie, getTokenFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Issue a new token
    const newToken = await signToken(user);
    const response = NextResponse.json({
      success: true,
      data: { token: newToken }
    });
    return setTokenCookie(response, newToken);
  } catch {
    return NextResponse.json(
      { success: false, error: 'Token refresh failed' },
      { status: 401 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && npx next build
```

Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/auth/refresh/route.ts
git commit -m "feat: add token refresh endpoint for mobile session management"
```

---

### Task 6: Database Schema Changes

**Files:**
- Create: `apps/web/scripts/migrate-mobile.sql`

- [ ] **Step 1: Write migration script**

```sql
-- GBCR Mobile App Schema Changes
-- Run against GBCR_Platform database

-- 1. Create PUSH_TOKENS table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'push_tokens')
BEGIN
  CREATE TABLE push_tokens (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    expo_push_token NVARCHAR(255) NOT NULL,
    device_platform NVARCHAR(10) NOT NULL, -- 'ios' or 'android'
    is_active BIT DEFAULT 1,
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT UQ_expo_push_token UNIQUE (expo_push_token),
    CONSTRAINT FK_push_tokens_users FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IX_push_tokens_user_id ON push_tokens(user_id);
  CREATE INDEX IX_push_tokens_active ON push_tokens(is_active) WHERE is_active = 1;
END;

-- 2. Add onedrive_url column to inspection_photos
IF NOT EXISTS (
  SELECT * FROM sys.columns
  WHERE object_id = OBJECT_ID('inspection_photos') AND name = 'onedrive_url'
)
BEGIN
  ALTER TABLE inspection_photos
  ADD onedrive_url NVARCHAR(500) NULL;
END;
```

- [ ] **Step 2: Run migration against database**

Run the SQL script against the GBCR_Platform database using your preferred MSSQL client or via the MCP tool.

- [ ] **Step 3: Commit**

```bash
git add apps/web/scripts/migrate-mobile.sql
git commit -m "feat: add push_tokens table and onedrive_url column for mobile"
```

---

### Task 7: Push Notification API Endpoints

**Files:**
- Create: `apps/web/src/app/api/push/register/route.ts`
- Create: `apps/web/src/app/api/push/unregister/route.ts`

- [ ] **Step 1: Create push token register endpoint**

```typescript
// apps/web/src/app/api/push/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { expo_push_token, device_platform } = await request.json();

    if (!expo_push_token || !device_platform) {
      return NextResponse.json(
        { success: false, error: 'expo_push_token and device_platform are required' },
        { status: 400 }
      );
    }

    if (!['ios', 'android'].includes(device_platform)) {
      return NextResponse.json(
        { success: false, error: 'device_platform must be ios or android' },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Upsert: update if token exists, insert if new
    await pool.request()
      .input('user_id', user.userId)
      .input('expo_push_token', expo_push_token)
      .input('device_platform', device_platform)
      .query(`
        MERGE push_tokens AS target
        USING (SELECT @expo_push_token AS expo_push_token) AS source
        ON target.expo_push_token = source.expo_push_token
        WHEN MATCHED THEN
          UPDATE SET user_id = @user_id, device_platform = @device_platform,
                     is_active = 1, updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (user_id, expo_push_token, device_platform, is_active, created_at, updated_at)
          VALUES (@user_id, @expo_push_token, @device_platform, 1, GETDATE(), GETDATE());
      `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push register error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register push token' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Create push token unregister endpoint**

```typescript
// apps/web/src/app/api/push/unregister/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getPool } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { expo_push_token } = await request.json();

    if (!expo_push_token) {
      return NextResponse.json(
        { success: false, error: 'expo_push_token is required' },
        { status: 400 }
      );
    }

    const pool = await getPool();
    await pool.request()
      .input('expo_push_token', expo_push_token)
      .input('user_id', user.userId)
      .query(`
        UPDATE push_tokens
        SET is_active = 0, updated_at = GETDATE()
        WHERE expo_push_token = @expo_push_token AND user_id = @user_id
      `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Push unregister error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unregister push token' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify build**

```bash
cd apps/web && npx next build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/push/
git commit -m "feat: add push notification token register/unregister endpoints"
```

---

### Task 8: Inspection Sync Endpoint

**Files:**
- Create: `apps/web/src/app/api/inspections/sync/route.ts`

- [ ] **Step 1: Create sync endpoint**

```typescript
// apps/web/src/app/api/inspections/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import sql from 'mssql';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { inspections } = await request.json();

    if (!Array.isArray(inspections) || inspections.length === 0) {
      return NextResponse.json(
        { success: false, error: 'inspections array is required' },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const results: Array<{ local_id: number; server_id: number; status: string }> = [];

    for (const inspection of inspections) {
      const transaction = pool.transaction();
      try {
        await transaction.begin();
        // Insert inspection
        const insertResult = await transaction.request()
          .input('vehicle_assetnum', inspection.vehicle_assetnum)
          .input('vehicle_regno', inspection.vehicle_regno)
          .input('inspection_type', inspection.inspection_type)
          .input('status', inspection.status || 'submitted')
          .input('inspector_id', user.userId)
          .input('booking_id', inspection.booking_id || null)
          .input('inspection_date', inspection.inspection_date || null)
          .input('mileage_reading', inspection.mileage_reading || null)
          .input('fuel_level', inspection.fuel_level || null)
          .input('cleanliness_interior', inspection.cleanliness_interior || null)
          .input('cleanliness_exterior', inspection.cleanliness_exterior || null)
          .input('exterior_condition', inspection.exterior_condition || null)
          .input('interior_condition', inspection.interior_condition || null)
          .input('functionality_check', inspection.functionality_check || null)
          .input('tire_condition', inspection.tire_condition || null)
          .input('safety_equipment', inspection.safety_equipment || null)
          .input('smell_condition', inspection.smell_condition || null)
          .input('overall_notes', inspection.overall_notes || null)
          .input('checklist_data', inspection.checklist_data ? JSON.stringify(inspection.checklist_data) : null)
          .input('accessories_present', inspection.accessories_present ? JSON.stringify(inspection.accessories_present) : null)
          .input('inspector_signature', inspection.inspector_signature || null)
          .input('customer_signature', inspection.customer_signature || null)
          .input('customer_acknowledged', inspection.customer_acknowledged ? 1 : 0)
          .input('gps_latitude', inspection.gps_latitude || null)
          .input('gps_longitude', inspection.gps_longitude || null)
          .query(`
            INSERT INTO inspections (
              vehicle_assetnum, vehicle_regno, inspection_type, status, inspector_id,
              booking_id, inspection_date, mileage_reading, fuel_level,
              cleanliness_interior, cleanliness_exterior,
              exterior_condition, interior_condition, functionality_check,
              tire_condition, safety_equipment, smell_condition, overall_notes,
              checklist_data, accessories_present,
              inspector_signature, customer_signature, customer_acknowledged,
              gps_latitude, gps_longitude, created_at, updated_at
            ) VALUES (
              @vehicle_assetnum, @vehicle_regno, @inspection_type, @status, @inspector_id,
              @booking_id, @inspection_date, @mileage_reading, @fuel_level,
              @cleanliness_interior, @cleanliness_exterior,
              @exterior_condition, @interior_condition, @functionality_check,
              @tire_condition, @safety_equipment, @smell_condition, @overall_notes,
              @checklist_data, @accessories_present,
              @inspector_signature, @customer_signature, @customer_acknowledged,
              @gps_latitude, @gps_longitude, GETDATE(), GETDATE()
            );
            SELECT SCOPE_IDENTITY() AS id;
          `);

        const serverId = insertResult.recordset[0].id;

        // Insert damage records if present
        if (Array.isArray(inspection.damages)) {
          for (const damage of inspection.damages) {
            await transaction.request()
              .input('inspection_id', serverId)
              .input('vehicle_assetnum', inspection.vehicle_assetnum)
              .input('diagram_view', damage.diagram_view)
              .input('diagram_x', damage.diagram_x)
              .input('diagram_y', damage.diagram_y)
              .input('zone', damage.zone || null)
              .input('damage_type', damage.damage_type)
              .input('severity', damage.severity)
              .input('description', damage.description || null)
              .input('is_pre_existing', damage.is_pre_existing ? 1 : 0)
              .input('estimated_repair_cost', damage.estimated_repair_cost || null)
              .input('charge_to_customer', damage.charge_to_customer ? 1 : 0)
              .query(`
                INSERT INTO inspection_damages (
                  inspection_id, vehicle_assetnum, diagram_view, diagram_x, diagram_y,
                  zone, damage_type, severity, description, is_pre_existing,
                  estimated_repair_cost, charge_to_customer, created_at, updated_at
                ) VALUES (
                  @inspection_id, @vehicle_assetnum, @diagram_view, @diagram_x, @diagram_y,
                  @zone, @damage_type, @severity, @description, @is_pre_existing,
                  @estimated_repair_cost, @charge_to_customer, GETDATE(), GETDATE()
                )
              `);
          }
        }

        await transaction.commit();

        await logAudit({
          userId: user.userId,
          action: 'mobile_sync_inspection',
          entityType: 'inspection',
          entityId: serverId.toString(),
          newValues: JSON.stringify({ local_id: inspection.local_id }),
        });

        results.push({
          local_id: inspection.local_id,
          server_id: serverId,
          status: 'synced'
        });
      } catch (err) {
        try { await transaction.rollback(); } catch { /* ignore rollback errors */ }
        console.error(`Sync failed for local_id ${inspection.local_id}:`, err);
        results.push({
          local_id: inspection.local_id,
          server_id: 0,
          status: 'failed'
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: 'Sync failed' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && npx next build
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/inspections/sync/route.ts
git commit -m "feat: add inspection batch sync endpoint for mobile offline upload"
```

---

### Task 9: OneDrive Photo Upload Endpoint

**Files:**
- Create: `apps/web/src/lib/onedrive.ts`
- Create: `apps/web/src/app/api/inspections/photos/upload/route.ts`

- [ ] **Step 1: Add Graph API dependencies**

```bash
cd apps/web && npm install @microsoft/microsoft-graph-client @azure/identity
```

- [ ] **Step 2: Add OneDrive env vars to .env.example**

Append to `apps/web/.env.example` (and `.env`):

```
# OneDrive (Microsoft Graph API)
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
ONEDRIVE_DRIVE_ID=
ONEDRIVE_ROOT_FOLDER=GBCR Inspections
```

- [ ] **Step 3: Create OneDrive helper**

```typescript
// apps/web/src/lib/onedrive.ts
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';

let graphClient: Client | null = null;

function getGraphClient(): Client {
  if (graphClient) return graphClient;

  const credential = new ClientSecretCredential(
    process.env.AZURE_TENANT_ID!,
    process.env.AZURE_CLIENT_ID!,
    process.env.AZURE_CLIENT_SECRET!
  );

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  });

  graphClient = Client.initWithMiddleware({ authProvider });
  return graphClient;
}

export async function uploadToOneDrive(
  vehicleAssetnum: string,
  inspectionDate: string,
  inspectionType: string,
  fileName: string,
  fileBuffer: Buffer
): Promise<string> {
  const client = getGraphClient();
  const driveId = process.env.ONEDRIVE_DRIVE_ID!;
  const rootFolder = process.env.ONEDRIVE_ROOT_FOLDER || 'GBCR Inspections';

  const folderPath = `${rootFolder}/${vehicleAssetnum}/${inspectionDate}_${inspectionType}`;
  const filePath = `${folderPath}/${fileName}`;

  // Upload file (creates folders automatically with conflict handling)
  const result = await client
    .api(`/drives/${driveId}/root:/${filePath}:/content`)
    .put(fileBuffer);

  return result.webUrl || result['@microsoft.graph.downloadUrl'] || filePath;
}
```

- [ ] **Step 4: Create photo upload endpoint**

```typescript
// apps/web/src/app/api/inspections/photos/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { getPool } from '@/lib/db';
import { uploadToOneDrive } from '@/lib/onedrive';

// App Router handles large formData natively for self-hosted Next.js.
// No special config needed — the default body limit is effectively unlimited.

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;
    const inspectionId = formData.get('inspection_id') as string;
    const photoType = (formData.get('photo_type') as string) || 'general';
    const gpsLatitude = formData.get('gps_latitude') as string | null;
    const gpsLongitude = formData.get('gps_longitude') as string | null;
    const damageRecordId = formData.get('damage_record_id') as string | null;

    if (!photo || !inspectionId) {
      return NextResponse.json(
        { success: false, error: 'photo file and inspection_id are required' },
        { status: 400 }
      );
    }

    // Verify inspection exists and get vehicle info
    const pool = await getPool();
    const inspectionResult = await pool.request()
      .input('id', parseInt(inspectionId))
      .query('SELECT vehicle_assetnum, inspection_type, inspection_date FROM inspections WHERE id = @id');

    if (inspectionResult.recordset.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Inspection not found' },
        { status: 404 }
      );
    }

    const inspection = inspectionResult.recordset[0];
    const buffer = Buffer.from(await photo.arrayBuffer());
    const timestamp = Date.now();
    const ext = photo.name?.split('.').pop() || 'jpg';
    const fileName = `${timestamp}-${photoType}.${ext}`;
    const inspectionDate = inspection.inspection_date
      ? new Date(inspection.inspection_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Upload to OneDrive
    const onedriveUrl = await uploadToOneDrive(
      inspection.vehicle_assetnum,
      inspectionDate,
      inspection.inspection_type,
      fileName,
      buffer
    );

    // Insert photo record
    const insertResult = await pool.request()
      .input('inspection_id', parseInt(inspectionId))
      .input('damage_record_id', damageRecordId ? parseInt(damageRecordId) : null)
      .input('photo_type', photoType)
      .input('file_path', '')  // empty — using onedrive_url
      .input('onedrive_url', onedriveUrl)
      .input('file_size', buffer.length)
      .input('captured_at', new Date().toISOString())
      .input('gps_latitude', gpsLatitude ? parseFloat(gpsLatitude) : null)
      .input('gps_longitude', gpsLongitude ? parseFloat(gpsLongitude) : null)
      .input('uploaded_by', user.userId)
      .query(`
        INSERT INTO inspection_photos (
          inspection_id, damage_record_id, photo_type, file_path, onedrive_url,
          file_size, captured_at, gps_latitude, gps_longitude, uploaded_by, created_at
        ) VALUES (
          @inspection_id, @damage_record_id, @photo_type, @file_path, @onedrive_url,
          @file_size, @captured_at, @gps_latitude, @gps_longitude, @uploaded_by, GETDATE()
        );
        SELECT SCOPE_IDENTITY() AS id;
      `);

    return NextResponse.json({
      success: true,
      data: {
        photo_id: insertResult.recordset[0].id,
        onedrive_url: onedriveUrl,
      }
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: Update Next.js config for large uploads**

In `apps/web/next.config.ts`, add body size limit for the upload route. For Next.js 16 with App Router, add to the route file:

```typescript
// Add at top of apps/web/src/app/api/inspections/photos/upload/route.ts
export const maxDuration = 60; // seconds
```

Note: Next.js App Router handles large form data natively. The default limit is ~4.5MB for Vercel but unlimited for self-hosted. If needed, configure in `next.config.ts`:

```typescript
experimental: {
  serverActions: {
    bodySizeLimit: '20mb',
  },
},
```

- [ ] **Step 6: Verify build**

```bash
cd apps/web && npx next build
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/onedrive.ts apps/web/src/app/api/inspections/photos/upload/ apps/web/.env.example
git commit -m "feat: add OneDrive photo upload endpoint via Microsoft Graph API"
```

---

### Task 10: App Config Endpoint

**Files:**
- Create: `apps/web/src/app/api/app-config/route.ts`

- [ ] **Step 1: Create app config endpoint**

```typescript
// apps/web/src/app/api/app-config/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      minVersion: '1.0.0',
      latestVersion: '1.0.0',
      forceUpdate: false,
    }
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/api/app-config/route.ts
git commit -m "feat: add app-config endpoint for mobile version enforcement"
```

---

## Phase 3: Expo App Scaffolding

Create the Expo app, set up navigation, and configure the development environment.

### Task 11: Initialize Expo App

**Files:**
- Create: `apps/mobile/` (entire Expo project)

- [ ] **Step 1: Create Expo app with expo-router template**

```bash
cd apps && npx create-expo-app@latest mobile --template tabs
```

- [ ] **Step 2: Update apps/mobile/package.json**

Set the package name and add workspace dependency:

```json
{
  "name": "@gbcr/mobile",
  ...
  "dependencies": {
    ...existing expo deps...,
    "@gbcr/shared": "workspace:*"
  }
}
```

- [ ] **Step 3: Install additional dependencies**

```bash
cd apps/mobile && npx expo install \
  expo-sqlite \
  expo-camera \
  expo-location \
  expo-notifications \
  expo-secure-store \
  expo-task-manager \
  expo-file-system \
  expo-image-manipulator \
  @react-native-community/netinfo \
  react-native-svg \
  react-native-signature-canvas \
  socket.io-client
```

- [ ] **Step 4: Update apps/mobile/tsconfig.json**

Add path alias for shared package:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@gbcr/shared": ["../../packages/shared/src/index.ts"]
    }
  }
}
```

- [ ] **Step 5: Install from root and verify**

```bash
cd /path/to/gbcr-platform && npm install
cd apps/mobile && npx expo start
```

Expected: Expo dev server starts, shows QR code

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/
git commit -m "feat: initialize Expo mobile app with dependencies"
```

---

### Task 12: Configure App Navigation

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/inspections.tsx`
- Create: `apps/mobile/app/(tabs)/chat.tsx`
- Create: `apps/mobile/app/(tabs)/alerts.tsx`
- Create: `apps/mobile/app/(tabs)/profile.tsx`
- Create: `apps/mobile/app/(auth)/login.tsx`
- Create: `apps/mobile/app/(auth)/_layout.tsx`

- [ ] **Step 1: Create root layout with auth context**

```typescript
// apps/mobile/app/_layout.tsx
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Create auth layout**

```typescript
// apps/mobile/app/(auth)/_layout.tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
```

- [ ] **Step 3: Create tab layout**

```typescript
// apps/mobile/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#888',
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="inspections"
        options={{
          title: 'Inspections',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'AI Chat',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 4: Create placeholder tab screens**

Create minimal placeholder screens for each tab:

```typescript
// apps/mobile/app/(tabs)/inspections.tsx
import { View, Text, StyleSheet } from 'react-native';

export default function InspectionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Inspections</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 24, fontWeight: '600' },
});
```

Repeat for `chat.tsx`, `alerts.tsx`, `profile.tsx` with appropriate titles.

- [ ] **Step 5: Verify navigation works**

```bash
cd apps/mobile && npx expo start
```

Expected: App shows tab bar with 4 tabs, each shows placeholder content

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/
git commit -m "feat: set up mobile app navigation with 4-tab layout"
```

---

### Task 13: Auth Context & API Client

**Files:**
- Create: `apps/mobile/contexts/AuthContext.tsx`
- Create: `apps/mobile/lib/api.ts`
- Create: `apps/mobile/lib/config.ts`

- [ ] **Step 1: Create config**

```typescript
// apps/mobile/lib/config.ts
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.x:3000'  // Replace with dev machine IP
  : 'https://gbcr.yourdomain.com';

export const SOCKET_URL = __DEV__
  ? 'http://192.168.1.x:3002'
  : 'https://gbcr-socket.yourdomain.com';
```

- [ ] **Step 2: Create API client with token management**

```typescript
// apps/mobile/lib/api.ts
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './config';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'gbcr_auth_token';
const USER_KEY = 'gbcr_user';

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function getStoredUser(): Promise<Record<string, unknown> | null> {
  const user = await SecureStore.getItemAsync(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export async function setStoredUser(user: Record<string, unknown>): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

async function refreshTokenIfNeeded(): Promise<string | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    const expiresIn = decoded.exp * 1000 - Date.now();
    const twoHours = 2 * 60 * 60 * 1000;

    if (expiresIn < twoHours && expiresIn > 0) {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data.token) {
          await setToken(data.data.token);
          return data.data.token;
        }
      }
    }
    return token;
  } catch {
    return token;
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await refreshTokenIfNeeded();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  // Only set Content-Type for non-FormData bodies
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}
```

- [ ] **Step 3: Create Auth context**

```typescript
// apps/mobile/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { apiFetch, setToken, clearToken, getToken, setStoredUser, getStoredUser } from '../lib/api';

interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  branch_id: number | null;
  mustChangePassword: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  // Check stored auth on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const stored = await getStoredUser();
          if (stored) {
            setUser(stored as unknown as AuthUser);
          } else {
            // Validate token with server
            const res = await apiFetch('/api/auth/me');
            if (res.ok) {
              const data = await res.json();
              setUser(data.data);
              await setStoredUser(data.data);
            } else {
              await clearToken();
            }
          }
        }
      } catch {
        await clearToken();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/inspections');
    }
  }, [user, segments, isLoading]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Login failed');
    }

    await setToken(data.data.token);
    const authUser: AuthUser = {
      id: data.data.id,
      email: data.data.email,
      full_name: data.data.full_name,
      role: data.data.role,
      branch_id: data.data.branch_id,
      mustChangePassword: data.data.mustChangePassword,
    };
    await setStoredUser(authUser as unknown as Record<string, unknown>);
    setUser(authUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

- [ ] **Step 4: Install jwt-decode**

```bash
cd apps/mobile && npm install jwt-decode
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/contexts/ apps/mobile/lib/
git commit -m "feat: add auth context and API client with token management"
```

---

### Task 14: Login Screen

**Files:**
- Create: `apps/mobile/app/(auth)/login.tsx`

- [ ] **Step 1: Create login screen**

```typescript
// apps/mobile/app/(auth)/login.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>GBCR Mobile</Text>
        <Text style={styles.subtitle}>Field Inspector App</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fc' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#6366f1', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb',
  },
  button: {
    backgroundColor: '#6366f1', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2: Verify login flow works**

```bash
cd apps/mobile && npx expo start
```

Expected: App shows login screen, can enter credentials and authenticate against the API

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(auth\)/login.tsx
git commit -m "feat: add mobile login screen with auth integration"
```

---

## Phase 4: Offline Database & Sync Engine

Set up SQLite for local inspection storage and the sync engine.

### Task 15: SQLite Database Setup

**Files:**
- Create: `apps/mobile/lib/database.ts`

- [ ] **Step 1: Create database module**

```typescript
// apps/mobile/lib/database.ts
import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('gbcr_mobile.db');
  await initializeDatabase(db);
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS local_inspections (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER,
      inspector_id INTEGER NOT NULL,
      booking_id INTEGER,
      vehicle_assetnum TEXT NOT NULL,
      vehicle_regno TEXT NOT NULL,
      inspection_type TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      inspection_date TEXT,
      mileage_reading REAL,
      fuel_level REAL,
      cleanliness_interior INTEGER,
      cleanliness_exterior INTEGER,
      exterior_condition TEXT,
      interior_condition TEXT,
      functionality_check TEXT,
      tire_condition TEXT,
      safety_equipment TEXT,
      smell_condition TEXT,
      overall_notes TEXT,
      checklist_data TEXT,
      accessories_present TEXT,
      inspector_signature TEXT,
      customer_signature TEXT,
      customer_acknowledged INTEGER DEFAULT 0,
      gps_latitude REAL,
      gps_longitude REAL,
      sync_status TEXT DEFAULT 'pending_sync',
      sync_error TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS local_damages (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_local_id INTEGER REFERENCES local_inspections(local_id),
      vehicle_assetnum TEXT NOT NULL,
      diagram_view TEXT NOT NULL,
      diagram_x REAL,
      diagram_y REAL,
      zone TEXT,
      damage_type TEXT,
      severity TEXT,
      description TEXT,
      is_pre_existing INTEGER DEFAULT 0,
      estimated_repair_cost REAL,
      charge_to_customer INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS local_photos (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      inspection_local_id INTEGER REFERENCES local_inspections(local_id),
      local_file_path TEXT NOT NULL,
      photo_type TEXT,
      gps_latitude REAL,
      gps_longitude REAL,
      uploaded INTEGER DEFAULT 0
    );
  `);
}

// -- Inspection CRUD --

export async function saveLocalInspection(inspection: Record<string, unknown>): Promise<number> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO local_inspections (
      inspector_id, booking_id, vehicle_assetnum, vehicle_regno,
      inspection_type, status, inspection_date, mileage_reading, fuel_level,
      cleanliness_interior, cleanliness_exterior, exterior_condition, interior_condition,
      functionality_check, tire_condition, safety_equipment, smell_condition, overall_notes,
      checklist_data, accessories_present, inspector_signature, customer_signature,
      customer_acknowledged, gps_latitude, gps_longitude, sync_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_sync', ?, ?)`,
    [
      inspection.inspector_id, inspection.booking_id || null,
      inspection.vehicle_assetnum, inspection.vehicle_regno,
      inspection.inspection_type, inspection.status || 'draft',
      inspection.inspection_date || null, inspection.mileage_reading || null,
      inspection.fuel_level || null, inspection.cleanliness_interior || null,
      inspection.cleanliness_exterior || null, inspection.exterior_condition || null,
      inspection.interior_condition || null, inspection.functionality_check || null,
      inspection.tire_condition || null, inspection.safety_equipment || null,
      inspection.smell_condition || null, inspection.overall_notes || null,
      inspection.checklist_data ? JSON.stringify(inspection.checklist_data) : null,
      inspection.accessories_present ? JSON.stringify(inspection.accessories_present) : null,
      inspection.inspector_signature || null, inspection.customer_signature || null,
      inspection.customer_acknowledged ? 1 : 0,
      inspection.gps_latitude || null, inspection.gps_longitude || null,
      now, now
    ]
  );
  return result.lastInsertRowId;
}

export async function updateLocalInspection(
  localId: number,
  updates: Record<string, unknown>
): Promise<void> {
  const db = await getDatabase();
  const fields = Object.keys(updates);
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f => updates[f]);
  values.push(new Date().toISOString());
  values.push(localId);

  await db.runAsync(
    `UPDATE local_inspections SET ${setClause}, updated_at = ? WHERE local_id = ?`,
    values
  );
}

export async function getLocalInspections(syncStatus?: string): Promise<unknown[]> {
  const db = await getDatabase();
  if (syncStatus) {
    return db.getAllAsync(
      'SELECT * FROM local_inspections WHERE sync_status = ? ORDER BY created_at DESC',
      [syncStatus]
    );
  }
  return db.getAllAsync('SELECT * FROM local_inspections ORDER BY created_at DESC');
}

export async function getLocalInspection(localId: number): Promise<unknown | null> {
  const db = await getDatabase();
  return db.getFirstAsync('SELECT * FROM local_inspections WHERE local_id = ?', [localId]);
}

export async function getPendingSyncCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM local_inspections WHERE sync_status = ?',
    ['pending_sync']
  );
  return result?.count || 0;
}

// -- Damage CRUD --

export async function saveDamage(damage: Record<string, unknown>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO local_damages (
      inspection_local_id, vehicle_assetnum, diagram_view, diagram_x, diagram_y,
      zone, damage_type, severity, description, is_pre_existing,
      estimated_repair_cost, charge_to_customer
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      damage.inspection_local_id, damage.vehicle_assetnum,
      damage.diagram_view, damage.diagram_x, damage.diagram_y,
      damage.zone || null, damage.damage_type, damage.severity,
      damage.description || null, damage.is_pre_existing ? 1 : 0,
      damage.estimated_repair_cost || null, damage.charge_to_customer ? 1 : 0
    ]
  );
  return result.lastInsertRowId;
}

export async function getDamagesForInspection(inspectionLocalId: number): Promise<unknown[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM local_damages WHERE inspection_local_id = ?',
    [inspectionLocalId]
  );
}

// -- Photo CRUD --

export async function savePhotoRecord(photo: Record<string, unknown>): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO local_photos (
      inspection_local_id, local_file_path, photo_type, gps_latitude, gps_longitude, uploaded
    ) VALUES (?, ?, ?, ?, ?, 0)`,
    [
      photo.inspection_local_id, photo.local_file_path,
      photo.photo_type || 'general',
      photo.gps_latitude || null, photo.gps_longitude || null
    ]
  );
  return result.lastInsertRowId;
}

export async function getPhotosForInspection(inspectionLocalId: number): Promise<unknown[]> {
  const db = await getDatabase();
  return db.getAllAsync(
    'SELECT * FROM local_photos WHERE inspection_local_id = ?',
    [inspectionLocalId]
  );
}

export async function markPhotoUploaded(localId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE local_photos SET uploaded = 1 WHERE local_id = ?', [localId]);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/lib/database.ts
git commit -m "feat: add SQLite database module for offline inspection storage"
```

---

### Task 16: Sync Engine

**Files:**
- Create: `apps/mobile/lib/sync.ts`
- Create: `apps/mobile/lib/network.ts`

- [ ] **Step 1: Create network utility**

```typescript
// apps/mobile/lib/network.ts
import NetInfo from '@react-native-community/netinfo';

export async function isWifiConnected(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.type === 'wifi' && state.isConnected === true;
}

export function onConnectivityChange(callback: (isWifi: boolean) => void) {
  return NetInfo.addEventListener((state) => {
    callback(state.type === 'wifi' && state.isConnected === true);
  });
}
```

- [ ] **Step 2: Create sync engine**

```typescript
// apps/mobile/lib/sync.ts
import { apiFetch } from './api';
import {
  getLocalInspections,
  getDamagesForInspection,
  getPhotosForInspection,
  updateLocalInspection,
  markPhotoUploaded,
} from './database';
import { isWifiConnected } from './network';
import { API_BASE_URL } from './config';
import * as SecureStore from 'expo-secure-store';

const MAX_RETRIES = 5;

export async function syncPendingInspections(): Promise<{
  synced: number;
  failed: number;
  skipped: number;
}> {
  const wifi = await isWifiConnected();
  if (!wifi) return { synced: 0, failed: 0, skipped: 0 };

  const pending = await getLocalInspections('pending_sync') as Array<Record<string, unknown>>;
  const failed = await getLocalInspections('failed') as Array<Record<string, unknown>>;
  const toSync = [...pending, ...failed];

  if (toSync.length === 0) return { synced: 0, failed: 0, skipped: 0 };

  let syncedCount = 0;
  let failedCount = 0;

  // Prepare batch payload
  const inspectionsPayload = [];
  for (const inspection of toSync) {
    const damages = await getDamagesForInspection(inspection.local_id as number);
    inspectionsPayload.push({
      local_id: inspection.local_id,
      vehicle_assetnum: inspection.vehicle_assetnum,
      vehicle_regno: inspection.vehicle_regno,
      inspection_type: inspection.inspection_type,
      status: inspection.status,
      inspection_date: inspection.inspection_date,
      mileage_reading: inspection.mileage_reading,
      fuel_level: inspection.fuel_level,
      cleanliness_interior: inspection.cleanliness_interior,
      cleanliness_exterior: inspection.cleanliness_exterior,
      exterior_condition: inspection.exterior_condition,
      interior_condition: inspection.interior_condition,
      functionality_check: inspection.functionality_check,
      tire_condition: inspection.tire_condition,
      safety_equipment: inspection.safety_equipment,
      smell_condition: inspection.smell_condition,
      overall_notes: inspection.overall_notes,
      checklist_data: inspection.checklist_data ? JSON.parse(inspection.checklist_data as string) : null,
      accessories_present: inspection.accessories_present ? JSON.parse(inspection.accessories_present as string) : null,
      inspector_signature: inspection.inspector_signature,
      customer_signature: inspection.customer_signature,
      customer_acknowledged: inspection.customer_acknowledged === 1,
      gps_latitude: inspection.gps_latitude,
      gps_longitude: inspection.gps_longitude,
      damages: damages,
    });

    await updateLocalInspection(inspection.local_id as number, { sync_status: 'syncing' });
  }

  try {
    const res = await apiFetch('/api/inspections/sync', {
      method: 'POST',
      body: JSON.stringify({ inspections: inspectionsPayload }),
    });

    if (!res.ok) throw new Error(`Sync API returned ${res.status}`);

    const data = await res.json();

    for (const result of data.results) {
      if (result.status === 'synced') {
        await updateLocalInspection(result.local_id, {
          server_id: result.server_id,
          sync_status: 'synced',
          sync_error: null,
        });
        // Upload photos for this inspection
        await uploadPhotosForInspection(result.local_id, result.server_id);
        syncedCount++;
      } else {
        await updateLocalInspection(result.local_id, {
          sync_status: 'failed',
          sync_error: 'Server rejected inspection',
        });
        failedCount++;
      }
    }
  } catch (error) {
    // Mark all as failed
    for (const inspection of toSync) {
      await updateLocalInspection(inspection.local_id as number, {
        sync_status: 'failed',
        sync_error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    failedCount = toSync.length;
  }

  return { synced: syncedCount, failed: failedCount, skipped: 0 };
}

async function uploadPhotosForInspection(
  localInspectionId: number,
  serverInspectionId: number
): Promise<void> {
  const photos = await getPhotosForInspection(localInspectionId) as Array<Record<string, unknown>>;
  const pending = photos.filter(p => p.uploaded === 0);

  const token = await SecureStore.getItemAsync('gbcr_auth_token');

  for (const photo of pending) {
    try {
      const formData = new FormData();

      // Create file object for React Native
      const fileUri = photo.local_file_path as string;
      const fileName = fileUri.split('/').pop() || 'photo.jpg';

      formData.append('photo', {
        uri: fileUri,
        name: fileName,
        type: 'image/jpeg',
      } as unknown as Blob);
      formData.append('inspection_id', serverInspectionId.toString());
      formData.append('photo_type', (photo.photo_type as string) || 'general');
      if (photo.gps_latitude) formData.append('gps_latitude', String(photo.gps_latitude));
      if (photo.gps_longitude) formData.append('gps_longitude', String(photo.gps_longitude));

      const res = await fetch(`${API_BASE_URL}/api/inspections/photos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        await markPhotoUploaded(photo.local_id as number);
      }
    } catch (error) {
      console.error(`Photo upload failed for local_id ${photo.local_id}:`, error);
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/sync.ts apps/mobile/lib/network.ts
git commit -m "feat: add sync engine for offline inspection upload with photo support"
```

---

## Phase 5: Inspection Feature

Build the core inspection screens — list, creation form, damage marking, photo capture, and signatures.

### Task 17: Inspection List Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/inspections.tsx`
- Create: `apps/mobile/app/inspection/new.tsx`
- Create: `apps/mobile/app/inspection/[id].tsx`

- [ ] **Step 1: Build inspection list screen**

Replace the placeholder `inspections.tsx` with a full list view that:
- Shows local inspections from SQLite with status badges
- Pull-to-refresh triggers sync when on WiFi
- Filter chips for status (All, Draft, In Progress, Submitted, Synced)
- FAB button to create new inspection
- Each row shows: vehicle reg, type, date, status, sync status
- Offline queue indicator at top showing pending sync count
- Tapping a row navigates to `inspection/[localId]`

The screen should use `getLocalInspections()` from the database module and `syncPendingInspections()` from the sync engine on pull-to-refresh.

- [ ] **Step 2: Verify list renders**

```bash
cd apps/mobile && npx expo start
```

Expected: Inspections tab shows empty state "Start your first inspection"

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/inspections.tsx
git commit -m "feat: add inspection list screen with sync and filtering"
```

---

### Task 18: New Inspection Form — Vehicle & Type Selection

**Files:**
- Create: `apps/mobile/app/inspection/new.tsx`
- Create: `apps/mobile/components/VehicleSearch.tsx`

- [ ] **Step 1: Create vehicle search component**

A search input that queries the fleet API (`/api/fleet?search=...`) and displays matching vehicles. When a vehicle is selected, it passes `vehicle_assetnum` and `vehicle_regno` back.

- [ ] **Step 2: Create new inspection screen (Step 1 of multi-step form)**

Screen with:
- Vehicle search and selection
- Inspection type picker (Pre-Rental, Post-Return, Ad-Hoc)
- "Next" button to proceed to condition checklist
- GPS location auto-captured on screen mount via `expo-location`

Use React state to accumulate form data across steps. Store in a `useReducer` with steps: `vehicle` → `condition` → `damage` → `photos` → `signatures` → `review`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/inspection/new.tsx apps/mobile/components/VehicleSearch.tsx
git commit -m "feat: add inspection form step 1 — vehicle and type selection"
```

---

### Task 19: Condition Checklist Step

**Files:**
- Create: `apps/mobile/components/ConditionChecklist.tsx`

- [ ] **Step 1: Create condition checklist component**

A scrollable form with:
- Mileage reading (numeric input)
- Fuel level (slider 0-100)
- Cleanliness interior (1-5 star rating)
- Cleanliness exterior (1-5 star rating)
- Exterior condition (dropdown: excellent/good/fair/poor)
- Interior condition (dropdown)
- Tire condition (dropdown)
- Safety equipment (dropdown)
- Functionality check (dropdown)
- Smell condition (dropdown)
- Overall notes (multiline text)
- "Next" and "Back" buttons

- [ ] **Step 2: Integrate into new inspection flow**

Wire up as step 2 of the multi-step form in `new.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/ConditionChecklist.tsx apps/mobile/app/inspection/new.tsx
git commit -m "feat: add condition checklist step to inspection form"
```

---

### Task 20: Damage Marking Step

**Files:**
- Create: `apps/mobile/components/DamageDiagram.tsx`
- Create: `apps/mobile/components/DamageModal.tsx`
- Create: `apps/mobile/assets/vehicle-diagrams/` (SVG assets)

- [ ] **Step 1: Create vehicle SVG diagrams**

Create simplified SVG vehicle outlines for 5 views: top, front, rear, left, right. These are `react-native-svg` components that render a vehicle outline.

- [ ] **Step 2: Create damage diagram component**

Interactive component that:
- Shows view selector tabs (Top, Front, Rear, Left, Right)
- Renders the vehicle SVG for the selected view
- Touch-to-mark: tapping on the diagram places a damage marker at that position
- Existing markers shown as colored circles (red for new, grey for pre-existing)
- Tapping a marker opens the damage detail modal

- [ ] **Step 3: Create damage detail modal**

Modal form with:
- Damage type (scratch, dent, crack, chip, stain, other)
- Severity (minor, moderate, severe)
- Description (text)
- Is pre-existing (toggle)
- Estimated repair cost (numeric)
- Charge to customer (toggle)
- Save / Delete buttons

Each saved damage calls `saveDamage()` from the database module.

- [ ] **Step 4: Integrate into inspection form flow**

Wire up as step 3 of the multi-step form.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/DamageDiagram.tsx apps/mobile/components/DamageModal.tsx apps/mobile/assets/
git commit -m "feat: add interactive damage diagram with touch-to-mark"
```

---

### Task 21: Photo Capture Step

**Files:**
- Create: `apps/mobile/components/PhotoCapture.tsx`
- Create: `apps/mobile/lib/camera.ts`

- [ ] **Step 1: Create camera utility**

Helper that:
- Requests camera and location permissions
- Opens camera via `expo-camera` or `expo-image-picker`
- Captures GPS coordinates via `expo-location`
- Compresses photo via `expo-image-manipulator` (max 1920px, 80% JPEG quality)
- Saves compressed photo to `expo-file-system` document directory
- Returns: `{ localPath, gpsLatitude, gpsLongitude }`

- [ ] **Step 2: Create photo capture component**

Grid view showing:
- Captured photos as thumbnails
- "Add Photo" button that opens camera
- Swipe-to-delete on photos
- Photo count indicator
- Each captured photo saved to SQLite via `savePhotoRecord()`

- [ ] **Step 3: Integrate into inspection form flow**

Wire up as step 4 of the multi-step form.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/PhotoCapture.tsx apps/mobile/lib/camera.ts
git commit -m "feat: add photo capture with GPS and compression for inspections"
```

---

### Task 22: Signature Capture Step

**Files:**
- Create: `apps/mobile/components/SignatureCapture.tsx`

- [ ] **Step 1: Create signature capture component**

Uses `react-native-signature-canvas` to provide:
- Inspector signature pad with "Clear" and "Save" buttons
- Customer signature pad (separate)
- Customer acknowledged checkbox
- Signatures stored as base64 PNG strings in the inspection data

- [ ] **Step 2: Create review & submit step**

Final step showing a summary of the entire inspection:
- Vehicle info
- Condition readings
- Damage count
- Photo count
- Signatures preview
- "Save as Draft" and "Submit" buttons
- On submit: saves to SQLite with status `submitted` and `sync_status: pending_sync`
- If WiFi available, triggers immediate sync

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/SignatureCapture.tsx apps/mobile/app/inspection/new.tsx
git commit -m "feat: add signature capture and review step to inspection form"
```

---

### Task 23: Inspection Detail Screen

**Files:**
- Create: `apps/mobile/app/inspection/[id].tsx`

- [ ] **Step 1: Create inspection detail screen**

Read-only view of a completed inspection:
- Header with vehicle info and status badge
- Condition readings
- Damage diagram (non-interactive, showing marked damages)
- Photo gallery (scrollable thumbnails, tap to expand)
- Signatures display
- Sync status with retry button if failed
- If `server_id` exists, show as "Synced to server"

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/inspection/\[id\].tsx
git commit -m "feat: add inspection detail view screen"
```

---

## Phase 6: AI Chat

### Task 24: AI Chat Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/chat.tsx`
- Create: `apps/mobile/components/ChatBubble.tsx`

- [ ] **Step 1: Create chat bubble component**

Styled message bubble with:
- User messages aligned right (indigo background, white text)
- AI messages aligned left (gray background)
- Timestamp below each message
- Loading indicator (typing dots) for AI response

- [ ] **Step 2: Build chat screen**

Replace placeholder with full chat interface:
- Message list (FlatList, inverted for newest at bottom)
- Text input with send button
- Quick prompt chips above input: "Fleet status", "Idle vehicles", "Upcoming maintenance"
- No-WiFi banner: "Connect to WiFi to use AI Chat"
- SSE streaming: consume the existing `/api/ai/chat` endpoint which returns server-sent events
- Parse SSE format: `data: {JSON}\n\n` lines, accumulate assistant message token by token
- Conversation stored in React state (not persisted — chat resets on app restart)

- [ ] **Step 3: Verify chat works**

```bash
cd apps/mobile && npx expo start
```

Expected: AI Chat tab shows chat interface, can send messages and receive streaming responses

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/chat.tsx apps/mobile/components/ChatBubble.tsx
git commit -m "feat: add AI chat screen with SSE streaming"
```

---

## Phase 7: Push Notifications & Alerts

### Task 25: Push Notification Setup

**Files:**
- Create: `apps/mobile/lib/notifications.ts`
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Create notification module**

```typescript
// apps/mobile/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // Register with server
  await apiFetch('/api/push/register', {
    method: 'POST',
    body: JSON.stringify({
      expo_push_token: token,
      device_platform: Platform.OS,
    }),
  });

  return token;
}

export async function unregisterPushToken(token: string): Promise<void> {
  await apiFetch('/api/push/unregister', {
    method: 'DELETE',
    body: JSON.stringify({ expo_push_token: token }),
  });
}
```

- [ ] **Step 2: Register push token after login**

In `AuthContext.tsx`, after successful login, call `registerForPushNotifications()`. Store the push token so it can be unregistered on logout.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/notifications.ts apps/mobile/contexts/AuthContext.tsx
git commit -m "feat: add push notification registration and handling"
```

---

### Task 26: Alerts Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/alerts.tsx`

- [ ] **Step 1: Build alerts screen**

Replace placeholder with:
- List of received notifications (stored in React state, populated from notification listener)
- Each notification shows: title, body, timestamp
- Unread indicator (bold text)
- Pull-to-refresh
- Empty state: "No notifications yet"
- Notification listener that adds new push notifications to the list

Use `Notifications.addNotificationReceivedListener()` and `Notifications.addNotificationResponseReceivedListener()` to capture notifications.

- [ ] **Step 2: Add badge count to tab**

In `(tabs)/_layout.tsx`, add a badge to the Alerts tab showing unread notification count.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/alerts.tsx apps/mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat: add alerts screen with notification list and badge count"
```

---

## Phase 8: Profile & Polish

### Task 27: Profile Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: Build profile screen**

Replace placeholder with:
- User info card: name, email, role, branch
- Connection status indicator (WiFi connected / disconnected)
- Sync status: pending count, last sync time
- "Sync Now" button (calls `syncPendingInspections()`)
- Logout button with confirmation dialog
- If unsynced inspections exist, show warning before logout
- App version number at bottom

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(tabs\)/profile.tsx
git commit -m "feat: add profile screen with sync status and logout"
```

---

### Task 28: Offline Queue Screen

**Files:**
- Create: `apps/mobile/app/inspection/queue.tsx`

- [ ] **Step 1: Build offline queue screen**

Accessible from inspections tab header:
- List of inspections with `sync_status = pending_sync` or `failed`
- Each shows: vehicle, type, date, sync status, error message if failed
- "Retry" button per item
- "Sync All" button at top
- WiFi status banner
- Pull-to-refresh triggers sync

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/inspection/queue.tsx
git commit -m "feat: add offline sync queue screen with retry support"
```

---

### Task 29: Password Change Screen

**Files:**
- Create: `apps/mobile/app/(auth)/change-password.tsx`
- Modify: `apps/mobile/contexts/AuthContext.tsx`

- [ ] **Step 1: Create change password screen**

Screen with:
- Current password input
- New password input
- Confirm new password input
- "Change Password" button
- Calls existing `/api/auth/change-password` endpoint
- On success, clears `mustChangePassword` flag and navigates to tabs

- [ ] **Step 2: Add routing logic in AuthContext**

After login, if `mustChangePassword` is true, redirect to `/(auth)/change-password` instead of `/(tabs)/inspections`. Only allow navigation to tabs after password is changed.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(auth\)/change-password.tsx apps/mobile/contexts/AuthContext.tsx
git commit -m "feat: add first-login password change screen"
```

---

### Task 30: Web App Photo Display Update

**Files:**
- Modify: `apps/web/src/app/api/inspections/[id]/photos/route.ts`
- Modify: `apps/web/src/types/inspection.ts` (add `onedrive_url` to `InspectionPhoto`)

- [ ] **Step 1: Update InspectionPhoto type**

In `packages/shared/src/types/inspection.ts`, add `onedrive_url` to the `InspectionPhoto` interface:

```typescript
export interface InspectionPhoto {
  id: number;
  inspection_id: number;
  damage_record_id: number | null;
  photo_type: string;
  file_path: string;
  onedrive_url: string | null;  // <-- add this
  file_size: number | null;
  captured_at: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  uploaded_by: number;
  created_at: string;
}
```

- [ ] **Step 2: Update photo display logic in web components**

In any web component that displays inspection photos, update the image source to check `onedrive_url` first, then fall back to `file_path`:

```typescript
const photoUrl = photo.onedrive_url || `/api/files/${photo.file_path}`;
```

- [ ] **Step 3: Update the GET photos API to include onedrive_url**

In `apps/web/src/app/api/inspections/[id]/photos/route.ts`, ensure the SELECT query includes the `onedrive_url` column.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/ apps/web/src/
git commit -m "feat: support OneDrive photo URLs in web inspection display"
```

---

### Task 31: App Version Check on Startup

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/components/ForceUpdateScreen.tsx`

- [ ] **Step 1: Create force update screen**

A full-screen overlay that shows "A new version is required" with a link to the app store. Displayed when the app version is below `minVersion` from `/api/app-config`.

- [ ] **Step 2: Add version check to root layout**

On app startup (in `_layout.tsx`), call `/api/app-config` and compare the response's `minVersion` against the current app version (from `expo-constants`). If `forceUpdate` is true and version is below minimum, show the `ForceUpdateScreen` overlay.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/_layout.tsx apps/mobile/components/ForceUpdateScreen.tsx
git commit -m "feat: add app version check and force update screen"
```

---

### Task 32: App Configuration & EAS Setup

**Files:**
- Create: `apps/mobile/app.json` (update existing)
- Create: `apps/mobile/eas.json`

- [ ] **Step 1: Update app.json**

Configure the Expo app with:
- `name`: "GBCR Mobile"
- `slug`: "gbcr-mobile"
- `scheme`: "gbcr"
- iOS bundle identifier: `com.goldbell.gbcr-mobile`
- Android package: `com.goldbell.gbcrmobile`
- Required permissions: camera, location, notifications, media library
- Splash screen and icon placeholders

- [ ] **Step 2: Create eas.json**

```json
{
  "cli": { "version": ">= 15.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app.json apps/mobile/eas.json
git commit -m "feat: configure Expo app and EAS build settings"
```

---

### Task 33: Final Integration Test & Cleanup

- [ ] **Step 1: Verify monorepo builds from root**

```bash
npm run build:web
```

Expected: Web app builds successfully

- [ ] **Step 2: Verify mobile app starts**

```bash
cd apps/mobile && npx expo start
```

Expected: App starts, shows login, can navigate all tabs

- [ ] **Step 3: Test end-to-end flow**

1. Login with existing credentials
2. Create a new inspection (fill all steps)
3. Save inspection (goes to SQLite)
4. Connect to WiFi
5. Pull-to-refresh on inspection list (triggers sync)
6. Verify inspection appears on web platform
7. Test AI Chat with a fleet query
8. Check push notification registration

- [ ] **Step 4: Update .gitignore**

Ensure root `.gitignore` includes:
```
.superpowers/
.turbo
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final integration cleanup for GBCR mobile app v1"
```

---

## Developer Account Setup Guide

After the app is built, these accounts need to be created:

1. **Apple Developer Program** — Enroll at developer.apple.com ($99/year). Required for TestFlight and App Store.
2. **Google Play Developer** — Register at play.google.com/console ($25 one-time). Required for Play Store.
3. **Expo EAS** — Create account at expo.dev (free tier). Link to project with `eas login`.
4. **Azure AD App Registration** — In Azure Portal → App Registrations → New. Grant `Files.ReadWrite.All` application permission. Create client secret. Add credentials to `.env`.

## Build & Deploy

```bash
# Development build (requires dev accounts)
cd apps/mobile
eas build --platform all --profile development

# Production build
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```
