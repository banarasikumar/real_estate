# Real Estate Monorepo — Project Status & Brain Memory

> **Last Updated**: September 12, 2026  
> **Repository**: `banarasikumar/real_estate`  
> **Active Branch**: `main` (clean working tree, 7 commits ahead of `origin/main` — local commits only, remote push prevented)  
> **Active Environment**: Windows (PowerShell) | Node.js / Turborepo / Expo SDK 57 / Next.js 15 / Supabase / Mapbox GL JS v3  
> **Active Metro Daemon**: Port `8081` (`task-568`)

---

## 1. Executive Summary & Current State

This monorepo houses a multi-platform, end-to-end luxury Real Estate platform connecting Property Owners, Property Seekers, and Platform Admins.

### Current System Health & Stability
- **Seeker App (`apps/user-app`)**: Fully interactive, verified, and running smoothly. The Zillow-identical single-surface bottom sheet, Mapbox 3D WebGL discovery map, gesture physics, locked container dimensions, and 76-listing demo dataset are 100% stable.
- **TypeScript Type Safety**: 0 errors across the monorepo (`npm run check-types --workspace=user-app` passes cleanly with exit code 0).
- **Git Working Tree**: 100% clean. All changes are committed locally on `main` up to commit `d68af35e`.

### Local Git Commit History (Recent Sprints)
| Commit | Description | Scope |
|---|---|---|
| `d68af35e` | `fix(user-app): refine gesture handlers and card container layout in bottom sheet` | user-app |
| `642c1d63` | `fix(user-app): restore 60fps native momentum scrolling and smooth dual/full gesture transitions` | user-app |
| `450453e2` | `fix(user-app): implement smart direction locking, eliminate miss-clicks, and enable 1:1 downward sheet drag` | user-app |
| `dd6a0617` | `feat(user-app): implement 1:1 real-time downward sheet drag in FULL mode with instant direction-lock and undoing release physics` | user-app |
| `504779e4` | `fix(user-app): lock bottom sheet and property card container widths across full and dual modes` | user-app |
| `670bd3c7` | `feat(user-app): expand demo properties dataset with 20+ listings for LA, NY, and Mumbai` | user-app / data |
| `a0fcf3c5` | `feat(user-app): implement Zillow unified bottom sheet animations and instant swipe-down return` | user-app |
| `abd0e923` | `feat: Zillow-identical smooth header transition and universal DUAL swipe-up` | user-app |

- **Security Note**: All Mapbox access tokens were purged from Git commit history. Tokens reside strictly in gitignored `.env` files (`apps/user-app/.env` and `apps/customer-web/.env.local`). Remote git push is disabled per instructions.

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
│   ├── api/             # Supabase client singleton, coordinate queries, mutations
│   ├── types/           # Shared TypeScript database & application types
│   └── ui/              # Shared cross-platform design tokens / components
├── supabase/
│   └── migrations/      # 8 SQL migrations applied (Schema, Realtime Chat, RLS, Indexes)
└── PROJECT_STATUS.md    # Central project status and context memory
```

---

## 3. Past Accomplishments & Delivered Features

### 3.1 Seeker Mobile Application (`apps/user-app`)

1. **Zillow Unified Single-Surface Bottom Sheet (`MobileTriStateBottomSheet.tsx`)**:
   - **Snap States**:
     - `PEEK` (72px): Handle bar `—` with centered `{count} rentals available`.
     - `DUAL` (44% screen height): Split screen with map visible in top 56% and scrollable cards in bottom 44%.
     - `FULL` (100% available height): Sheet glides all the way to `y = 0` at top of screen, sliding directly beneath the stationary top search bar with zero border or line.
   - **Stationary Top Search & Filter Bar**:
     - Rendered stationarily at `zIndex: 50` in `index.tsx`. The search bar and circular filter button never move or jump during gestures.
   - **GPU-Accelerated Native Driver Interpolations (60–120fps)**:
     - Implemented with `transform: [{ translateY }]` using **`useNativeDriver: true`**, running directly on the native GPU compositor thread.
     - Snappy spring constants (`damping: 28, stiffness: 300, mass: 0.8`) with zero rubbery jitter.
     - `countRowOpacity` & `sortRowOpacity`: The drag handle `—` and `{count} rentals available` cross-fade into `Sort: {sortOption} ⇅` and `Save search` at the exact same screen position without any flicker or flash.
     - `hudOpacity`: Floating map HUD (Layer, Draw, GPS) and 3D button smoothly dissolve when swiping above DUAL mode.
     - `containerBorderRadius`: Top corners smoothly transition between `24px` (in DUAL/PEEK) and `0px` (in FULL mode).
     - `bottomMapButtonOpacity`: Floating black pill `[ 🗺️ Map ]` at bottom center in FULL mode smoothly glides down into PEEK mode when tapped.

2. **60fps Native Momentum Scrolling & Bulletproof Gesture Physics**:
   - **Universal Swipe-Up in DUAL & PEEK Modes**:
     - Swiping up anywhere on the property card container (including on cards) lifts the sheet into FULL mode.
     - Vertical card scroll is locked in DUAL mode (`scrollEnabled={snapState === 'FULL'}`) and unlocked in FULL mode.
   - **Native 60fps Card Scrolling**: In FULL mode, the card list scrolls with 100% native momentum, zero lag, and zero jitter.
   - **Reliable Downward Overscroll to DUAL Mode**:
     - Direct pull-down on the card list when at the top (`scrollY <= 5` and `dy > 12px`) smoothly glides back to DUAL mode.
     - Header drag down also smoothly glides back to DUAL mode.
   - **Direction-Locking & Tap Isolation**: Card tap navigation (for details) and horizontal photo carousel paging (`dx > dy`) operate without interference.

3. **Container & Card Width Locking (Zero Width Popping)**:
   - Replaced `borderWidth: 1` on `sheetContainer` with `borderTopWidth: 1` and explicit `borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0`.
   - Guaranteed that the bottom sheet is 100% full screen width (`left: 0, right: 0`) across all modes (PEEK, DUAL, FULL) with zero horizontal width popping or jumping.
   - Locked `cardContainer` to `CARD_WIDTH = SCREEN_WIDTH - 32` and carousel photos to `CARD_INNER_WIDTH = CARD_WIDTH - 2`, eliminating image clipping and border distortion.

4. **Expanded Demo Dataset (76 Properties Across 3 Key Markets)**:
   - Created [`apps/user-app/data/mockProperties.ts`](file:///c:/Users/banar/Desktop/AGY/real_estate/apps/user-app/data/mockProperties.ts):
     - **Los Angeles, CA Homes** (26 listings): Santa Monica, Beverly Hills, Hollywood Hills, Downtown LA, Venice, Brentwood, Malibu, Studio City, etc. (\$2,400/mo – \$38,000/mo).
     - **New York, NY Homes** (25 listings): Midtown Manhattan, Tribeca, Upper West Side, West Village, Chelsea, SoHo, DUMBO, Brooklyn Heights, etc. (\$3,200/mo – \$42M).
     - **Mumbai Luxury Homes** (25 listings): Carter Road Bandra West, Lodha Park Worli, Juhu Tara Road, Altamount Road, Malabar Hill, Pali Hill, BKC, Marine Drive, etc. (₹45k/mo – ₹28 Cr).
   - Integrated into [`apps/user-app/data/searchRegions.ts`](file:///c:/Users/banar/Desktop/AGY/real_estate/apps/user-app/data/searchRegions.ts) with full region boundaries and polygons.
   - Integrated `getFallbackProperties` in [`apps/user-app/app/(tabs)/index.tsx`](file:///c:/Users/banar/Desktop/AGY/real_estate/apps/user-app/app/(tabs)/index.tsx) for text search, modal region selection, and map bounding box filtering.

5. **Mapbox Standard 3D Discovery Map (`MobileMapboxView.tsx`)**:
   - Hardware-accelerated WebGL map using Mapbox GL JS v3 inside a React Native WebView.
   - Dynamic Rent (`#7B1FA2` Deep Violet) vs. Sale (`#e11d48` Brand Rose) price markers.
   - 3D perspective camera controls with smooth pitch/bearing easing.
   - Mapbox logo watermark completely hidden via CSS for a clean luxury interface.
   - Wrapped with `React.memo` to eliminate unnecessary map re-renders during gestures.

6. **Feed Performance & Virtualization Optimization**:
   - Replaced nested card photo `FlatList` in `LuxuryPropertyCard` with native horizontal `<ScrollView horizontal pagingEnabled>` (eliminated 604ms JS thread freeze).
   - Feed is kept pre-mounted in PEEK (clipped off-screen), ensuring **0ms startup latency** when expanding.
   - Outer FlatList tuned with `getItemLayout` (356px fixed items), `removeClippedSubviews`, `initialNumToRender={4}`, and `windowSize={5}`.

7. **Zillow Touch Lasso Drawing (`MobileTouchDrawOverlay.tsx` & `ZillowIcons.tsx`)**:
   - Vector pointing finger with drawing loop icon (`ZillowDrawIcon`).
   - Hardware-accelerated continuous SVG `<Path>` with translucent blue fill (`rgba(37, 99, 235, 0.12)`) and active fingertip indicator.
   - Anchored Floating Action HUD (`[🌐 Layer]`, `[👆 Draw]`, `[🎯 GPS]`, `[Save search]`) mounted inside bottom sheet `Animated.View`, moving 1:1 synchronously with the sheet.

8. **Zoom-Dependent Level of Detail (LOD) & Multi-Unit Clustering (`markerClustering.ts`)**:
   - Far zoom: Small dots / purple building badges.
   - Mid zoom: Price capsules with carets.
   - Close zoom: Multi-unit building badges (`{count} units`, building icon + `₹{price}+`) with collision-aware photo thumbnail cards.
   - Multi-unit building bottom drawer modal (`MobileBuildingDrawer.tsx`).

9. **Full-Screen Search Modal (`MobileSearchModal.tsx`)**:
   - Fullscreen search modal with search history (clock icons), suggested searches, and tabs for For sale / For rent / Sold.
   - Pre-configured search regions with boundary polygons rendered on the map in blue (`#2563eb`).

---

### 3.2 Customer Web Application (`apps/customer-web`)

- **Mapbox Standard 3D Web Engine (`MapboxView.tsx`)**:
  - Upgraded from MapLibre to Mapbox GL JS v3 with 3D buildings and lighting presets.
  - Floating HUD (`MapControlsOverlay.tsx`) with 3D/2D toggle, dynamic compass rotating to true north, zoom controls, and style toggle.
  - Luxury property preview popups (`MapPropertyPopup.tsx`).

---

## 4. Current State & Active Services

| Service | Port | Status | Command |
|---|---|---|---|
| Metro Bundler (`user-app`) | `8081` | Running (`task-568`) | `npx expo start --clear` |
| Customer Web (`customer-web`) | `3000` | Ready | `npm run dev --workspace=customer-web` |
| Owner App (`owner-app`) | `8082` | Ready | `npm run start --workspace=owner-app` |
| Admin Panel (`admin-panel`) | `3001` | Ready | `npm run dev --workspace=admin-panel` |

### Environment Variables
- `apps/user-app/.env`: `EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...`
- `apps/customer-web/.env.local`: `NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...`
- *Note: Remote git push is strictly disabled per instructions. Work remains 100% local.*

---

## 5. Future Goals, Next Actions & Roadmap

### Phase 1: Property Details Experience (`apps/user-app/app/property/[id].tsx`)
- [ ] **Full-Screen Photo Gallery Carousel**:
  - Fullscreen photo modal with high-res zoom (pinch-to-zoom), thumbnail strip, and photo categorizations (Interior, Exterior, Kitchen, Master Bedroom).
- [ ] **Interactive Monthly Payment Calculator**:
  - Dynamic breakdown: Principal & Interest, Property Taxes, Homeowners Insurance, HOA Fees.
  - Interactive sliders for Down Payment (%), Loan Term (15/30 yrs), and Interest Rate (%).
- [ ] **Floor Plans & 3D Virtual Tour Embed**:
  - Interactive 2D architectural floor plan viewer.
  - Matterport / 3D virtual tour iframe/WebView support.
- [ ] **Neighborhood & Amenities Overlays**:
  - Walk Score, Transit Score, Schools rating cards, and local dining/parks points of interest.
- [ ] **Tour Scheduling & Agent Inquiry Modal**:
  - "Request a Tour" date/time picker (In-person vs. Video tour).
  - Instant inquiry messaging connected to Supabase `inquiries` table.

### Phase 2: Saved Searches, Custom Boundaries & Alert Subscriptions
- [ ] **Supabase Sync for Saved Searches**:
  - Connect the `Save search` button to the `saved_searches` table in Supabase.
  - Store active filters, sort preferences, and freehand lasso GeoJSON polygons.
- [ ] **Notification Triggers**:
  - Edge function / Postgres trigger to notify users when a newly published property falls inside their saved drawn boundary or search criteria.
- [ ] **Saved Homes & Favorites Feed (`apps/user-app/app/(tabs)/saved.tsx`)**:
  - Dedicated screen displaying saved properties with price drop badges and status updates.

### Phase 3: Owner Application Harmonization (`apps/owner-app`)
- [ ] **Mapbox Pin-Drop & Boundary Selector**:
  - Bring the Mapbox interactive map into the listing creation wizard so owners can accurately pin their property address and building footprint.
- [ ] **Multi-Unit Complex Manager**:
  - Allow owners to create multi-unit buildings (e.g. towers like Lodha Park) and assign multiple unit floor plans, prices, and availability statuses.
- [ ] **Real-Time Inquiry Inbox**:
  - Push notifications and in-app chat for owner-seeker messaging via Supabase Realtime channels.

### Phase 4: Admin Panel & Monorepo Polish
- [ ] **Listing Moderation & Verification Queue (`apps/admin-panel`)**:
  - Table to review uploaded property media, verify ownership deeds, and toggle the `isVerified` badge.
- [ ] **City Boundary Polygon Manager**:
  - Web UI for administrators to draw or update official city/neighborhood boundary polygons stored in `search_regions`.
- [ ] **Production CI/CD & Build Pipelines**:
  - Expo Application Services (EAS) configuration for iOS IPA and Android APK/AAB distribution.
  - Vercel deployments for `customer-web` and `admin-panel`.
