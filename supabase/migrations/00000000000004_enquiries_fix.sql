-- Migration: Fix enquiries schema, nullable user_id for guest leads, auto-fill owner_id trigger, and RLS policies

-- 1. Make user_id nullable on enquiries so unauthenticated guests can submit enquiries
ALTER TABLE public.enquiries ALTER COLUMN user_id DROP NOT NULL;

-- 2. Trigger to automatically resolve owner_id and user_id if omitted
CREATE OR REPLACE FUNCTION public.set_enquiry_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If owner_id not provided, fetch from properties table
  IF NEW.owner_id IS NULL THEN
    SELECT owner_id INTO NEW.owner_id FROM public.properties WHERE id = NEW.property_id;
  END IF;

  -- If user_id is not provided but user is logged in, attach auth.uid()
  IF NEW.user_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_enquiry_owner_id ON public.enquiries;
CREATE TRIGGER trg_set_enquiry_owner_id
BEFORE INSERT ON public.enquiries
FOR EACH ROW
EXECUTE FUNCTION public.set_enquiry_owner_id();

-- 3. Update RLS policies on enquiries
DROP POLICY IF EXISTS "Users can create enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Anyone can create enquiries" ON public.enquiries;
CREATE POLICY "Anyone can create enquiries" 
ON public.enquiries FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Owners view received enquiries" ON public.enquiries;
CREATE POLICY "Owners view received enquiries" 
ON public.enquiries FOR SELECT 
USING (auth.uid() = owner_id OR public.is_admin());

DROP POLICY IF EXISTS "Users view own sent enquiries" ON public.enquiries;
CREATE POLICY "Users view own sent enquiries" 
ON public.enquiries FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Owners can update enquiry status" ON public.enquiries;
CREATE POLICY "Owners can update enquiry status" 
ON public.enquiries FOR UPDATE 
USING (auth.uid() = owner_id OR public.is_admin());
