-- Migration: Multi-Unit Complexes & Owner Harmonization
-- 00000000000010_multi_unit_complexes.sql

-- 1. Add multi-unit complex columns to public.properties
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS parent_property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_complex BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS complex_name TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_units INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS footprint_polygon JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS unit_number TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS floor_number INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'RESERVED', 'SOLD', 'RENTED'));

-- 2. Add performance indexes for parent complexes, complex flag, and availability status
CREATE INDEX IF NOT EXISTS idx_properties_parent_id ON public.properties(parent_property_id);
CREATE INDEX IF NOT EXISTS idx_properties_is_complex ON public.properties(is_complex);
CREATE INDEX IF NOT EXISTS idx_properties_availability ON public.properties(availability_status);

-- 3. Security Definer Helper functions to prevent RLS recursion on self-referencing properties
CREATE OR REPLACE FUNCTION public.is_complex_owner(parent_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = parent_id
    AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_parent_published(parent_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = parent_id
    AND status = 'PUBLISHED'::property_status
  );
$$;

-- 4. Update RLS policies to ensure owners can manage all units linked to their complex

-- Owners can view own properties and all units linked to their complexes
DROP POLICY IF EXISTS "Owners can view own properties" ON public.properties;
CREATE POLICY "Owners can view own properties" 
ON public.properties FOR SELECT 
TO authenticated 
USING (
    auth.uid() = owner_id 
    OR (parent_property_id IS NOT NULL AND public.is_complex_owner(parent_property_id))
);

-- Owners can insert properties and units for their complexes
DROP POLICY IF EXISTS "Owners can insert own properties" ON public.properties;
CREATE POLICY "Owners can insert own properties" 
ON public.properties FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.uid() = owner_id 
    OR (parent_property_id IS NOT NULL AND public.is_complex_owner(parent_property_id))
);

-- Owners can update own properties and units linked to their complexes
DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
CREATE POLICY "Owners can update own properties" 
ON public.properties FOR UPDATE 
TO authenticated 
USING (
    auth.uid() = owner_id 
    OR (parent_property_id IS NOT NULL AND public.is_complex_owner(parent_property_id))
)
WITH CHECK (
    auth.uid() = owner_id 
    OR (parent_property_id IS NOT NULL AND public.is_complex_owner(parent_property_id))
);

-- Owners can delete own properties and units linked to their complexes
DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
CREATE POLICY "Owners can delete own properties" 
ON public.properties FOR DELETE 
TO authenticated 
USING (
    auth.uid() = owner_id 
    OR (parent_property_id IS NOT NULL AND public.is_complex_owner(parent_property_id))
);

-- Allow public viewing of published properties and units in published complexes
DROP POLICY IF EXISTS "Published properties are public" ON public.properties;
CREATE POLICY "Published properties are public" 
ON public.properties FOR SELECT 
USING (
    status = 'PUBLISHED'::property_status 
    OR (parent_property_id IS NOT NULL AND public.is_parent_published(parent_property_id))
);

-- Ensure owners can manage media for units linked to their complexes
DROP POLICY IF EXISTS "Owners can manage property media" ON public.property_media;
CREATE POLICY "Owners can manage property media" 
ON public.property_media FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.properties p 
        WHERE p.id = property_media.property_id 
        AND (p.owner_id = auth.uid() OR (p.parent_property_id IS NOT NULL AND public.is_complex_owner(p.parent_property_id)))
    )
);
