# Real Estate Monorepo — Project Status & Brain Memory

> **Last Updated**: September 2026  
> **Repository**: `banarasikumar/real_estate` (Branch: `main`)  
> **Active Environment**: Windows (PowerShell) | Node.js / Turborepo / Expo SDK 57 / Next.js 15 / Supabase

---

## 1. Executive Summary

This repository contains an end-to-end multi-platform Real Estate SaaS application connecting Property Owners, Property Seekers, and Platform Admins. 

The monorepo is structured with **Turborepo** and **npm workspaces**, sharing backend clients, TypeScript definitions, and UI logic across mobile and web clients.

---

## 2. Monorepo Architecture & Applications

```
real_estate/
├── apps/
│   ├── owner-app/       # Mobile App for Property Owners (Expo SDK 57 / React Native)
│   ├── user-app/        # Mobile App for Property Seekers (Expo SDK 57 / React Native)
│   ├── admin-panel/     # Web Admin Dashboard (Next.js 15 / Tailwind CSS)
│   └── customer-web/    # Public Discovery Web Portal (Next.js 15 / Tailwind CSS)
├── packages/
│   ├── api/             # Supabase client singleton, data fetching, mutations
│   ├── types/           # Shared TypeScript database & application types
│   └── ui/              # Shared cross-platform design tokens / components
├── supabase/
│   └── migrations/      # 5 SQL migrations applied (Schema, Realtime Chat, RLS, Admin Roles)
└── docs/                # Architecture docs, schema diagrams, and quotations
```

### Shared Technology Stack:
- **Backend & DB**: Supabase (PostgreSQL, Row Level Security, Auth, Realtime Channel, S3-compatible Storage)
- **Mobile Runtime**: Expo SDK 57 (React Native 0.76+, Expo Router, react-native-safe-area-context, react-native-gesture-handler)
- **Web Runtime**: Next.js 15 App Router, React 19, Tailwind CSS
- **Monorepo Engine**: Turborepo

---

## 3. Database & SQL Migrations (Complete)

All 8 migrations reside in `supabase/migrations/` and have been pushed to the remote Supabase database:
1. `00000000000000_initial_schema.sql`: Profiles, properties, property_media, enquiries, saved_properties.
2. `00000000000001_realtime_chat.sql`: `messages` table with sender/receiver IDs, enquiry linking, and realtime pub/sub.
3. `00000000000002_property_lifecycle.sql`: Property status enum and transition security rules.
4. `00000000000003_admin_roles_rls.sql`: Admin privileges and review access.
5. `00000000000004_enquiries_fix.sql`: Foreign key relationships and RLS adjustments for enquiries.
6. `00000000000005_soft_delete_and_owner_delete.sql`: Soft delete (`deleted_at`), owner DELETE RLS policy, and performance indexes.
7. `00000000000006_realtime_notifications_and_badges.sql`: Message `read_at`, `push_token`, participant UPDATE RLS for `is_read`, full replica identity on `messages`, and realtime publication on `enquiries`.
8. `00000000000007_message_delivered_status.sql`: Zillow professional message delivery status with `delivered_at`, indexes, and participant update RLS policies.
9. `00000000000008_property_coordinates_index.sql`: Composite B-Tree indexes on `(latitude, longitude)` and `(status, latitude, longitude) WHERE deleted_at IS NULL` for bounding-box search queries.

---

## 4. Current Web Map Architecture (`apps/customer-web`)

The discovery map is implemented in `apps/customer-web/src/components/MapboxView.tsx`:
- **Engine**: MapLibre GL JS (pure open-source WebGL map renderer).
- **Basemap Providers (100% Free, Zero API Keys, Unlimited Forever)**:
  - **Streets Mode**: Esri World Light Gray Canvas (`Canvas/World_Light_Gray_Base` + `Canvas/World_Light_Gray_Reference`). Muted, high-contrast background that makes property markers stand out like Airbnb.
  - **Satellite Mode**: Esri World Imagery (`World_Imagery/MapServer`). High-resolution global satellite photography.
- **Strict Zoom & Tile Boundary Enforcement (Fixed & Verified)**:
  - **Streets**: Source `maxzoom: 16` (Esri documented tile limit for India/Europe/Americas), Camera `maxZoom: 16`.
  - **Satellite**: Source `maxzoom: 19` (empirically confirmed valid tiles for India), Camera `maxZoom: 19`.
  - **Layer `maxzoom: 24`**: Set high because layer `maxzoom` is **exclusive** in MapLibre. Keeping layer `maxzoom: 24` ensures the layer never disappears at zoom 15/16/18/19, preventing blank canvas errors.
  - **Minimum Zoom**: `minZoom: 3` (prevents disorienting whole-globe zoom-out).
- **Zillow-Style Freehand Border Drawing**:
  - Pen/lasso drawing tool allows seekers to circle any neighborhood or polygon on the map.
  - Interactive point-in-polygon filtering isolates listings exclusively within the drawn boundary.
  - Clear / Redraw controls with dynamic GeoJSON styling.
- **Search as I Move the Map**:
  - Floating top toggle ("Search as I move the map").
  - 300ms debounced bounding-box queries (`north`, `south`, `east`, `west`) sent directly to `@repo/api` indexed coordinate search.
- **Price Chip Markers**:
  - Styled with Solid Brand Rose (`#e11d48` / `bg-rose-600 text-white font-bold`).
  - Active/Selected state: Deep Rose (`#be123c`).
  - Viewed state: Soft Rose/Slate (`#ffe4e6` / `#9f1239`).
  - Interactive micro-card preview popup on tap with property photo, specs, and direct route to `/property/[id]`.

---

## 5. Mobile Applications Status (`owner-app` & `user-app`)

- **Owner App (`apps/owner-app`)**:
  - 4:3 aspect-ratio image cropper with framing memory, zoom slider, touch panning, and batch crop execution.
  - Complete listing lifecycle: Create (`PENDING_APPROVAL`), Edit (amber banner re-approval warning), Soft Delete to Trash (30 days countdown), Permanent Delete, and Restore.
  - Professional Zillow message delivery ticks (Clock 🕒 -> Single Tick ✓ -> Double Gray Tick ✓✓).
  - Geocoding and coordinate capture on address input.
- **User App (`apps/user-app`)**:
  - Feed with Google Maps (`react-native-maps`) and custom Brand Rose price badges.
  - Bounding box search as region changes.
  - Realtime messaging with Zillow delivery ticks and unread badges.

---

## 6. Next Plan: Mapbox Vector Tiles ("Stunning UI" Initiative)

### The Strategy:
To give the web discovery map the identical high-end, bespoke visual quality of Airbnb (vector-sharp typography, customized porcelain landuse, soft pastel road network, 3D building extrusions, and fluid 60fps camera transitions):

1. **Safety & Branch Isolation**:
   - The current `main` branch is **100% stable, fully committed, and completely free** (zero external keys needed).
   - In the next session/conversation, create a dedicated branch:
     ```bash
     git checkout -b feature/mapbox-stunning-ui
     ```
2. **Implementation Scope for `feature/mapbox-stunning-ui`**:
   - Add `NEXT_PUBLIC_MAPBOX_TOKEN` configuration to `apps/customer-web/.env.local`.
   - Upgrade `MapboxView.tsx` to utilize official Mapbox Vector Tiles (or custom Mapbox Studio style url `mapbox://styles/...`).
   - Implement elegant 3D building extrusions on tilt/pitch.
   - Configure smooth fractional zoom animations.
   - Graceful fallback: If `NEXT_PUBLIC_MAPBOX_TOKEN` is unset or invalid, automatically fall back to the rock-solid Esri Light Canvas setup on `main`.
3. **Billing Awareness**:
   - Mapbox provides **50,000 free web map loads per month** under pay-as-you-go.
   - Commercial real estate terms will be kept in mind as traffic scales.

---

## 7. Active Ports & Commands

| Application | Command | Port |
|---|---|---|
| `customer-web` | `npm run dev --workspace=customer-web` | `http://localhost:3000` |
| `admin-panel` | `npm run dev --workspace=admin-panel` | `http://localhost:3001` |
| `owner-app` | `npm run dev --workspace=owner-app` | `http://localhost:8082` |
| `user-app` | `npm run dev --workspace=user-app` | `http://localhost:8081` |
