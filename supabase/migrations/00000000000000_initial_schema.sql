-- Enable UUID generation and Cryptography
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- CUSTOM TYPES & ENUMS
-- ==========================================
CREATE TYPE user_role AS ENUM ('USER', 'OWNER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE subscription_tier AS ENUM ('FREE', 'PRO', 'ENTERPRISE');
CREATE TYPE property_type AS ENUM ('APARTMENT', 'HOUSE', 'VILLA', 'COMMERCIAL');
CREATE TYPE listing_type AS ENUM ('SALE', 'RENT');
CREATE TYPE furnishing_status AS ENUM ('FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED');
CREATE TYPE property_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'PAUSED', 'REJECTED', 'SOLD_RENTED');
CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE enquiry_status AS ENUM ('NEW', 'READ', 'RESPONDED', 'CLOSED');

-- ==========================================
-- 1. PROFILES TABLE (Extends Supabase Auth)
-- ==========================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone_number TEXT,
    role user_role DEFAULT 'USER'::user_role,
    subscription subscription_tier DEFAULT 'FREE'::subscription_tier,
    company_name TEXT, -- For real estate agencies
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile trigger on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 2. PROPERTIES TABLE
-- ==========================================
CREATE TABLE properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    prop_type property_type NOT NULL,
    list_type listing_type NOT NULL,
    price NUMERIC NOT NULL,
    area_sqft NUMERIC,
    bedrooms INT,
    bathrooms INT,
    furnishing furnishing_status,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    status property_status DEFAULT 'DRAFT'::property_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. PROPERTY MEDIA TABLE
-- ==========================================
CREATE TABLE property_media (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL,
    type media_type DEFAULT 'IMAGE'::media_type,
    is_featured BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE property_media ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. ENQUIRIES TABLE
-- ==========================================
CREATE TABLE enquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    status enquiry_status DEFAULT 'NEW'::enquiry_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 5. SAVED PROPERTIES (Favorites)
-- ==========================================
CREATE TABLE saved_properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, property_id)
);
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STORAGE BUCKET CREATION (For Images)
-- ==========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property_images', 'property_images', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Properties
CREATE POLICY "Published properties are public" ON properties FOR SELECT USING (status = 'PUBLISHED'::property_status);
CREATE POLICY "Owners can view own properties" ON properties FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert own properties" ON properties FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own properties" ON properties FOR UPDATE USING (auth.uid() = owner_id);

-- Property Media
CREATE POLICY "Property media is public" ON property_media FOR SELECT USING (true);
CREATE POLICY "Owners can manage property media" ON property_media FOR ALL USING (
    auth.uid() IN (SELECT owner_id FROM properties WHERE id = property_media.property_id)
);

-- Enquiries
CREATE POLICY "Users view own sent enquiries" ON enquiries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners view received enquiries" ON enquiries FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create enquiries" ON enquiries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update enquiry status" ON enquiries FOR UPDATE USING (auth.uid() = owner_id);

-- Saved Properties
CREATE POLICY "Users manage own saved properties" ON saved_properties FOR ALL USING (auth.uid() = user_id);

-- Storage bucket access
CREATE POLICY "Public image viewing" ON storage.objects FOR SELECT USING (bucket_id = 'property_images');
CREATE POLICY "Authenticated users can upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'property_images' AND auth.role() = 'authenticated');
