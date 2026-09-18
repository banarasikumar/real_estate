-- Migration: Search Regions & Property Verification
-- 00000000000011_search_regions.sql

-- 1. Create search_regions table
CREATE TABLE IF NOT EXISTS public.search_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    zoom DOUBLE PRECISION DEFAULT 11.0,
    boundary_polygon JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add is_verified, deed_url, and verification_notes to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS deed_url TEXT;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 3. Enable RLS on search_regions
ALTER TABLE public.search_regions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for search_regions
DROP POLICY IF EXISTS "Public can view active search regions" ON public.search_regions;
CREATE POLICY "Public can view active search regions"
ON public.search_regions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can insert search regions" ON public.search_regions;
CREATE POLICY "Admins can insert search regions"
ON public.search_regions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "Admins can update search regions" ON public.search_regions;
CREATE POLICY "Admins can update search regions"
ON public.search_regions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

DROP POLICY IF EXISTS "Admins can delete search regions" ON public.search_regions;
CREATE POLICY "Admins can delete search regions"
ON public.search_regions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
);

-- 5. Realtime Replication for search_regions
ALTER TABLE public.search_regions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.search_regions;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_search_regions_slug ON public.search_regions(slug);
CREATE INDEX IF NOT EXISTS idx_search_regions_is_active ON public.search_regions(is_active);
CREATE INDEX IF NOT EXISTS idx_properties_is_verified ON public.properties(is_verified);

-- 7. Seed initial regions from searchRegions.ts (LA, NY, Mumbai, Bangalore, Delhi, Goa)
INSERT INTO public.search_regions (slug, name, city, state, center_lat, center_lng, zoom, boundary_polygon, is_active)
VALUES 
(
  'los-angeles',
  'Los Angeles CA homes',
  'Los Angeles',
  'CA',
  34.0522,
  -118.2437,
  10.5,
  '[[ -118.6000, 34.2850 ], [ -118.4500, 34.3400 ], [ -118.3200, 34.2800 ], [ -118.3150, 34.1850 ], [ -118.2450, 34.1450 ], [ -118.1850, 34.1350 ], [ -118.1650, 34.0650 ], [ -118.2150, 34.0150 ], [ -118.2550, 33.9350 ], [ -118.2850, 33.8400 ], [ -118.2900, 33.7900 ], [ -118.2950, 33.7150 ], [ -118.2600, 33.7350 ], [ -118.3050, 33.7850 ], [ -118.3650, 33.9100 ], [ -118.4350, 33.9450 ], [ -118.4600, 33.9850 ], [ -118.4900, 34.0250 ], [ -118.5550, 34.0400 ], [ -118.6250, 34.1450 ], [ -118.6400, 34.2000 ], [ -118.6000, 34.2850 ]]'::jsonb,
  true
),
(
  'new-york',
  'New York NY homes',
  'New York',
  'NY',
  40.7488,
  -73.9851,
  11.0,
  '[[ -74.0400, 40.7000 ], [ -74.0150, 40.7500 ], [ -73.9900, 40.7950 ], [ -73.9400, 40.8750 ], [ -73.9100, 40.8500 ], [ -73.9250, 40.7750 ], [ -73.9550, 40.7250 ], [ -73.9850, 40.6900 ], [ -74.0200, 40.6500 ], [ -74.0500, 40.6400 ], [ -74.0400, 40.7000 ]]'::jsonb,
  true
),
(
  'mumbai',
  'Mumbai Luxury Homes',
  'Mumbai',
  'Maharashtra',
  19.0760,
  72.8777,
  11.0,
  '[[ 72.8150, 18.9050 ], [ 72.8220, 18.9400 ], [ 72.8120, 19.0150 ], [ 72.8250, 19.0600 ], [ 72.8280, 19.1050 ], [ 72.8080, 19.1450 ], [ 72.7950, 19.1900 ], [ 72.820, 19.2450 ], [ 72.8650, 19.2900 ], [ 72.9300, 19.2500 ], [ 72.9600, 19.1850 ], [ 72.9300, 19.0900 ], [ 72.9050, 19.0200 ], [ 72.8550, 18.9600 ], [ 72.8150, 18.9050 ]]'::jsonb,
  true
),
(
  'bangalore',
  'Bangalore Tech Corridor',
  'Bangalore',
  'Karnataka',
  12.9716,
  77.5946,
  11.0,
  '[[ 77.5950, 13.1100 ], [ 77.6350, 13.0450 ], [ 77.7450, 12.9850 ], [ 77.7000, 12.9300 ], [ 77.6700, 12.8400 ], [ 77.5800, 12.8800 ], [ 77.5200, 12.9200 ], [ 77.4900, 12.9700 ], [ 77.5250, 13.0350 ], [ 77.5950, 13.1100 ]]'::jsonb,
  true
),
(
  'delhi',
  'New Delhi & NCR Residences',
  'New Delhi',
  'Delhi',
  28.6139,
  77.2090,
  11.0,
  '[[ 77.1000, 28.7500 ], [ 77.2100, 28.7300 ], [ 77.3100, 28.6600 ], [ 77.3400, 28.5800 ], [ 77.2900, 28.4900 ], [ 77.1900, 28.5100 ], [ 77.0900, 28.4800 ], [ 77.0150, 28.5600 ], [ 77.0700, 28.6400 ], [ 77.1200, 28.7000 ], [ 77.1000, 28.7500 ]]'::jsonb,
  true
),
(
  'goa',
  'Goa Coastal Villas & Homes',
  'Goa',
  'Goa',
  15.4909,
  73.8278,
  11.5,
  '[[ 73.7300, 15.6800 ], [ 73.7400, 15.5900 ], [ 73.7650, 15.5200 ], [ 73.8100, 15.4600 ], [ 73.8300, 15.3900 ], [ 73.9100, 15.2800 ], [ 73.9300, 15.2200 ], [ 73.9500, 15.1500 ], [ 74.0200, 15.2800 ], [ 74.0200, 15.4000 ], [ 73.9300, 15.5400 ], [ 73.7900, 15.6900 ], [ 73.7300, 15.6800 ]]'::jsonb,
  true
)
ON CONFLICT (slug) DO NOTHING;
