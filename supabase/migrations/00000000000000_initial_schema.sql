-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom ENUM Types
CREATE TYPE user_role AS ENUM ('USER', 'OWNER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE property_type AS ENUM ('APARTMENT', 'HOUSE', 'VILLA', 'COMMERCIAL');
CREATE TYPE listing_type AS ENUM ('SALE', 'RENT');
CREATE TYPE furnishing_status AS ENUM ('FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED');
CREATE TYPE property_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'PAUSED', 'REJECTED', 'SOLD_RENTED');
CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE enquiry_status AS ENUM ('NEW', 'READ', 'RESPONDED', 'CLOSED');

-- 1. Profiles Table (Extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    phone_number TEXT,
    role user_role DEFAULT 'USER'::user_role,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Properties Table
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
    latitude NUMERIC,
    longitude NUMERIC,
    status property_status DEFAULT 'DRAFT'::property_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- 3. Property Media Table
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

-- 4. Enquiries Table
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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Profiles: Anyone can read profiles. Users can only update their own profile.
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Properties: Anyone can see published properties. Owners can see and edit their own properties.
CREATE POLICY "Published properties are public" ON properties FOR SELECT USING (status = 'PUBLISHED'::property_status);
CREATE POLICY "Owners can view own properties" ON properties FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert own properties" ON properties FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update own properties" ON properties FOR UPDATE USING (auth.uid() = owner_id);

-- Enquiries: Users can see their own sent enquiries. Owners can see enquiries on their properties.
CREATE POLICY "Users view own sent enquiries" ON enquiries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners view received enquiries" ON enquiries FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create enquiries" ON enquiries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update enquiry status" ON enquiries FOR UPDATE USING (auth.uid() = owner_id);
