# System Architecture

This document defines the high-level architecture and monorepo structure for the Real Estate SaaS MVP.

## Architecture Overview

The system is built on a shared backend (Supabase) and a monorepo (Turborepo) that contains all front-end clients, sharing types and UI components.

### 1. Backend Layer (Supabase)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth (Email/Password & OTP)
- **Storage**: Supabase Storage buckets for property images.
- **Security**: Row Level Security (RLS) enforcing multi-tenant access control directly at the database level.

### 2. Monorepo Workspace (Turborepo)
The codebase will reside in a single repository to maximize code reuse.

```text
/
├── apps/
│   ├── admin-panel/        # Next.js App Router (Web Admin Dashboard)
│   ├── customer-web/       # Next.js App Router (SEO-optimized discovery site)
│   ├── owner-app/          # Expo / React Native (Android/iOS app for owners)
│   └── user-app/           # Expo / React Native (Android/iOS app for seekers)
├── packages/
│   ├── ui/                 # Shared UI components (React Native Web + Native)
│   ├── types/              # Shared TypeScript definitions (e.g., Supabase schema)
│   ├── api/                # Shared Supabase client config and data fetching logic
│   └── config/             # Shared ESLint/Prettier/TypeScript configs
└── turbo.json
```

## Application Environments

### Customer Web & Admin Panel
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Data Fetching**: Supabase Server & Client Components
- **Hosting Target**: Vercel

### User & Owner Mobile Apps
- **Framework**: React Native + Expo
- **Navigation**: Expo Router (File-based routing)
- **Styling**: NativeWind (Tailwind for React Native) or StyleSheet
- **Data Fetching**: TanStack Query + Supabase JS Client
- **Map Provider**: Google Maps API
- **Build/Deployment Target**: EAS (Expo Application Services)

## Cross-Platform Strategy
We separate the mobile apps from the web apps to optimize for SEO on the web and native performance on mobile. However, all apps consume the same `packages/api` and `packages/types` to ensure that a database change reflects perfectly across all clients.
