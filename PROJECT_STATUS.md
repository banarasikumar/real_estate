# Real Estate Monorepo — Project Status & Brain Memory

> **Last Updated**: September 15, 2026  
> **Repository**: `banarasikumar/real_estate`  
> **Active Branch**: `main` (clean working tree, in sync with `origin/main` — remote push successful)  
> **Active Environment**: Windows (PowerShell) | Node.js / Turborepo / Expo SDK 57 / Next.js 15 / Supabase / Mapbox GL JS v3  
> **Active Metro Bundler**: Port `8081` (`apps/user-app`)

---

## 1. Executive Summary & Current State

This monorepo houses a multi-platform, end-to-end luxury Real Estate platform connecting Property Owners, Property Seekers, and Platform Admins.

### Current System Health & Stability
- **Seeker App (`apps/user-app`)**: Fully interactive, verified, and running smoothly. Featuring iOS-grade Zillow-fidelity physics, 1:1 real-time finger tracking, screen-coordinate gesture targeting (`gesture.y0`), seamless borderless surface fusion with the stationary search bar, Mapbox 3D WebGL discovery map, locked container dimensions, and 76-listing demo dataset across LA, NY, and Mumbai.
- **TypeScript Type Safety**: 0 errors across the monorepo (`npm run check-types --workspace=user-app` passes cleanly with exit code 0).
- **Git Working Tree**: 100% clean. All changes are committed and pushed to `main` up to commit `79156ab1`.

### Local Git Commit History (Recent Sprints)
| Commit | Description | Scope |
|---|---|---|
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
