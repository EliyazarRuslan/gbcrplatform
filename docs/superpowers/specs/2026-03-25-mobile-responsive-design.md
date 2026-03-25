# GBCR Platform — Mobile-Responsive Web Version Design Spec

**Date:** 2026-03-25
**Status:** Draft

## Overview

Make the existing GBCR platform fully responsive for mobile browsers, add bottom tab navigation for mobile, and add PWA support so field staff can install it to their home screen. The desktop UI remains untouched. No backend changes required.

## Goals

- All pages usable on mobile screens (320px–768px)
- Bottom tab navigation on mobile with "More" menu for secondary pages
- PWA support (home screen install, app icon, splash screen, offline static asset caching)
- Touch-optimized inspection form (camera capture, damage marking, signatures)
- Desktop experience unchanged

## Approach

This is a CSS/layout/component-level change using Tailwind's responsive utilities. The existing app already uses Tailwind CSS 4. We add responsive breakpoints to existing components, create a mobile navigation layout, and add PWA configuration.

### Detection Strategy

Use Tailwind's responsive prefixes (`md:`, `lg:`) and CSS media queries. The breakpoint threshold:
- **Mobile:** < 768px (default styles)
- **Desktop:** >= 768px (`md:` prefix)

Design mobile-first: base styles target mobile, `md:` overrides add desktop layout.

## Navigation

### Desktop (unchanged)
Existing sidebar navigation remains as-is for screens >= 768px.

### Mobile (< 768px)
- **Remove existing mobile sidebar** — The existing `Sidebar.tsx` already has a mobile hamburger menu + slide-out drawer (lines 117-140). This must be fully removed (hamburger button, overlay, slide-out panel) and replaced with the bottom tab bar. The desktop sidebar remains unchanged.
- **Bottom tab bar** — Fixed to the bottom of the screen. Tab bar height defined as CSS custom property `--mobile-nav-height: 4rem` for coordination with FAB and AI chat input positioning.
- **Role-based tab filtering** — The `MobileNav` receives `userRole` and filters visible tabs based on role permissions (matching existing sidebar role filtering logic). The 5 tabs below are the maximum set; roles with fewer permissions see fewer tabs.
  1. **Dashboard** — `/` (home icon)
  2. **Inspections** — `/inspections` (clipboard icon)
  3. **Fleet** — `/fleet` (car icon)
  4. **AI Chat** — `/ai` (chat icon)
  5. **More** — Opens a slide-up menu with remaining role-appropriate items:
     - Bookings (`/bookings`)
     - Analytics (`/analytics`)
     - Services (`/services`)
     - Customers (`/customers`)
     - Settings (`/settings`)
- **Active tab** highlighted with accent color
- **iOS safe area** — Bottom padding includes `env(safe-area-inset-bottom)` for iPhones with home indicator in standalone PWA mode
- **Top header** — Simplified for mobile: app title + notification bell + profile avatar. No breadcrumbs.

### Mobile Navigation Component

Create `src/components/layout/MobileNav.tsx`:
- Fixed position bottom bar with `padding-bottom: calc(0.5rem + env(safe-area-inset-bottom))`
- SVG icons for each tab
- Active state indicator
- Role-based filtering of tabs and "More" menu items (receives `userRole` prop)
- "More" tab opens a bottom sheet/drawer with secondary nav items
- Only renders on mobile (hidden on `md:` and above)
- Exports `--mobile-nav-height` CSS variable for use by FAB and AI chat input

### Layout Changes

Modify `src/app/(dashboard)/layout.tsx`:
- Desktop: sidebar (existing) + main content
- Mobile: main content + bottom tab bar (no sidebar)
- Use Tailwind `hidden md:block` pattern
- Main content area padding: `p-3 md:p-6` (reduced on mobile for more usable width on 320px screens)
- Main content area bottom padding includes `var(--mobile-nav-height)` on mobile to avoid tab bar overlap

## Page-by-Page Responsive Changes

### Dashboard (Home Page)
- **Desktop:** Grid of stat cards + charts
- **Mobile:** Single column stack, stat cards in 2-column grid, charts full-width with horizontal scroll for wide charts

### Fleet Page
- **Desktop:** Data table with columns
- **Mobile:** Card list — each vehicle as a card showing: registration, status badge, make/model, category. Tap to expand or navigate to detail. Search bar at top. Filter chips horizontally scrollable.

### Fleet Detail Page
- **Desktop:** Multi-column layout with vehicle info + work orders + overrides
- **Mobile:** Single column stack with collapsible sections

### Bookings Page
- **Desktop:** Data table
- **Mobile:** Card list — each booking as a card with vehicle, customer, dates, status badge. Filters as horizontally scrollable chips. Create booking button as FAB (floating action button).

### Bookings Calendar
- **Desktop:** Full calendar grid
- **Mobile:** Vertical day/week view or list view toggle

### Inspections Page
- **Desktop:** Data table with filters
- **Mobile:** Card list — each inspection as a card with vehicle reg, type, date, status badge, inspector name. Filters as scrollable chips. "New Inspection" FAB.

### Inspection Detail/Form
- **Desktop:** Multi-column layout
- **Mobile:** Full-width single column, multi-step form:
  - Step 1: Vehicle + type selection
  - Step 2: Condition checklist (stacked inputs)
  - Step 3: Damage diagram (full-width SVG, touch-to-mark)
  - Step 4: Photo capture (grid of thumbnails + camera button)
  - Step 5: Signatures (full-width canvas)
  - Step 6: Review + submit
  - Step navigation via "Next"/"Back" buttons at bottom
  - Form state preserved across steps via `useReducer` in a parent container (steps don't unmount state)

### Inspection Photo Capture (Mobile)
- Use `<input type="file" accept="image/*" capture="environment">` to open the native camera
- GPS capture via `navigator.geolocation.getCurrentPosition()`
- Photos display as thumbnail grid
- Existing upload flow to `./storage/` unchanged

### Inspection Damage Diagram (Mobile)
- Full-width SVG with view tabs (Top, Front, Rear, Left, Right)
- Touch events (`onTouchStart`) for placing damage markers
- Existing SVG diagram components work — just need full-width layout
- Damage detail form opens as a bottom sheet modal instead of side panel

### Inspection Signatures (Mobile)
- Full-width signature canvas
- Existing canvas-based signature component works on touch screens
- "Clear" and "Done" buttons below canvas

### Services Page
- **Desktop:** Data table
- **Mobile:** Card list with work order number, vehicle, status, type, dates

### Service Detail Page
- **Desktop:** Multi-column
- **Mobile:** Single column stack

### Customers Page
- **Desktop:** Data table
- **Mobile:** Card list with customer name, active rentals count, revenue, status

### Analytics Page
- **Desktop:** Dashboard grid with multiple charts
- **Mobile:** Single column stack, charts full-width. Bar/line charts with horizontal scroll if needed. Stat cards in 2-column grid.

### AI Chat Page
- **Desktop:** Chat panel (possibly with sidebar)
- **Mobile:** Full-screen chat. Input pinned to bottom at `bottom: var(--mobile-nav-height)` above the tab bar. Messages fill the screen. Quick prompt chips horizontally scrollable above input.

### Settings Page
- **Desktop:** Settings form with sidebar sections
- **Mobile:** Single column, sections as expandable accordion or stacked

### User Management Page
- **Desktop:** Data table
- **Mobile:** Card list with user name, role, status, branch

### Login Page
- Already likely responsive (centered form). Verify it works on mobile viewport.

### Change Password Page
- Already likely responsive (centered form). Verify it works on mobile viewport.

## Shared Mobile UI Patterns

### Data Tables → Card Lists
Create a reusable pattern for converting data tables to mobile card lists. Note: the existing `DataTable` component at `src/components/ui/data-table.tsx` is a custom implementation with its own `Column<T>` interface (not `@tanstack/react-table` directly).
- Create `src/components/ui/ResponsiveTable.tsx` that wraps the existing custom `DataTable` component
- On desktop (>= 768px): render the existing table
- On mobile (< 768px): render a card list view
- Each card shows key fields with labels
- Tap to navigate to detail page
- The component accepts a `mobileCard` render prop for custom card layout per page

### Modals → Bottom Sheets
On mobile, modals that appear centered on desktop should slide up from the bottom:
- Create `src/components/ui/ResponsiveModal.tsx`
- Desktop: centered modal (existing behavior)
- Mobile: bottom sheet that slides up, max-height 90vh, draggable to dismiss

### Forms
- All form inputs stack vertically on mobile
- Labels above inputs (not beside)
- Larger touch targets (min 44px height)
- Select dropdowns: modify the existing custom `src/components/ui/select.tsx` to conditionally render native `<select>` on mobile (< 768px) for better touch UX, keeping the custom dropdown on desktop
- All input font sizes >= 16px to prevent iOS auto-zoom on focus

### Floating Action Button (FAB)
- Create `src/components/ui/FAB.tsx`
- Fixed position at `bottom: calc(var(--mobile-nav-height) + 1rem)` to sit above the tab bar
- Used for primary actions: "New Inspection", "New Booking"
- Hidden on desktop (desktop uses regular buttons)

## PWA Configuration

### Web App Manifest
Update the existing `public/manifest.json` (already exists) with mobile-optimized settings:
```json
{
  "id": "gbcr-platform",
  "name": "GBCR Platform",
  "short_name": "GBCR",
  "description": "Goldbell Car Rental Fleet Management",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#f0f2f5",
  "theme_color": "#d4941c",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

Note: `theme_color` uses the app's actual brand gold (`#d4941c` from `globals.css`), not indigo.

### Service Worker
Create a manual service worker at `public/sw.js` (do NOT use `next-pwa` — it is unmaintained and incompatible with Next.js 16 App Router):
- **Cache static assets** (JS bundles, CSS, images, fonts) for fast loading
- **Network-first for API calls** — always fetch fresh data, no offline data caching
- **Offline fallback page** — Show "Connect to WiFi to use GBCR" when fully offline
- No background sync, no offline data storage — keep it simple
- Register the service worker from a client component in the root layout via `useEffect` with `'serviceWorker' in navigator` check

### Meta Tags
Use Next.js Metadata API in `src/app/layout.tsx` (the root layout already uses `export const metadata`). Do NOT add raw `<meta>` tags — extend the existing metadata export:

```typescript
export const metadata: Metadata = {
  // ...existing fields...
  manifest: '/manifest.json',
  themeColor: '#d4941c',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GBCR',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',  // required for safe area insets
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
  },
};
```

Do NOT use `maximum-scale=1` — it blocks pinch-to-zoom accessibility (WCAG 1.4.4). iOS auto-zoom on input focus is prevented by ensuring all input font sizes >= 16px.

### App Icons
Create icons at `public/icons/`:
- `icon-192.png` (192x192)
- `icon-512.png` (512x512)
- `icon-512-maskable.png` (512x512, maskable purpose for Android adaptive icons)
- `apple-touch-icon.png` (180x180)

## Files Changed/Created

### New Files
| File | Purpose |
|------|---------|
| `src/components/layout/MobileNav.tsx` | Bottom tab bar + "More" menu |
| `src/components/layout/MobileHeader.tsx` | Simplified top header for mobile |
| `src/components/ui/ResponsiveTable.tsx` | Table on desktop, card list on mobile |
| `src/components/ui/ResponsiveModal.tsx` | Centered modal on desktop, bottom sheet on mobile |
| `src/components/ui/FAB.tsx` | Floating action button for mobile |
| `src/components/ui/BottomSheet.tsx` | Slide-up bottom sheet component |
| `src/components/layout/ServiceWorkerRegistration.tsx` | Client component to register SW |
| `public/sw.js` | Service worker |
| `public/icons/icon-192.png` | PWA icon 192px |
| `public/icons/icon-512.png` | PWA icon 512px |
| `public/icons/apple-touch-icon.png` | iOS home screen icon |
| `public/offline.html` | Offline fallback page |

### Modified Files
| File | Change |
|------|--------|
| `src/app/(dashboard)/layout.tsx` | Add mobile nav, hide sidebar on mobile, adjust content padding |
| `src/app/layout.tsx` | Add PWA metadata, service worker registration component |
| `src/components/layout/Sidebar.tsx` | Remove existing mobile hamburger/drawer code (lines 117-140) |
| `src/components/ui/select.tsx` | Add native `<select>` rendering on mobile |
| `src/components/ui/data-table.tsx` | Reference for ResponsiveTable wrapper |
| `public/manifest.json` | Update with PWA fields (already exists) |
| `src/app/(dashboard)/page.tsx` | Responsive dashboard grid |
| `src/app/(dashboard)/fleet/page.tsx` | Table → responsive table with mobile cards |
| `src/app/(dashboard)/fleet/[assetnum]/page.tsx` | Single column on mobile |
| `src/app/(dashboard)/bookings/page.tsx` | Table → responsive table with mobile cards |
| `src/app/(dashboard)/bookings/calendar/page.tsx` | Compact calendar on mobile |
| `src/app/(dashboard)/inspections/page.tsx` | Table → responsive table with mobile cards |
| `src/app/(dashboard)/inspections/[id]/page.tsx` | Multi-step mobile form, full-width damage diagram |
| `src/app/(dashboard)/services/page.tsx` | Table → responsive table with mobile cards |
| `src/app/(dashboard)/services/[wonum]/page.tsx` | Single column on mobile |
| `src/app/(dashboard)/customers/page.tsx` | Table → responsive table with mobile cards |
| `src/app/(dashboard)/analytics/page.tsx` | Single column charts on mobile |
| `src/app/(dashboard)/ai/page.tsx` | Full-screen chat on mobile |
| `src/app/(dashboard)/settings/page.tsx` | Single column on mobile |
| `src/app/(dashboard)/settings/users/page.tsx` | Table → responsive table with mobile cards |
| `src/components/inspection/*` | Touch-optimized damage diagram, camera input, signature canvas |

## Out of Scope

- Backend/API changes — none needed
- Database changes — none needed
- Offline data persistence (inspection drafts, etc.) — data requires network
- Push notifications — not available reliably on mobile web
- New features — this is purely a responsive/UI effort
- Monorepo migration — not needed
- Photo storage changes — existing `./storage/` path unchanged
