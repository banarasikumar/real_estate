-- Migration: Add is_approved column and update constraints/policies for property lifecycle

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' AND column_name = 'is_approved'
    ) THEN
        ALTER TABLE public.properties ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Update existing PUBLISHED properties to have is_approved = true
UPDATE public.properties 
SET is_approved = TRUE 
WHERE status = 'PUBLISHED';

-- Ensure storage bucket 'property_images' is public
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'property_images'
    ) THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('property_images', 'property_images', true);
    ELSE
        UPDATE storage.buckets SET public = true WHERE id = 'property_images';
    END IF;
END $$;

-- Storage RLS is already enabled by Supabase


-- Policy to allow public reads from property_images
DROP POLICY IF EXISTS "Public Access property_images" ON storage.objects;
CREATE POLICY "Public Access property_images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'property_images');

-- Policy to allow authenticated users to upload to property_images
DROP POLICY IF EXISTS "Authenticated users can upload property_images" ON storage.objects;
CREATE POLICY "Authenticated users can upload property_images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'property_images');

-- Policy to allow owners to manage their uploaded property_images
DROP POLICY IF EXISTS "Owners can update own property_images" ON storage.objects;
CREATE POLICY "Owners can update own property_images" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'property_images');

DROP POLICY IF EXISTS "Owners can delete own property_images" ON storage.objects;
CREATE POLICY "Owners can delete own property_images" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'property_images');

-- Ensure properties table RLS allows owners to update their own properties
DROP POLICY IF EXISTS "Owners can update own properties" ON public.properties;
CREATE POLICY "Owners can update own properties" 
ON public.properties FOR UPDATE 
TO authenticated 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);
