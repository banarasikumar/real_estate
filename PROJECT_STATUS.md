# Real Estate Monorepo — Project Status & Brain Memory

> **Last Updated**: September 18, 2026  
> **Repository**: `banarasikumar/real_estate`  
> **Active Branch**: `main` (clean working tree, local commit `a5bc4feb`)  
> **Active Environment**: Windows (PowerShell) | Node.js / Turborepo / Expo SDK 57 / Next.js 15 / Supabase / Mapbox GL JS v3  
> **Active Metro Bundler**: Port `8081` (`apps/user-app` — HTTP 200 OK, LAN: `exp://192.168.31.63:8081`)

---

## 1. Executive Summary & Current State

This monorepo houses a multi-platform, end-to-end luxury Real Estate platform connecting Property Owners, Property Seekers, and Platform Admins.

### Current System Health & Stability
- **Seeker App (`apps/user-app`)**: Fully interactive, verified, and running smoothly. Featuring iOS-grade Zillow-fidelity physics, 1:1 real-time finger tracking, screen-coordinate gesture targeting (`gesture.y0`), seamless borderless surface fusion with the stationary search bar, Mapbox 3D WebGL discovery map, locked container dimensions, 76-listing demo dataset across LA, NY, and Mumbai, next-generation iOS Luxury Property Details Experience, FormSheet Saved Searches modal with customizable frequency alerts, and revamped luxury Saved Portal with animated segmented controls.
- **Owner App (`apps/owner-app`)**: Upgraded to iOS standards with interactive Mapbox pin-dropping & footprint drawing (`OwnerMapPinPickerModal.tsx`), multi-unit complex & tower manager with tiered floor tabs (`app/complex/[id].tsx`), and WhatsApp/iMessage-grade live chat with Realtime sync (`OwnerChatSheetModal.tsx`).
- **Admin Panel (`apps/admin-panel`)**: Fully operational with iOS-grade Listing Moderation & Verification Queue (`ModerationQueue.tsx`), interactive City Boundary Polygon Manager with Mapbox GL JS v3 (`CityBoundaryManager.tsx`), User & Admin role management, ownership deed verification workflows, and Supabase-backed dynamic search regions.
- **TypeScript Type Safety**: 0 errors across all workspaces (`owner-app`, `user-app`, `admin-panel`, `@repo/api` all pass `tsc --noEmit` cleanly with exit code 0).
- **Git Working Tree**: 100% clean. All changes are committed locally to `main` up to commit `a5bc4feb`.

### Local Git Commit History (Recent Sprints)
| Commit | Description | Scope |
|---|---|---|
| `a5bc4feb` | `feat(admin-panel): implement iOS-grade listing moderation queue, city boundary polygon manager, and CI/CD pipelines` | admin-panel / api / db / ci |
| `34ba1a81` | `docs: synchronize PROJECT_STATUS.md with Phase 2 and Phase 3 commits` | root / docs |
| `ba8df60f` | `feat(owner-app): implement iOS-grade mapbox pin-drop, multi-unit complex manager, and realtime chat inbox` | owner-app / api |
| `b4d5d12d` | `feat(user-app): implement iOS-grade saved searches modal, alerts edge function, and luxury saved portal` | user-app / api |
| `4cff041a` | `docs: sync commit hash 0a0caad6 in PROJECT_STATUS.md` | root / docs |
| `0a0caad6` | `docs: update PROJECT_STATUS.md with Phase 1 completion and brain memory` | root / docs |
| `d13b4f67` | `feat(user-app): implement iOS-grade luxury property details experience, parallax carousel, mortgage calculator, and tour booking` | user-app |
| `79156ab1` | `feat(bottom-sheet): unified gesture handling with RNGH and rapid swipe support` | user-app |
| `749c8445` | `feat(user-app): implement iOS-grade Zillow gesture engine, spring physics, and seamless borderless fusion` | user-app |
| `37732f8b` | `fix(ui): remove blue and persistent selection borders on mobile property cards` | user-app |
| `1ab72956` | `docs: update PROJECT_STATUS.md with comprehensive past, current, and future roadmap` | root / docs |
| `d68af35e` | `fix(user-app): refine gesture handlers and card container layout in bottom sheet` | user-app |
| `642c1d63` | `fix(user-app): restore 60fps native momentum scrolling and smooth dual/full gesture transitions` | user-app |
| `450453e2` | `fix(user-app): implement smart direction locking, eliminate miss-clicks, and enable 1:1 downward sheet drag` | user-app |
| `dd6a0617` | `feat(user-app): implement 1:1 real-time downward sheet drag in FULL mode with instant direction-lock and undoing release physics` | user-app |
| `504779e4` | `fix(user-app): lock bottom sheet and property card container widths across full and dual modes` | user-app |
| `670bd3c7` | `feat(user-app): expand demo properties dataset with 20+ listings for LA, NY, and Mumbai` | user-app / data |
| `a0fcf3c5` | `feat(user-app): implement Zillow unified bottom sheet animations and instant swipe-down return` | user-app |

- **Security Note**: All Mapbox access tokens were purged from Git commit history. Tokens reside strictly in gitignored `.env` files (`apps/user-app/.env` and `apps/customer-web/.env.local`).

---

## 2. Monorepo Architecture & Applications

```
real_estate/
├── .github/
│   └── workflows/ci.yml        # Monorepo CI: TypeScript check + build
├── apps/
│   ├── owner-app/       # Mobile App for Property Owners (Expo SDK 57 / React Native 0.86)
│   │   ├── app/
│   │   │   ├── (tabs)/
│   │   │   │   ├── create-property.tsx # Interactive Mini-Map Preview Card + Multi-Unit Tower toggle
│   │   │   │   ├── enquiries.tsx       # iOS Large Title Live Chats ↔ Tour Requests portal
│   │   │   │   └── properties.tsx      # Complex badges + Manage Units CTA
│   │   │   └── complex/[id].tsx        # Multi-Unit Complex & Tower inventory manager
│   │   ├── components/
│   │   │   ├── OwnerMapPinPickerModal.tsx  # Mapbox WebGL pin-drop & footprint polygon drawing
│   │   │   └── OwnerChatSheetModal.tsx    # WhatsApp/iMessage-grade live chat sheet
│   │   └── eas.json                       # EAS Build profiles (development, preview, production)
│   ├── user-app/        # Mobile App for Property Seekers (Expo SDK 57 / React Native 0.86)
│   │   ├── app/
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx           # Zillow-fidelity physics + Freehand Lasso Drawing
│   │   │   │   └── saved.tsx           # Sliding segmented Saved Homes ↔ Saved Searches portal
│   │   │   └── property/[id].tsx       # iOS Luxury Details: parallax, 3D tours, mortgage calc
│   │   ├── components/
│   │   │   └── MobileSaveSearchModal.tsx # Apple FormSheet with frequency pills & HUD
│   │   ├── services/
│   │   │   └── savedSearchesStore.ts     # Reactive store + cross-tab Map execution
│   │   └── eas.json                       # EAS Build profiles (development, preview, production)
│   ├── admin-panel/     # Web Admin Dashboard (Next.js 15 / Tailwind CSS / Mapbox v3)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── page.tsx               # Dashboard overview + ApprovalDashboard
│   │   │   │   ├── properties/page.tsx    # Listing Moderation & Verification Queue
│   │   │   │   ├── regions/page.tsx       # City Boundary Polygon Manager
│   │   │   │   ├── users/page.tsx         # Super Admin User & Role management
│   │   │   │   └── login/page.tsx         # Admin authentication
│   │   │   └── components/
│   │   │       ├── AdminAuthGuard.tsx      # Auth guard + sidebar navigation + header
│   │   │       ├── ModerationQueue.tsx     # iOS-grade listing moderation with deed verification
│   │   │       ├── CityBoundaryManager.tsx # Mapbox polygon drawing & region management
│   │   │       └── ApprovalDashboard.tsx   # Quick approval queue
│   │   └── .env.local                     # Supabase + Mapbox tokens (gitignored)
│   └── customer-web/    # Public Discovery Web Portal (Next.js 15 / Tailwind CSS / Mapbox v3)
├── packages/
│   ├── api/             # Supabase client singleton, coordinate queries, mutations, regions, complex APIs
│   ├── types/           # Shared TypeScript database & application types
│   └── ui/              # Shared cross-platform design tokens / components
├── supabase/
│   ├── functions/
│   │   └── match-saved-searches/ # Deno Edge Function with ray-casting point-in-polygon math
│   └── migrations/               # 11 SQL migrations applied (Schema, Realtime, RLS, Complexes, Regions)
└── PROJECT_STATUS.md             # Central project status and context memory
```

---

## 3. Past Accomplishments & Delivered Features

### 3.1 Seeker Mobile Application (`apps/user-app`)

1. **Unified RNGH Gesture Engine & Physics (`MobileTriStateBottomSheet.tsx`)**:
   - **React Native Gesture Handler Integration**:
     - Eliminated `PanResponder` in favor of declarative `Gesture.Pan()` for `listPanGesture` and `subHeaderGesture`.
     - App rooted with `GestureHandlerRootView` and imported `react-native-gesture-handler` globally.
   - **Mid-Motion Freezing & Rapid Swiping**:
     - Added `.onBegin()` hooks that instantly stop `translateYAnim` and cache the exact pixel position (`dragStartTranslateY`).
     - This guarantees the sheet freezes instantly when caught mid-flight, and prevents visual jumping or skipping during rapid, successive swipes.
   - **Coordinated Scroll View & Pan Handlers**:
     - Replaced standard RN `FlatList` with RNGH's `FlatList`, setting `disallowInterruption={false}`.
     - Enables flawless co-existence of native GPU-accelerated vertical momentum scrolling with the bottom sheet's downward drag gesture when `isAtTop` is true.
   - **1:1 Real-Time Finger Tracking**:
     - Direct `translateYAnim.setValue` updates inside `.onUpdate()` accurately track downward dragging from `FULL` view without sudden "wipes" or delays.
   - **PEEK to FULL Direct Snap & Critically Damped Springs**:
     - Uses highly tuned native spring physics (`mass: 0.45, stiffness: 320, damping: 24`).
     - Snaps directly from `PEEK` to `FULL` when velocity or displacement crosses the threshold.

2. **Seamless Borderless Surface Fusion (`index.tsx` & `MobileTriStateBottomSheet.tsx`)**:
   - **Eliminated Dividing Line/Border in FULL Mode**:
     - Removed `borderBottomWidth: 1, borderBottomColor: '#f1f5f9'` from the search bar backdrop `Animated.View` in `index.tsx`.
     - Removed static `borderTopWidth` and static container shadow from `styles.sheetContainer`.
   - **Native GPU-Interpolated Hairline & Shadow Overlays**:
     - Added `sheetBorderOpacity` and `sheetShadowOpacity` (`inputRange: [fullY, fullY + 20, dualY], outputRange: [0, 1, 1]`):
       - In **FULL mode** (`translateY == fullY`): Border and shadow opacities drop to `0`. The stationary search bar and property sheet subheader merge seamlessly into a single, continuous white surface.
       - In **DUAL and PEEK modes** (`translateY >= dualY`): The hairline border and elevation shadow fade in to full opacity (`1`) over the map.

3. **FlatList & Photo Carousel Touch Isolation**:
   - In `LuxuryPropertyCard`: horizontal image carousel `<ScrollView>` has `directionalLockEnabled={true}` and `nestedScrollEnabled={false}`, guaranteeing photo swiping never leaks into or gets hijacked by vertical sheet dragging.
   - In `FlatList`: `overScrollMode="never"` and `bounces={Platform.OS === 'ios'}` prevents native Android scroll glow from swallowing downward touch streams at offset 0.
   - Removed conflicting drag handlers. In `handleListScroll`:
     ```ts
     scrollYRef.current = Math.max(0, offsetY);
     if (snapState === 'FULL' && offsetY < -20 && animatingToStateRef.current === null) {
       triggerGlideToDual(2.0);
     }
     ```

4. **Card Visual Polish**:
   - Removed blue and persistent selection borders (`borderWidth: 2, borderColor: '#006aff'`) from `LuxuryPropertyCard` to maintain clean, distraction-free browsing.

5. **Container & Card Width Locking (Zero Width Popping)**:
   - Replaced `borderWidth: 1` on `sheetContainer` with `borderTopWidth: 1` and explicit `borderLeftWidth: 0, borderRightWidth: 0, borderBottomWidth: 0`.
   - Guaranteed that the bottom sheet is 100% full screen width (`left: 0, right: 0`) across all modes (PEEK, DUAL, FULL) with zero horizontal width popping or jumping.
   - Locked `cardContainer` to `CARD_WIDTH = SCREEN_WIDTH - 32` and carousel photos to `CARD_INNER_WIDTH = CARD_WIDTH - 2`, eliminating image clipping and border distortion.

6. **Expanded Demo Dataset (76 Properties Across 3 Key Markets)**:
   - Created [`apps/user-app/data/mockProperties.ts`](file:///c:/Users/banar/Desktop/AGY/real_estate/apps/user-app/data/mockProperties.ts):
     - **Los Angeles, CA Homes** (26 listings): Santa Monica, Beverly Hills, Hollywood Hills, Downtown LA, Venice, Brentwood, Malibu, Studio City, etc. (\$2,400/mo – \$38,000/mo).
     - **New York, NY Homes** (25 listings): Midtown Manhattan, Tribeca, Upper West Side, West Village, Chelsea, SoHo, DUMBO, Brooklyn Heights, etc. (\$3,200/mo – \$42M).
     - **Mumbai Luxury Homes** (25 listings): Carter Road Bandra West, Lodha Park Worli, Juhu Tara Road, Altamount Road, Malabar Hill, Pali Hill, BKC, Marine Drive, etc. (₹45k/mo – ₹28 Cr).
   - Integrated into [`apps/user-app/data/searchRegions.ts`](file:///c:/Users/banar/Desktop/AGY/real_estate/apps/user-app/data/searchRegions.ts) with full region boundaries and polygons.
   - Integrated `getFallbackProperties` in [`apps/user-app/app/(tabs)/index.tsx`](file:///c:/Users/banar/Desktop/AGY/real_estate/apps/user-app/app/(tabs)/index.tsx) for text search, modal region selection, and map bounding box filtering.

7. **Mapbox Standard 3D Discovery Map (`MobileMapboxView.tsx`)**:
   - Hardware-accelerated WebGL map using Mapbox GL JS v3 inside a React Native WebView.
   - Dynamic Rent (`#7B1FA2` Deep Violet) vs. Sale (`#e11d48` Brand Rose) price markers.
   - 3D perspective camera controls with smooth pitch/bearing easing.
   - Mapbox logo watermark completely hidden via CSS for a clean luxury interface.
   - Wrapped with `React.memo` to eliminate unnecessary map re-renders during gestures.

8. **Feed Performance & Virtualization Optimization**:
   - Replaced nested card photo `FlatList` in `LuxuryPropertyCard` with native horizontal `<ScrollView horizontal pagingEnabled>` (eliminated 604ms JS thread freeze).
   - Feed is kept pre-mounted in PEEK (clipped off-screen), ensuring **0ms startup latency** when expanding.
   - Outer FlatList tuned with `getItemLayout` (356px fixed items), `removeClippedSubviews`, `initialNumToRender={6}`, `maxToRenderPerBatch={6}`, and `windowSize={7}`.

9. **Zillow Touch Lasso Drawing (`MobileTouchDrawOverlay.tsx` & `ZillowIcons.tsx`)**:
   - Vector pointing finger with drawing loop icon (`ZillowDrawIcon`).
   - Hardware-accelerated continuous SVG `<Path>` with translucent blue fill (`rgba(37, 99, 235, 0.12)`) and active fingertip indicator.
   - Anchored Floating Action HUD (`[🌐 Layer]`, `[👆 Draw]`, `[🎯 GPS]`, `[Save search]`) mounted inside bottom sheet `Animated.View`, moving 1:1 synchronously with the sheet.

10. **Zoom-Dependent Level of Detail (LOD) & Multi-Unit Clustering (`markerClustering.ts`)**:
   - Far zoom: Small dots / purple building badges.
   - Mid zoom: Price capsules with carets.
   - Close zoom: Multi-unit building badges (`{count} units`, building icon + `₹{price}+`) with collision-aware photo thumbnail cards.
   - Multi-unit building bottom drawer modal (`MobileBuildingDrawer.tsx`).

11. **Full-Screen Search Modal (`MobileSearchModal.tsx`)**:
   - Fullscreen search modal with search history (clock icons), suggested searches, and tabs for For sale / For rent / Sold.
   - Pre-configured search regions with boundary polygons rendered on the map in blue (`#2563eb`).

12. **Next-Gen iOS-Grade Luxury Property Details Experience (`apps/user-app/app/property/[id].tsx` & `components/property/`)**:
   - **Hero Parallax Carousel & Glassmorphic Sticky Nav (`PropertyHeroParallaxCarousel.tsx`)**:
     - 340px edge-to-edge photo carousel with horizontal paging and touch isolation (`directionalLockEnabled`).
     - Reanimated overscroll pull-down physics (`y < 0`) scaling up to 1.7x elastic zoom.
     - Scroll-driven transition fading into a solid white navigation bar with pinned title and price pill.
     - Glassmorphic floating controls for Back (`router.back()`), Native Share (`Share.share(...)`), and Heart (with spring bounce animation).
     - Bottom-right photo counter badge (`1 / 8`) opening the full lightbox on tap.
   - **Full-Screen OLED Black Photo Lightbox (`FullScreenPhotoGalleryModal.tsx`)**:
     - Pure `#000000` immersive viewer with room filter chips (*All, Exterior, Living Room, Kitchen, Master Suite, Bathroom, Views*) with live photo counts.
     - Pinch-to-zoom (up to 3x), double-tap zoom toggle (1x ↔ 2.5x), and swipe-down-to-dismiss gesture with scale-down and opacity fade.
     - Auto-centering bottom thumbnail preview strip with white border indicator and tap-to-jump.
   - **Interactive Monthly Payment & Mortgage Calculator (`InteractiveMortgageCalculator.tsx`)**:
     - **Dual Mode**: Full mortgage calculation for `SALE` homes ($M = P \cdot \frac{r(1+r)^n}{(1+r)^n - 1} + \text{Taxes} + \text{Insurance} + \text{HOA}$) and itemized rental breakdown for `RENT` listings (Rent, Utilities, Insurance, Parking, Move-In Cost).
     - **Color-Coded Visualizers**: SVG Donut Ring Chart and horizontal segmented progress bar (Principal & Interest `#2563eb`, Taxes `#e11d48`, Insurance `#f59e0b`, HOA `#10b981`).
     - **Interactive Live Sliders**: Down payment (0% to 50% with live dollar computation), Interest Rate (3.0% to 9.0% with 0.1% stepper buttons `[-]` / `[+]`), and Loan Term pills (*30-Yr*, *15-Yr*, *5/1 ARM*).
   - **Tabbed Media & Architectural Layout (`TabbedMediaViewer.tsx`)**:
     - Segmented iOS pill control: `[ 📷 Photos | 📐 Floor Plan | 🌐 3D Tour ]`.
     - **Floor Plan**: High-res 2D blueprint with zoom preview toggle and room dimensions grid (*Grand Living Room 24'x18', Primary Suite 20'x16'*).
     - **3D Tour**: Interactive Matterport preview card with `360° IMMERSIVE TOUR` badge, feature tags (Dollhouse 3D view, Measure tool), and primary launcher button.
   - **Neighborhood Scores & GreatSchools Ratings (`NeighborhoodScoresSection.tsx`)**:
     - iOS widget-style colorful score cards: Walk Score (`94/100` Emerald), Transit Score (`88/100` Royal Blue), and Bike Score (`82/100` Amber).
     - GreatSchools assigned school cards (`9/10`, `10/10`) with distances and grade levels.
     - Local highlights tags (Organic Grocers, Fine Dining, Botanical Trail, Rapid Transit).
   - **Tour Scheduling Bottom Sheet (`TourBookingModal.tsx`)**:
     - Slide-up bottom sheet with `In-Person Tour` vs `Live Video Walkthrough` toggle.
     - Horizontal 7-day date picker with day-of-week and month cards.
     - Time slot pills (`9:00 AM`, `11:00 AM`, `1:00 PM`, `3:00 PM`, `5:00 PM`).
     - Syncs to Supabase `enquiries` table with celebratory confirmation card.
   - **Instant Demo Property Resolution**:
     - Checks `ALL_DEMO_PROPERTIES` by ID for immediate 0ms render when opening any of the 76 listings across LA, NY, or Mumbai, falling back gracefully to Supabase.
   - **Docked Floating Bottom Bar**:
     - WhatsApp direct message, Contact Agent, and primary **"Request a Tour"** CTA.

---

### 3.2 Customer Web Application (`apps/customer-web`)

- **Mapbox Standard 3D Web Engine (`MapboxView.tsx`)**:
  - Upgraded from MapLibre to Mapbox GL JS v3 with 3D buildings and lighting presets.
  - Floating HUD (`MapControlsOverlay.tsx`) with 3D/2D toggle, dynamic compass rotating to true north, zoom controls, and style toggle.
  - Luxury property preview popups (`MapPropertyPopup.tsx`).

---

### 3.3 Phase 2: Saved Searches, Boundary Alerts & Saved Portal (`apps/user-app` & Supabase)

1. **Apple FormSheet Save Search Modal (`MobileSaveSearchModal.tsx`)**:
   - iOS FormSheet presentation with `38x5px` grabber, glassmorphic surface, circular haptic close button, and spring slide-up physics.
   - Context-aware smart titles automatically derived from query, region, or drawn polygon.
   - One-tap quick suggestion pills: `Dream Villa`, `High ROI Investments`, `Family Home`, `Waterfront Luxury`, `City Penthouse`, `Modern Retreat`.
   - Search Summary HUD: SVG polygon boundary badge with live point counter and active filter chips for Price, Beds, Baths, and Property Type.
   - Native segmented frequency selector: `[ ⚡ Instant | 📅 Daily Digest | 🔕 Never ]`.
   - iOS switches for *New matching homes* and *Price reductions*.
   - Spring-scale touch feedback and checkmark transition with instant Supabase synchronization.

2. **Revamped Luxury Saved Portal (`apps/user-app/app/(tabs)/saved.tsx`)**:
   - iOS Large Title header with sliding white pill segmented control: `[ 🏠 Saved Homes ({count}) | 🔍 Saved Searches ({count}) ]`.
   - **Saved Homes Tab**: High-res photography cards with price drop tags (`Price Reduced -$75,000`), status indicators (`✨ New to Market`), floating **iOS Undo Toast** allowing instant restore after un-saving, and native OS sharing.
   - **Saved Searches Tab**: Grouped iOS cards with search criteria pills, drawn boundary SVG badge, glowing `✨ 2 new listings` notification badge, and one-tap **"Run on Map"** execution navigating to the discovery map with bounds/filters applied.
   - Apple-fidelity empty states with custom typography and map navigation actions.

3. **Supabase Schema & Edge Function (`match-saved-searches`)**:
   - Migration `00000000000009_saved_searches_and_alerts.sql` adding `saved_searches` and `notifications` tables with RLS and realtime publication.
   - Deno edge function handler accepting `INSERT` and `UPDATE` webhook events with Jordan curve ray-casting algorithm (`isPointInBoundary`) for point-in-polygon math, dispatching notifications and Expo push alerts.

---

### 3.4 Phase 3: Owner Application Harmonization (`apps/owner-app`)

1. **iOS-Grade Mapbox Pin-Dropper & Footprint Selector (`OwnerMapPinPickerModal.tsx`)**:
   - FormSheet presentation (`borderTopLeftRadius: 28, borderTopRightRadius: 28`, `38x5px` grabber, circular haptic dismiss button).
   - Embedded Mapbox GL JS v3 WebGL map using `react-native-webview` with `EXPO_PUBLIC_MAPBOX_TOKEN`.
   - Tactile pinpoint marker with luxury emerald gradient, concentric rings, and dynamic floating shadow that elevates with spring physics on pan/drag.
   - Live frosted glass coordinate banner: `📍 34.0522° N, 118.2437° W • Precise Accuracy`.
   - Satellite vs. Standard 3D map views and building footprint polygon drawing tool with vertex counters and shaded fill.
   - Integrated into `create-property.tsx` with an interactive Mini-Map Preview Card.

2. **Multi-Unit Complex & Tower Manager (`apps/owner-app/app/complex/[id].tsx` & Migration `00000000000010`)**:
   - Migration `00000000000010_multi_unit_complexes.sql` adding `parent_property_id`, `is_complex`, `complex_name`, `total_units`, `footprint_polygon`, `unit_number`, `floor_number`, and `availability_status` with indexes and non-recursive RLS policies.
   - Multi-Unit Tower toggle in `create-property.tsx` capturing tower name, planned unit counts, and footprint polygons.
   - Dedicated Complex Manager screen (`app/complex/[id].tsx`) featuring tower inventory overview (Total Units, Available count, Occupancy %, and Price Spectrum).
   - Tiered floor segmented tabs: `[ All Units | Available | Reserved | Sold ]` with instant availability toggle and floating `[ + Add Unit ]` bottom sheet modal.
   - Pinned `🏢 Multi-Unit Tower ({total_units} units)` badges and `Manage Units ➔` navigation CTAs on `properties.tsx`.

3. **Real-Time Inquiry & Chat Inbox (`enquiries.tsx` & `OwnerChatSheetModal.tsx`)**:
   - iOS Large Title header with live pulsing connection badge and sliding segmented pill switcher: `[ 💬 Live Chats ({chatCount}) | 📋 Tour Requests ({tourCount}) ]`.
   - Search bar with instant filtering across seeker names, property titles, and notes.
   - Tour requests queue with `Confirm Tour`, `Decline`, and `Message Seeker` actions.
   - WhatsApp/iMessage-grade chat modal with edge-to-edge layout, pinned Property Snapshot Card, double blue checkmarks (`MessageStatusTicks`), quick response pills, and glassmorphic multiline input bar with Supabase Realtime synchronization.

---

## 4. Current State & Active Services

| Service | Port | Status | Command |
|---|---|---|---|
| Metro Bundler (`user-app`) | `8081` | Running (`HTTP 200 OK`, `exp://192.168.31.63:8081`) | `npx expo start --clear` |
| Customer Web (`customer-web`) | `3000` | Ready | `npm run dev --workspace=customer-web` |
| Owner App (`owner-app`) | `8082` | Ready | `npm run start --workspace=owner-app` |
| Admin Panel (`admin-panel`) | `3001` | Ready | `npm run dev --workspace=admin-panel` |

### Environment Variables
- `apps/user-app/.env`: `EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...`
- `apps/customer-web/.env.local`: `NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...`
- *Note: Remote git push is strictly disabled per instructions. Work remains 100% local.*

---

## 5. Future Goals, Next Actions & Roadmap

### Phase 1: Property Details Experience (`apps/user-app/app/property/[id].tsx`) — COMPLETED (September 18, 2026)
- [x] **Full-Screen Photo Gallery Carousel & Lightbox (`FullScreenPhotoGalleryModal.tsx`)**:
  - Fullscreen OLED black photo modal with pinch-to-zoom (up to 3x), swipe-down-to-dismiss gesture, horizontal thumbnail strip, and room category filter pills (All, Exterior, Living Room, Kitchen, Master Suite, Bathrooms, Views).
- [x] **Interactive Monthly Payment Calculator (`InteractiveMortgageCalculator.tsx`)**:
  - Dynamic cost visualizer (color-coded SVG donut ring & horizontal segmented bar for Principal & Interest, Property Taxes, Home Insurance, and HOA dues).
  - Interactive live touch sliders for Down Payment (%), Loan Term (30-yr, 15-yr, 5/1 ARM), and Interest Rate (%).
  - Auto-adapting for `SALE` mode (Mortgage) and `RENT` mode (Monthly Rent + Utilities + Deposit).
- [x] **Floor Plans & 3D Virtual Tour Embed (`TabbedMediaViewer.tsx`)**:
  - Segmented pill control: `[ 📷 Photos | 📐 Floor Plan | 🌐 3D Tour ]`.
  - Architectural 2D floor plan viewer with interactive zoom, room dimensions breakdown (Grand Living Room 24'x18', Primary Suite 20'x16', etc.), and CAD certification badge.
  - Interactive Matterport / 3D virtual tour preview with 360 walkthrough launcher.
- [x] **Neighborhood & Amenities Overlays (`NeighborhoodScoresSection.tsx`)**:
  - iOS widget-style colorful score cards: Walk Score (94/100 Emerald), Transit Score (88/100 Royal Blue), Bike Score (82/100 Amber).
  - GreatSchools district-assigned schools rating cards (9/10, 10/10) with distances and grades served.
  - Local points of interest tags (Whole Foods, Fine Dining, Centennial Park, Metro Station).
- [x] **Tour Scheduling & Agent Inquiry Modal (`TourBookingModal.tsx`)**:
  - "Request a Tour" iOS bottom sheet modal with In-Person vs Video Tour toggle, 7-day horizontal date picker, time slot pills (9 AM - 5 PM), and Supabase inquiry sync with celebratory confirmation.
- [x] **Hero Parallax Carousel & Glassmorphic Sticky Nav Bar (`PropertyHeroParallaxCarousel.tsx`)**:
  - 340px edge-to-edge photo carousel with overscroll zoom pull-down (`y < 0`) and scroll-driven white sticky navigation bar transition with pinned title and price.
  - Native glassmorphic floating buttons for Back, Share (`Share.share(...)`), and Heart (Saved favorites toggle).

### Phase 2: Saved Searches, Custom Boundaries & Alert Subscriptions — COMPLETED (September 18, 2026)
- [x] **Supabase Sync for Saved Searches (`MobileSaveSearchModal.tsx` & `savedSearchesStore.ts`)**:
  - Created `saved_searches` and `notifications` tables in Supabase with RLS, indexes, and realtime publications (`00000000000009_saved_searches_and_alerts.sql`).
  - Connected `Save search` button in `MobileTriStateBottomSheet` to open an iOS-grade FormSheet modal with Apple-fidelity spring presentation.
  - Smart pre-populated search titles, one-tap suggestion pills (`Dream Villa`, `High ROI Investments`, `Waterfront Luxury`), and active filter/drawn boundary HUD chips.
  - Granular notification frequency segmented controls (`[ ⚡ Instant | 📅 Daily Digest | 🔕 Never ]`) and alert toggles for new matches and price drops.
- [x] **Notification Triggers & Edge Function (`supabase/functions/match-saved-searches/`)**:
  - Deno edge function handler accepting `INSERT` and `UPDATE` webhook events for properties.
  - Jordan curve ray-casting algorithm (`isPointInBoundary`) supporting GeoJSON Polygon, MultiPolygon, arrays of coordinate pairs, and point objects.
  - Filter matcher evaluating price bounds, bedrooms, bathrooms, listing type, and keyword queries.
  - Automatic insertion into `public.notifications`, `new_matches_count` incrementing, and dispatching Expo push notifications via `https://exp.host/--/api/v2/push/send`.
- [x] **Saved Homes & Favorites Feed (`apps/user-app/app/(tabs)/saved.tsx`)**:
  - Elevated iOS-grade portal with custom large titles and an animated sliding segmented control: `[ 🏠 Saved Homes ({count}) | 🔍 Saved Searches ({count}) ]`.
  - **Saved Homes**: Luxury cards with "Price Reduced -$75,000" and "✨ New to Market" badges, heart un-saving with an iOS floating Undo Toast, and native sharing.
  - **Saved Searches**: Grouped iOS cards with search criteria pills, drawn boundary SVG badge, glowing "✨ 2 new listings" badge, and one-tap **"Run on Map"** execution navigating to the discovery map with bounds/filters applied.
  - Apple-grade empty states with custom typography and map navigation actions.

### Phase 3: Owner Application Harmonization (`apps/owner-app`) — COMPLETED (September 18, 2026)
- [x] **Mapbox Pin-Drop & Footprint Selector (`OwnerMapPinPickerModal.tsx`)**:
  - Apple FormSheet presentation (`borderTopLeftRadius: 28, borderTopRightRadius: 28`, `38x5px` grabber, circular haptic dismiss button).
  - Embedded Mapbox GL JS v3 WebGL map using `react-native-webview` with `EXPO_PUBLIC_MAPBOX_TOKEN`.
  - Tactile pinpoint marker with luxury emerald gradient, concentric rings, and dynamic floating shadow that elevates with spring physics on pan/drag.
  - Live frosted glass coordinate banner: `📍 34.0522° N, 118.2437° W • Precise Accuracy`.
  - Satellite vs. Standard 3D map views and building footprint polygon drawing tool with vertex counters and shaded fill.
  - Integrated into `create-property.tsx` with an interactive Mini-Map Preview Card.
- [x] **Multi-Unit Complex Manager (`apps/owner-app/app/complex/[id].tsx` & Supabase Migration `00000000000010`)**:
  - Migration `00000000000010_multi_unit_complexes.sql` adding `parent_property_id`, `is_complex`, `complex_name`, `total_units`, `footprint_polygon`, `unit_number`, `floor_number`, and `availability_status` with indexes and non-recursive RLS policies.
  - Multi-Unit Tower toggle in `create-property.tsx` capturing tower name, planned unit counts, and footprint polygons.
  - Dedicated Complex Manager screen (`app/complex/[id].tsx`) featuring tower inventory overview (Total Units, Available count, Occupancy %, and Price Spectrum).
  - Tiered floor segmented tabs: `[ All Units | Available | Reserved | Sold ]` with instant availability toggle and floating `[ + Add Unit ]` bottom sheet modal.
  - Pinned `🏢 Multi-Unit Tower ({total_units} units)` badges and `Manage Units ➔` navigation CTAs on `properties.tsx`.
- [x] **Real-Time Inquiry & Chat Inbox (`enquiries.tsx` & `OwnerChatSheetModal.tsx`)**:
  - iOS Large Title header with live pulsing connection badge and sliding segmented pill switcher: `[ 💬 Live Chats ({chatCount}) | 📋 Tour Requests ({tourCount}) ]`.
  - Search bar with instant filtering across seeker names, property titles, and notes.
  - Tour requests queue with `Confirm Tour`, `Decline`, and `Message Seeker` actions.
  - WhatsApp/iMessage-grade chat modal with edge-to-edge layout, pinned Property Snapshot Card, double blue checkmarks (`MessageStatusTicks`), quick response pills, and glassmorphic multiline input bar with Supabase Realtime synchronization.

### Phase 4: Admin Panel & Monorepo Polish — COMPLETED (September 18, 2026)
- [x] **Supabase Migration `00000000000011_search_regions.sql`**:
  - Created `search_regions` table with `id`, `slug`, `name`, `city`, `state`, `center_lat`, `center_lng`, `zoom`, `boundary_polygon` (JSONB), `is_active`, timestamps.
  - Added `is_verified`, `deed_url`, `verification_notes` columns to `properties` table.
  - RLS: Public `SELECT` for all users; `INSERT`/`UPDATE`/`DELETE` restricted to `ADMIN`/`SUPER_ADMIN`.
  - Realtime replication enabled. Indexes on `slug`, `is_active`, `is_verified`.
  - Seeded initial 6 regions (Los Angeles, New York, Mumbai, Bangalore, Delhi, Goa) with authentic boundary polygons.
- [x] **API Layer (`packages/api/src/regions.ts` & `properties.ts`)**:
  - CRUD functions: `getActiveSearchRegions`, `getAllSearchRegions`, `getSearchRegionBySlug`, `createSearchRegion`, `updateSearchRegion`, `deleteSearchRegion`, `toggleSearchRegionActive`.
  - Moderation helpers: `verifyProperty(id, isVerified, notes)`, `updatePropertyDeed(id, deedUrl)`, `getModerationProperties(options)`.
  - `SearchRegion` interface added to `database.types.ts`.
- [x] **iOS-Grade Listing Moderation & Verification Queue (`ModerationQueue.tsx` — 1620 lines)**:
  - Apple HIG / iOS 18 aesthetic with frosted glass surfaces, smooth `rounded-2xl` / `rounded-3xl` corners, hairline borders, and tactile micro-interactions.
  - Animated segmented filter bar: `[ 📋 All Listings | ⏳ Pending Approval | 🛡️ Verified | ❌ Rejected ]` with live counts.
  - Summary Metrics Bar: 4 Apple-widget style cards (Total Inventory, Awaiting Review, Deed Verified Rate %, Average Listing Price).
  - Multi-photo interactive thumbnail gallery with full-screen OLED-black lightbox modal for hi-res photo inspection.
  - Ownership Deed Verification Section: Visual badge (`🛡️ Deed on File` vs `⚠️ Unverified`), deed preview modal, inline `deed_url` editing, `verification_notes` input, and one-click emerald `Toggle Verified` button.
  - Quick Approval Workflow: `Approve & Publish` (emerald) and `Reject Listing` (rose) with iOS-style rejection reason dialog.
  - Search & Filter HUD: Search by title/address, filter by property type, deed status, and price range.
  - Fallback sample properties for offline/empty-database demonstration.
- [x] **iOS-Grade City Boundary Polygon Manager (`CityBoundaryManager.tsx` — 1622 lines)**:
  - Embedded Mapbox GL JS v3 WebGL map engine with style toggling (Standard 3D, Satellite, Light Minimal).
  - Interactive Boundary Drawing & Vertex Editing: Click-to-add vertices, close polygon loop, undo vertex, clear boundary.
  - Floating Apple pill HUD: `[ 👆 Pan | ✏️ Draw | 🔄 Undo | 🗑️ Clear | 💾 Save ]`.
  - Real-time GIS Analytics Overlay: Live perimeter, enclosed area, vertex count, bounding box, and centroid computation.
  - Point-in-Polygon Test HUD with Jordan curve ray-casting algorithm.
  - Collapsible frosted glass Region Management Sidebar listing all search regions from Supabase with mini SVG polygon previews, iOS-styled active toggle switches, and CRUD operations.
  - FormSheet modal for adding/editing regions: Name, City, State, Slug, Default Zoom, and boundary polygon persisted to Supabase via `createSearchRegion()` / `updateSearchRegion()`.
- [x] **Admin Panel Navigation & Layout (`AdminAuthGuard.tsx`)**:
  - Sidebar links: `Dashboard & Approvals`, `Listing Moderation`, `Boundary Manager`, `Users & Admins` (Super Admin only).
  - Dynamic header titles per route.
- [x] **Production CI/CD & Build Pipelines**:
  - EAS Build profiles (`eas.json`) for both `user-app` and `owner-app` with development, preview, and production configurations.
  - iOS `bundleIdentifier` and Android `package` added to both `app.json` files.
  - GitHub Actions CI workflow (`.github/workflows/ci.yml`) for monorepo TypeScript checks and Turbo builds.

### Phase 5: Future Enhancements (Roadmap)
- [ ] **Push Notification Center (`apps/user-app`)**: In-app notification inbox with unread counts, grouping, and deep-linking to properties/saved searches.
- [ ] **Owner Analytics Dashboard (`apps/owner-app`)**: Listing view counts, enquiry conversion funnel, price comparison heatmaps.
- [ ] **AI-Powered Property Recommendations**: ML-based recommendation engine surfacing personalized listings based on browsing history and saved search patterns.
- [ ] **Vercel Production Deployments**: Automated Vercel deployments for `customer-web` and `admin-panel` with preview URLs on PRs.
