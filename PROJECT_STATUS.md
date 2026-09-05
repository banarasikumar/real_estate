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

## 3. Current Implementation Status

### 📱 `apps/owner-app` (Owner Mobile Application)
- **Authentication**: Email/Password login, session persistence via Supabase.
- **Dashboard (`app/(tabs)/index.tsx`)**: Property metrics, total listings, active enquiries, quick action shortcuts.
- **Property Management (`app/(tabs)/properties.tsx`)**: List of owned properties with live status badges (`PUBLISHED`, `PENDING_APPROVAL`, `DRAFT`, `REJECTED`, `SOLD_RENTED`), pause/delete actions.
- **Create Property (`app/(tabs)/create-property.tsx`)**:
  - Multi-photo picker with custom aspect-ratio cropper integration.
  - Property type, listing type (Sale/Rent), price, area, bedroom/bathroom selectors, address & amenities.
  - Submission creates property in `PENDING_APPROVAL` status for Admin review.
- **Custom 4:3 Image Cropper (`components/ImageCropperModal.tsx`)** ⭐ *Recently Perfected*:
  - **4:3 Aspect Ratio Viewport**: With dim/shadow overlay showing image areas beyond the crop box for contextual adjustment.
  - **Zoom Slider & Fine-Tuning**: Smooth continuous zoom slider (1.0x to 3.0x) flanked by `+` and `-` step buttons (0.1x steps) with gutter offsets to eliminate thumb overlap.
  - **Touch Gestures**: Smooth baseline panning and 2x double-tap zoom toggle.
  - **Gaps Prevention**: Dynamic scale clamping ensuring the image always fills both dimensions without blank borders.
  - **Per-Photo Framing Memory**: State-persisted `transformsMap` remembering each photo's exact zoom scale, pan position, and slider thumb when toggling between images.
  - **Confirm & Next Flow**: Replaced confusing 'Crop and Next' with 'Confirm & Next' (dynamically becomes 'Confirm' on last photo) with automatic progression.
  - **Non-Blocking Toast Warning**: Floating pill warning (`⚠️ Please frame all photos first (X remaining)`) instead of disruptive alerts.
  - **Sequential Batch Cropping**: 'Crop & Finish' crops all confirmed photos in one batch with progress indicator modal (`Cropping photo X of Y...`).
- **Enquiries & Realtime Chat (`app/(tabs)/enquiries.tsx`)**:
  - Incoming seeker leads with instant response drawer.
  - Full two-way realtime chat powered by Supabase Realtime postgres changes.
- **Profile (`app/(tabs)/profile.tsx`)**: Owner details, phone number, logout.

- **Edit Property (`app/edit-property/[id].tsx`)** ⭐ *Newly Added*:
  - Route navigation with `useLocalSearchParams` and stack presentation.
  - Pre-fills property details (title, description, price, area, specs, address, property & listing type chips).
  - **Unified Media Manager**: Displays existing uploaded photos and newly cropped photos. Supports setting cover photo (★), reordering left/right (◀/▶), deleting photos, and adding new photos with the 4:3 `ImageCropperModal`.
  - **Admin Re-Approval Lifecycle**: Amber banner alert and confirmation prompt when modifying published listings. Submitting resets status to `PENDING_APPROVAL` and `is_approved = false`.
  - Cleans up deleted photos from Supabase Storage (`property_images` bucket) and updates order in `property_media`.
- **Property Management & Trash Recovery (`app/(tabs)/properties.tsx`)** ⭐ *Newly Enhanced*:
  - **Top Segmented Filter Chips**: "Active Listings" vs "Trash / Archived (30 Days)" with live count badges.
  - **Card Action Bar**: Dedicated "Edit" button (routes to `/edit-property/[id]`) and "Delete" button.
  - **Deletion Strategy**: Prompts "Move to Trash (30 Days)" (soft-delete via `deleted_at`) or "Permanently Delete Now" with destructive confirmation.
  - **Trash Recovery Tab**: Shows days remaining until 30-day auto-purge, with one-tap "Restore Listing" and immediate "Permanently Delete Now" actions.

### 📱 `apps/user-app` (Seeker Mobile Application)
- **Feed & Discovery (`app/(tabs)/index.tsx`)**: Hero banner, city chips, quick filter tabs, featured cards, search bar.
- **Property Detail (`app/property/[id].tsx`)**: Photo gallery, pricing, specs, amenities list, owner contact card, Enquiry modal, Realtime chat modal.
- **Saved Favorites (`app/(tabs)/saved.tsx`)**: Bookmark listings with optimistic UI updates.
- **Enquiries (`app/(tabs)/enquiries.tsx`)**: History of submitted enquiries with current response status.
- **Realtime Messages (`app/(tabs)/messages.tsx`)**: Active conversation threads with owners.
- **Profile (`app/(tabs)/profile.tsx`)**: User credentials, saved preferences, logout.

### 💻 `apps/admin-panel` (Web Admin Dashboard)
- **Properties Review (`app/properties/pending/page.tsx`)**: Review incoming owner submissions and edited listings with photo galleries and specs.
- **Approval Actions**: One-click "Approve" (moves status to `PUBLISHED`) or "Reject" (prompts reason).
- **Users Management (`app/users/page.tsx`)**: View registered owners and seekers, role assignments.

### 🌐 `apps/customer-web` (Public Web Portal)
- **Home & Search (`app/page.tsx`, `app/search/page.tsx`)**: Full discovery experience with URL query filter params.
- **Property Details (`app/property/[id]/page.tsx`)**: Desktop-optimized layout, gallery carousel, lead form.
- **User Dashboard (`app/enquiries/page.tsx`, `app/messages/page.tsx`, `app/saved/page.tsx`)**: Parity with mobile seeker features.

---

## 4. Supabase Database & Migrations

All migrations reside in `supabase/migrations/`:
1. `00000000000000_initial_schema.sql`: Profiles, properties, property_media, enquiries, saved_properties.
2. `00000000000001_realtime_chat.sql`: `messages` table with sender/receiver IDs, enquiry linking, and realtime pub/sub.
3. `00000000000002_property_lifecycle.sql`: Property status enum and transition security rules.
4. `00000000000003_admin_roles_rls.sql`: Admin privileges and review access.
5. `00000000000004_enquiries_fix.sql`: Foreign key relationships and RLS adjustments for enquiries.
6. `00000000000005_soft_delete_and_owner_delete.sql`: Soft delete (`deleted_at`), owner DELETE RLS policy, and performance indexes.

---

## 5. Development Servers & Ports

| Application | Command | Default Port / Host |
|-------------|---------|---------------------|
| `owner-app` | `npm run dev --workspace=owner-app` | `8082` (LAN host: `192.168.31.63`) |
| `user-app` | `npm run dev --workspace=user-app` | `8081` |
| `admin-panel` | `npm run dev --workspace=admin-panel` | `3001` |
| `customer-web` | `npm run dev --workspace=customer-web` | `3000` |

*Note: In Windows PowerShell, run sequential commands using `;` instead of `&&`, and escape or quote parentheses when referencing Expo paths (e.g. `'apps/owner-app/app/(tabs)/create-property.tsx'`).*

---

## 6. Next Session Plan & Roadmap

### Immediate Next Steps:
1. **Live End-to-End Publishing & Admin Verification Lifecycle**:
   - Start the development servers (`owner-app` on `:8082`, `admin-panel` on `:3001`, `user-app` on `:8081`, `customer-web` on `:3000`).
   - Create a listing in `owner-app` with 4:3 cropped photos.
   - Verify submission in `admin-panel` (`/properties/pending`) and approve it.
   - Edit the listing from `owner-app` (modify price/photo) -> verify it returns to pending approval.
   - Re-approve in `admin-panel` -> verify instant live reflection in `user-app` and `customer-web`.
   - Test "Move to Trash (30 Days)" and "Restore Listing".
2. **Push Notifications & Unread Badges**:
   - Real-time badge counters for incoming enquiries and chat messages for both owner and seeker tabs.
3. **Production Build & EAS Setup**:
   - Verify `eas.json` configuration, app icons, splash screens, and generate release APKs.
