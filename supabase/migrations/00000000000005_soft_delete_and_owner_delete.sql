-- Migration: Property Soft Delete, Owner Delete RLS, and Performance Indexes

-- 1. Add deleted_at column to public.properties
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'properties' AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE public.properties ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- 2. Add performance indexes on (owner_id, deleted_at) and (status, deleted_at)
CREATE INDEX IF NOT EXISTS idx_properties_owner_deleted ON public.properties(owner_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_properties_status_deleted ON public.properties(status, deleted_at);

-- 3. Add RLS policy: "Owners can delete own properties"
DROP POLICY IF EXISTS "Owners can delete own properties" ON public.properties;
CREATE POLICY "Owners can delete own properties" 
ON public.properties FOR DELETE 
TO authenticated 
USING (auth.uid() = owner_id);
