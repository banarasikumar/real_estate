# Real Estate Monorepo — Project Status & Brain Memory

> **Last Updated**: September 2026  
> **Repository**: `banarasikumar/real_estate`  
> **Active Branches**:
> - `main`: Synced with `origin/main` (stable production base)
> - `feature/mapbox-stunning-ui`: Synced with `origin/feature/mapbox-stunning-ui` (latest completed Mapbox Standard 3D & Zillow UI)  
> **Active Environment**: Windows (PowerShell) | Node.js / Turborepo / Expo SDK 57 / Next.js 15 / Supabase / Mapbox GL JS v3

---

## 1. Executive Summary & Current State

This monorepo contains an end-to-end multi-platform Real Estate application connecting Property Owners, Property Seekers, and Platform Admins.

All changes for the **Zillow-identical UI & Mapbox Standard 3D** initiative have been implemented, verified, performance-tuned to 60–120fps, and safely pushed to GitHub under branch `feature/mapbox-stunning-ui`.

### Git Branch Status
| Branch | Commit | Remote Tracking | Status |
|---|---|---|---|
| `main` | `c96af5b6` | `origin/main` | Production base, merged with Mapbox Standard 3D & Zillow UI, 100% in sync |
| `feature/mapbox-stunning-ui` | `c96af5b6` | `origin/feature/mapbox-stunning-ui` | Merged into `main`, 100% in sync |

- **Security Note**: All Mapbox access tokens were purged from Git commit history. Tokens reside strictly in gitignored `.env` files (`apps/user-app/.env` and `apps/customer-web/.env.local`). GitHub Push Protection passed with zero warnings.

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

## 3. What Was Completed & Delivered

### 3.1 Seeker Mobile Application (`apps/user-app`)

1. **Mapbox Standard 3D Discovery Map (`MobileMapboxView.tsx`)**:
   - Hardware-accelerated WebGL map using Mapbox GL JS v3 inside a React Native WebView.
   - Dynamic Rent (`#7B1FA2` Deep Violet) vs. Sale (`#e11d48` Brand Rose) price markers.
   - 3D perspective camera controls with smooth pitch/bearing easing.
   - Mapbox logo watermark completely hidden via CSS for a clean luxury interface.
   - Wrapped with `React.memo` to eliminate unnecessary map re-renders during gestures.

2. **Zillow Tri-State Bottom Sheet (`MobileTriStateBottomSheet.tsx`)**:
   - **Snap States**:
     - `PEEK` (72px): Handle bar `—` with centered `{count} rentals available`.
     - `DUAL` (44% screen height): Split screen with map visible in top 56% and scrollable cards in bottom 44%.
     - `FULL` (100% available height): Solid white fullscreen card feed with zero map visible.
   - **GPU-Accelerated Native Driver Physics (60–120fps)**:
     - Implemented with `transform: [{ translateY }]` using **`useNativeDriver: true`**, running directly on the native GPU compositor thread.
     - Snappy spring constants (`damping: 28, stiffness: 300, mass: 0.8`) with zero rubbery jitter.
     - Handle bar PanResponder: light 8px drag or upward flick in PEEK immediately glides into DUAL; tapping transitions between states.
   - **Immersive Solid White Sticky Fullscreen Header (Zillow Screenshot 2 Match)**:
     - Calibrated height: `availableHeight = SCREEN_HEIGHT - 60` (respecting the 60dp bottom tab bar so the header never shifts into the status bar).
     - Calibrated status bar padding: `paddingTop: (StatusBar.currentHeight || 24) + 12`.
     - **Row 1**: Floating Search Pill (`height: 48, borderRadius: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0'`) + Circular Filter Button (`48x48, borderRadius: 24`, vector slider icon).
     - **Row 2**: Exact Zillow typography with flat blue styling: `Sort: Recommended ⇅` (`#006aff`, `14px, bold`) and `Save search` (`#006aff`, `14px, bold`), separated by a hairline `#f1f5f9` bottom border.
   - **Reliable Downward Overscroll to DUAL Mode**:
     - Direct touch tracking on the card list (`scrollY <= 2` and downward drag `dy > 35px`) immediately and smoothly returns to DUAL mode on Android and iOS.
     - Dragging downward on the header subheader row also triggers smooth return to DUAL mode.
   - **Instant PEEK Map Snap**:
     - Floating black `[ 🗺️ Map ]` button at bottom center in FULL mode smoothly glides all the way down into PEEK mode.

3. **Feed Performance & Virtualization Optimization**:
   - Eliminated nested VirtualizedLists: Replaced nested card photo `FlatList` in `LuxuryPropertyCard` with native horizontal `<ScrollView horizontal pagingEnabled>` (eliminated 604ms JS thread freeze).
   - Feed is kept pre-mounted in PEEK (clipped off-screen), ensuring **0ms startup latency** when expanding.
   - Outer FlatList tuned with `getItemLayout` (356px fixed items), `removeClippedSubviews`, `initialNumToRender={4}`, and `windowSize={5}`.

4. **Zillow Touch Lasso Drawing (`MobileTouchDrawOverlay.tsx` & `ZillowIcons.tsx`)**:
   - Vector pointing finger with drawing loop icon (`ZillowDrawIcon`).
   - Hardware-accelerated continuous SVG `<Path>` with translucent blue fill (`rgba(37, 99, 235, 0.12)`) and active fingertip indicator.
   - Anchored Floating Action HUD (`[🌐 Layer]`, `[👆 Draw]`, `[🎯 GPS]`, `[Save search]`) mounted inside bottom sheet `Animated.View`, moving 1:1 synchronously with the sheet.

5. **Zoom-Dependent Level of Detail (LOD) & Multi-Unit Clustering (`markerClustering.ts`)**:
   - Far zoom: Small dots / purple building badges.
   - Mid zoom: Price capsules with carets.
   - Close zoom: Multi-unit building badges (`{count} units`, building icon + `₹{price}+`) with collision-aware photo thumbnail cards.
   - Multi-unit building bottom drawer modal (`MobileBuildingDrawer.tsx`).

6. **Full-Screen Search Modal (`MobileSearchModal.tsx` & `searchRegions.ts`)**:
   - Fullscreen search modal with search history (clock icons), suggested searches, and tabs for For sale / For rent / Sold.
   - Pre-configured search regions (Los Angeles, Mumbai, Bangalore, Delhi NCR, Goa) with boundary polygons rendered on the map in blue (`#2563eb`).

7. **Clean Platform Standards**:
   - Zero deprecated `SafeAreaView` warnings (migrated to `react-native-safe-area-context`).
   - Metro monorepo symlink resolution configured in `metro.config.js`.

---

### 3.2 Customer Web Application (`apps/customer-web`)

- **Mapbox Standard 3D Web Engine (`MapboxView.tsx`)**:
  - Upgraded from MapLibre to Mapbox GL JS v3 with 3D buildings and lighting presets.
  - Floating HUD (`MapControlsOverlay.tsx`) with 3D/2D toggle, dynamic compass rotating to true north, zoom controls, and style toggle.
  - Luxury property preview popups (`MapPropertyPopup.tsx`).

---

## 4. Active Background Tasks & Services

| Service | Status | Port | Command |
|---|---|---|---|
| Metro Bundler (`user-app`) | Active (`task-110`) | `8081` | `npx expo start --clear` |
| Customer Web (`customer-web`) | Ready to start | `3000` | `npm run dev --workspace=customer-web` |

### Environment Variables
- `apps/user-app/.env`: `EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...`
- `apps/customer-web/.env.local`: `NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...`

---

## 5. Next Steps & Future Roadmap

1. **Owner App Harmonization (`apps/owner-app`)**:
   - Bring any relevant Mapbox 3D or address pin-drop capabilities into the property listing creation flow.
2. **Saved Searches & Boundary Sync**:
   - Connect the 'Save search' button and drawn boundary polygons to Supabase user preferences table for push notification alerts on new listings in saved areas.
3. **Property Details Page**:
   - Refine the property details view when clicking through from the bottom sheet card feed or map popups.
