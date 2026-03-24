# GBCR Mobile App — Design Spec

**Date:** 2026-03-24
**Status:** Draft

## Overview

A field-focused mobile app for GBCR staff built with Expo (React Native), deployed to both iOS and Android. The app targets inspectors and field staff, providing vehicle inspections with offline capability, AI-powered fleet chat, and push notifications — while admin, analytics, and heavy management remain on the existing web platform.

## Goals

- Enable field staff to complete vehicle inspections on mobile with camera, GPS, damage marking, and signatures
- Provide offline inspection capability with automatic sync when connected to company WiFi
- Bring the AI fleet assistant to mobile for quick field queries
- Push real-time notifications to staff devices
- Upload inspection photos to OneDrive via Microsoft Graph API

## Architecture

### Monorepo Structure (Turborepo)

```
gbcr-platform/
├── apps/
│   ├── web/              ← existing Next.js app (moved from src/)
│   └── mobile/           ← new Expo app
├── packages/
│   ├── shared/           ← TypeScript types, constants, utils
│   └── api-client/       ← typed HTTP client for all API endpoints
├── turbo.json
└── package.json          ← workspace root
```

The existing Next.js app moves from root into `apps/web/`. A shared package extracts common TypeScript types from `src/lib/types.ts` and `src/types/`. Both apps consume the shared package.

### Step 0: Monorepo Migration (prerequisite)

Before any mobile development, migrate the existing project into the monorepo structure as an isolated, testable change:

1. Create `apps/web/` and move `src/`, `public/`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `tailwind.config.ts` into it
2. Move `server.js` (Socket.io) into `apps/web/` alongside the Next.js app
3. Update all import path aliases (`@/` → relative to new `apps/web/src/`)
4. Move relevant dependencies from root `package.json` into `apps/web/package.json`
5. Extract shared types from `src/lib/types.ts` and `src/types/` into `packages/shared/`
6. Set up Turborepo with `turbo.json` and root `package.json` workspaces
7. Update `storage/` directory references to use an absolute or env-configured path
8. Update `.env` loading to work from the new `apps/web/` location
9. Verify the web app builds and runs correctly from the new location
10. Commit and deploy to confirm no regressions

### Data Flow

```
Mobile App (Expo) → Next.js API (existing routes) → MSSQL (MAXDB76 + Platform)
```

- Mobile consumes the existing Next.js API — no separate backend
- 4 new API endpoints added to the existing API (see below)
- Expo Push Notifications via EAS for cross-platform push

### Authentication — Mobile Adaptation

The existing web auth uses `httpOnly` cookies (`setTokenCookie()` in `src/lib/auth.ts`), which are incompatible with React Native (no browser cookie jar). Required backend changes:

1. **Modify `/api/auth/login`** to return the JWT in the response body (e.g., `{ token, user }`) in addition to setting the cookie (backward-compatible with web)
2. **Update `getTokenFromRequest()`** in `src/lib/auth.ts` to check for `Authorization: Bearer <token>` header as a fallback when no cookie is present
3. **Mobile stores JWT** in `expo-secure-store` (encrypted, platform-native keychain/keystore)
4. **Mobile sends JWT** as `Authorization: Bearer <token>` header on every request via the shared API client
5. **Login response format** follows existing envelope: `{ success: true, data: { token, user: { id, email, full_name, role, branch_id, mustChangePassword } } }`
6. **Token refresh:** Current JWT TTL is 24 hours. Add a `/api/auth/refresh` endpoint that issues a new token when the current one is within 2 hours of expiry. The mobile API client checks token expiry before each request and silently refreshes. If the token is fully expired, redirect to login screen.

### Offline Sync

1. Inspector fills out inspection form (photos, damage marks, signatures, readings)
2. Data saved to local SQLite (`expo-sqlite`) with status `pending_sync`. Photos saved to app's local file system (`expo-file-system`), referenced by path in SQLite.
3. `@react-native-community/netinfo` detects WiFi connectivity
4. **Primary sync path:** When the user opens the app or pulls-to-refresh on the offline queue screen, the sync engine runs immediately if WiFi is available
5. **Background sync (best-effort):** `expo-task-manager` attempts sync when WiFi returns. Note: iOS heavily throttles background tasks — foreground sync is the reliable path.
6. Sync sequence: (a) upload inspection JSON to `/api/inspections/sync`, (b) receive server-generated IDs, (c) upload photos to `/api/inspections/photos/upload` referencing server IDs
7. Local record marked `synced` with green checkmark in offline queue screen
8. Retry with exponential backoff on failure (max 5 retries)
9. If user logs out with unsynced inspections, show warning dialog and prevent logout until synced or explicitly discarded

#### SQLite Local Schema

```sql
-- Local inspections (mirrors server Inspection interface, adds sync metadata)
CREATE TABLE local_inspections (
  local_id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id INTEGER,              -- NULL until synced
  inspector_id INTEGER NOT NULL,  -- from logged-in user
  booking_id INTEGER,
  vehicle_assetnum TEXT NOT NULL,
  vehicle_regno TEXT NOT NULL,
  inspection_type TEXT NOT NULL,   -- 'pre_rental' | 'post_return' | 'ad_hoc'
  status TEXT DEFAULT 'draft',     -- 'draft' | 'in_progress' | 'submitted'
  inspection_date TEXT,
  mileage_reading REAL,
  fuel_level REAL,                -- numeric (0-100)
  cleanliness_interior INTEGER,   -- 1-5
  cleanliness_exterior INTEGER,   -- 1-5
  exterior_condition TEXT,
  interior_condition TEXT,
  functionality_check TEXT,
  tire_condition TEXT,
  safety_equipment TEXT,
  smell_condition TEXT,
  overall_notes TEXT,
  checklist_data TEXT,            -- JSON string
  accessories_present TEXT,       -- JSON string
  inspector_signature TEXT,       -- base64 PNG
  customer_signature TEXT,        -- base64 PNG
  customer_acknowledged INTEGER DEFAULT 0,
  gps_latitude REAL,
  gps_longitude REAL,
  sync_status TEXT DEFAULT 'pending_sync',  -- 'pending_sync' | 'syncing' | 'synced' | 'failed'
  sync_error TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- Local damage records (mirrors server DamageRecord interface)
CREATE TABLE local_damages (
  local_id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_local_id INTEGER REFERENCES local_inspections(local_id),
  vehicle_assetnum TEXT NOT NULL,
  diagram_view TEXT NOT NULL,     -- 'top' | 'front' | 'rear' | 'left' | 'right'
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

-- Local photo references
CREATE TABLE local_photos (
  local_id INTEGER PRIMARY KEY AUTOINCREMENT,
  inspection_local_id INTEGER REFERENCES local_inspections(local_id),
  local_file_path TEXT NOT NULL,   -- expo-file-system path
  photo_type TEXT,                 -- 'general' | 'damage' | 'condition'
  gps_latitude REAL,
  gps_longitude REAL,
  uploaded INTEGER DEFAULT 0       -- 0 = pending, 1 = uploaded to OneDrive
);
```

### Photo Storage — OneDrive

Photos upload to a shared OneDrive via Microsoft Graph API, organized by vehicle:

```
GBCR Inspections/
└── SLK1234A/
    └── 2026-03-24_pre-rental/
        ├── photo_001.jpg
        ├── photo_002.jpg
        └── damage_front_001.jpg
```

- **Azure AD app registration** with client credentials flow (application permissions: `Files.ReadWrite.All`). Client ID and secret stored as server environment variables.
- **Server-side upload:** Mobile sends photo to Next.js API → API uploads to OneDrive via `@microsoft/microsoft-graph-client` → returns OneDrive URL. This avoids exposing Graph API credentials to the mobile app.
- **Next.js body size limit** increased to 20MB for the photo upload route (configured per-route in Next.js config)
- **Photo compression on-device:** Max 1920px dimension, 80% JPEG quality, GPS EXIF preserved. Target ~500KB-1MB per photo.
- Add `onedrive_url` column to the existing `inspection_photos` table (nullable, alongside existing `file_path`). Web-uploaded photos continue using `file_path`; mobile-uploaded photos populate `onedrive_url`.
- Display logic checks `onedrive_url` first, falls back to `file_path`

### Push Notifications

```
Next.js API (event trigger) → Expo Push Server SDK → APNs/FCM → Device
```

**Notification triggers:**
- Inspection approved/rejected by reviewer
- New inspection assigned to user
- Offline sync completed/failed
- System alerts from admin

Push tokens stored in a new `PUSH_TOKENS` table linked to the user.

## Mobile App Screens

### Tab Navigation (4 tabs)

**1. Inspections Tab**
- Inspection list with status filters (Draft, In Progress, Submitted, Reviewed, Approved)
- New Inspection form (multi-step):
  - Vehicle selection (search by registration)
  - Inspection type (Pre-Rental, Post-Return, Ad-Hoc)
  - Condition checklist (mileage, fuel, cleanliness 1-5, exterior/interior/tire/safety)
  - Damage marking — interactive SVG vehicle diagram (top, front, rear, left, right views) with touch-to-mark
  - Photo capture — native camera with GPS metadata, stored locally then synced to OneDrive
  - Signature capture — touch canvas for inspector and customer signatures
- Inspection detail / review screen
- Offline queue status (pending sync items with retry option)

**2. AI Chat Tab**
- Chat interface (same GPT-4o-mini integration as web)
- Conversation history
- Quick prompt buttons for common fleet queries
- Requires WiFi connectivity

**3. Alerts Tab**
- Notification center (list of received push notifications)
- Push notification preferences/settings
- Badge count on tab icon

**4. Profile Tab**
- User info (name, role, branch)
- Logout
- App version and sync status
- Connection status indicator

### Auth Screens (pre-login)
- Login screen (reuses existing JWT auth via `/api/auth/login`)
- First-login password change (matching existing web flow)

## New API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/push/register` | Register device push token (Expo push token + user ID) |
| `DELETE` | `/api/push/unregister` | Remove push token on logout |
| `POST` | `/api/inspections/sync` | Batch upload offline inspections (see sync contract below) |
| `POST` | `/api/inspections/photos/upload` | Upload photo to OneDrive via Graph API, return URL |

### Sync Endpoint Contract

**`POST /api/inspections/sync`**

Field names match the existing `Inspection` and `DamageRecord` interfaces in `src/types/inspection.ts`. `inspector_id` is derived from the authenticated user's JWT token on the server side.

Request body:
```json
{
  "inspections": [
    {
      "local_id": 1,
      "vehicle_assetnum": "SLK1234A",
      "vehicle_regno": "SLK1234A",
      "inspection_type": "pre_rental",
      "status": "submitted",
      "inspection_date": "2026-03-24T10:30:00Z",
      "mileage_reading": 45230,
      "fuel_level": 75,
      "cleanliness_interior": 4,
      "cleanliness_exterior": 4,
      "exterior_condition": "good",
      "interior_condition": "good",
      "tire_condition": "good",
      "safety_equipment": "good",
      "functionality_check": "good",
      "smell_condition": "good",
      "overall_notes": "Vehicle in good condition",
      "inspector_signature": "<base64>",
      "customer_signature": "<base64>",
      "customer_acknowledged": true,
      "gps_latitude": 1.3521,
      "gps_longitude": 103.8198,
      "checklist_data": {},
      "accessories_present": {},
      "damages": [
        {
          "diagram_view": "front",
          "diagram_x": 120.5,
          "diagram_y": 80.3,
          "zone": "bumper",
          "damage_type": "scratch",
          "severity": "minor",
          "description": "Small scratch on bumper",
          "is_pre_existing": false,
          "estimated_repair_cost": 150.00,
          "charge_to_customer": true
        }
      ]
    }
  ]
}
```

Response body:
```json
{
  "results": [
    {
      "local_id": 1,
      "server_id": 456,
      "status": "synced"
    }
  ]
}
```

Photos are uploaded separately after sync, referencing the `server_id` returned.

**`POST /api/inspections/photos/upload`**

Multipart form data: `photo` (file), `inspection_id` (server ID), `photo_type`, `gps_latitude`, `gps_longitude`. Returns `{ onedrive_url, photo_id }`.

## New Database Tables

### PUSH_TOKENS
| Column | Type | Description |
|--------|------|-------------|
| id | INT (PK) | Auto-increment |
| user_id | INT (FK) | Reference to USERS table |
| expo_push_token | NVARCHAR(255) | Expo push token |
| device_platform | NVARCHAR(10) | 'ios' or 'android' |
| is_active | BIT | Default 1, set to 0 when token becomes invalid |
| created_at | DATETIME | Token registration time |
| updated_at | DATETIME | Last updated |

Unique constraint on `expo_push_token`. A user can have multiple devices (multiple tokens). Invalid tokens detected via Expo push receipts API and marked `is_active = 0`.

### Schema Modifications to Existing Tables

**inspection_photos** — Add column:
| Column | Type | Description |
|--------|------|-------------|
| onedrive_url | NVARCHAR(500) | Nullable. OneDrive URL for mobile-uploaded photos |

## Key Libraries

| Purpose | Library | Notes |
|---------|---------|-------|
| Navigation | `expo-router` | File-based routing (like Next.js) |
| Camera | `expo-camera` | Photo capture for inspections |
| Location | `expo-location` | GPS coordinates for photos |
| Offline DB | `expo-sqlite` | Local inspection storage |
| Push | `expo-notifications` | Cross-platform push via EAS |
| Background Sync | `expo-task-manager` | Sync inspections when on WiFi |
| Network | `@react-native-community/netinfo` | Detect WiFi connectivity |
| Signatures | `react-native-signature-canvas` | Touch-based signature capture |
| Damage Diagram | `react-native-svg` | Interactive vehicle damage marking |
| Real-time | `socket.io-client` | Same as web app |
| OneDrive | `@microsoft/microsoft-graph-client` | Photo upload via Graph API |
| Auth tokens | `expo-secure-store` | Secure JWT storage on device |

## Developer Account Setup

- **Apple Developer Program** ($99/year) — Required for App Store and TestFlight distribution
- **Google Play Developer** ($25 one-time) — Required for Play Store distribution
- **Expo EAS** (free tier) — Build and submit service for both platforms
- **Azure AD App Registration** (included with M365) — For OneDrive Graph API access

## Connectivity Model

- App connects via **company WiFi** — no cellular data considerations
- Offline mode for inspections when away from WiFi (parking basements, outdoor lots)
- AI Chat and push notifications require WiFi connectivity
- Sync engine checks for WiFi specifically (not just any network)

## Permission Handling

The app requires several device permissions. Handle gracefully when denied:

| Permission | Required For | If Denied |
|-----------|-------------|-----------|
| Camera | Inspection photos | Show explanation and link to settings |
| Location | GPS on photos | Photos work without GPS, show warning |
| Push Notifications | Alerts tab | Alerts tab shows in-app notifications only |
| Photo Library | Save/select photos | Fallback to camera-only |

## Error & Empty States

- **No inspections:** Empty state with "Start your first inspection" CTA
- **No WiFi for AI Chat:** "Connect to WiFi to use AI Chat" with retry button
- **Sync failed:** Red badge on offline queue, tap to see error details and retry
- **Camera unavailable:** Disable photo button, allow text-only inspection with warning

## API Versioning

With web and mobile clients consuming the same API, breaking changes are risky since mobile updates are not instant. Strategy:
- New mobile-specific endpoints (push, sync) use standard `/api/` paths since they are new and have no existing consumers
- When modifying existing shared endpoints, add backward-compatible changes (additive fields, optional params) rather than breaking changes
- Deprecation warnings returned in response headers before removing old fields
- Minimum supported mobile app version enforced via a `/api/app-config` endpoint that returns `{ minVersion, latestVersion, forceUpdate }`

## Out of Scope (v1)

- Fleet management / vehicle inventory browsing
- Booking creation and management
- Analytics and reporting
- Customer management
- Work order / service tracking
- Customer-facing features
- Biometric authentication
- Over-the-air updates (can be added post-launch)
