-- Migration: Saved Searches & Alert Subscriptions
-- 00000000000009_saved_searches_and_alerts.sql

-- 1. Create saved_searches table
CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    search_query TEXT,
    region_id TEXT,
    filters JSONB DEFAULT '{}'::jsonb,
    boundary JSONB DEFAULT NULL,
    notification_frequency TEXT DEFAULT 'INSTANT' CHECK (notification_frequency IN ('INSTANT', 'DAILY', 'NEVER')),
    alert_new_listings BOOLEAN DEFAULT true,
    alert_price_drops BOOLEAN DEFAULT true,
    new_matches_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'NEW_MATCH' CHECK (type IN ('NEW_MATCH', 'PRICE_DROP', 'TOUR_REQUEST', 'MESSAGE', 'SYSTEM')),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    saved_search_id UUID REFERENCES public.saved_searches(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for saved_searches
DROP POLICY IF EXISTS "Users can manage own saved searches" ON public.saved_searches;
CREATE POLICY "Users can manage own saved searches" 
ON public.saved_searches FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 5. RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role and system can insert notifications" ON public.notifications;
CREATE POLICY "Service role and system can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- 6. Indexes for queries & performance
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active_alerts ON public.saved_searches(alert_new_listings, alert_price_drops);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_property ON public.notifications(property_id);
CREATE INDEX IF NOT EXISTS idx_notifications_saved_search ON public.notifications(saved_search_id);

-- 7. Realtime Replication for saved_searches and notifications
ALTER TABLE public.saved_searches REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$ 
BEGIN 
  BEGIN 
    ALTER PUBLICATION supabase_realtime ADD TABLE public.saved_searches; 
  EXCEPTION 
    WHEN duplicate_object THEN NULL; 
  END; 
  BEGIN 
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; 
  EXCEPTION 
    WHEN duplicate_object THEN NULL; 
  END; 
END $$;
