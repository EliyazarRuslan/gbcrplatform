# Midnight Lux UI Redesign — Light Variant

**Date:** 2026-04-01
**Status:** Approved

## Overview

Redesign the GBCR Platform UI from the current "Modern Industrial" aesthetic to "Midnight Lux Light" — a bold, high-contrast white-background design with Sora font, dark gold accents, and strong typographic hierarchy.

## Design Decisions

- **Font**: Sora (replace Outfit) — weights 200–800, geometric and modern
- **Mono font**: JetBrains Mono (keep) — for reg numbers, rates, data values
- **Color palette**: High-contrast light theme
  - Primary text: `#0a0a0a` (near-black)
  - Secondary text: `#3a3a3a`
  - Tertiary text: `#6a6a6a`
  - Muted text: `#999999`
  - Gold accent: `#8a6914`
  - Gold hover: `#6d5310`
  - Background surface: `#f5f5f7`
  - Card background: `#ffffff`
  - Borders: `rgba(0,0,0,0.10)`
  - Success: `#15803d`, Warning: `#a16207`, Danger: `#b91c1c`, Info: `#1d4ed8`, Violet: `#6d28d9`
- **Sidebar**: Dark (`#0e0e10`), collapsed icon-only (68px), gold active indicator bar
- **Typography scale**: Bold throughout
  - Page headings: 34px, weight 600
  - KPI values: 42px, weight 700
  - KPI labels: 12px, weight 600, uppercase
  - Card titles: 14px, weight 700, uppercase
  - Table rows: 15px, weight 500
  - Table headers: 11px, weight 700, uppercase
  - Body/labels: 13-14px, weight 500-600
- **Cards**: White bg, 1px border `rgba(0,0,0,0.10)`, 16px radius, gold border on hover
- **Tables**: Dot-based status indicators (8px colored dots), no chunky badges
- **Animations**: Fade-up on load (500ms staggered), gold glow on card hover

## Scope

All pages: Dashboard, Fleet, Bookings, Inspections, Services, Customers, Analytics, AI, Settings, Login.

## Files to Modify

1. `src/app/layout.tsx` — Change font from Outfit to Sora
2. `src/app/globals.css` — Update all CSS variables, colors, typography scale
3. `src/app/(dashboard)/layout.tsx` — Redesign sidebar to collapsed icon-only dark style
4. `src/app/(dashboard)/page.tsx` — Dashboard with new KPI card style
5. `src/components/ui/StatCard.tsx` — Bigger, bolder numbers
6. `src/components/ui/StatusBadge.tsx` — Dot-based status indicators
7. All page files — Apply new font sizes and weights
8. `src/app/(auth)/login/page.tsx` — Update login page to match new aesthetic
