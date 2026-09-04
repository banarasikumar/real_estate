-- Migration: Admin & Super Admin Roles, Functions, and RLS Policies

-- Helper function to check if current user is an Admin or Super Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
$$;

-- Helper function to check if current user is a Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'SUPER_ADMIN'
  );
$$;

-- Allow Admins and Super Admins to view ALL properties (including PENDING_APPROVAL, DRAFT, REJECTED)
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
CREATE POLICY "Admins can view all properties" 
ON public.properties FOR SELECT 
TO authenticated 
USING (public.is_admin());

-- Allow Admins and Super Admins to update ALL properties (approve/reject/edit)
DROP POLICY IF EXISTS "Admins can update all properties" ON public.properties;
CREATE POLICY "Admins can update all properties" 
ON public.properties FOR UPDATE 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Allow Admins and Super Admins to delete properties
DROP POLICY IF EXISTS "Admins can delete all properties" ON public.properties;
CREATE POLICY "Admins can delete all properties" 
ON public.properties FOR DELETE 
TO authenticated 
USING (public.is_admin());

-- Allow Admins to manage property media
DROP POLICY IF EXISTS "Admins can manage property media" ON public.property_media;
CREATE POLICY "Admins can manage property media" 
ON public.property_media FOR ALL 
TO authenticated 
USING (public.is_admin());

-- Allow Admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (public.is_admin());

-- Allow Super Admins to update user profiles / roles
DROP POLICY IF EXISTS "Super Admins can update profile roles" ON public.profiles;
CREATE POLICY "Super Admins can update profile roles" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());
