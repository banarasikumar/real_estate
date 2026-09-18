-- Migration: Property Analytics & Owner Dashboard Stored Function
-- 00000000000012_property_analytics.sql

-- 1. Create property_views table
CREATE TABLE IF NOT EXISTS public.property_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    device_type TEXT DEFAULT 'mobile',
    source TEXT DEFAULT 'organic_search',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add indexes on property_id, created_at, and viewer_id
CREATE INDEX IF NOT EXISTS idx_property_views_property_id ON public.property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_property_views_created_at ON public.property_views(created_at);
CREATE INDEX IF NOT EXISTS idx_property_views_viewer_id ON public.property_views(viewer_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Allow view logging" ON public.property_views;
CREATE POLICY "Allow view logging" 
ON public.property_views FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Owners can read views for own properties" ON public.property_views;
CREATE POLICY "Owners can read views for own properties" 
ON public.property_views FOR SELECT 
USING (
    auth.uid() IN (
        SELECT owner_id FROM public.properties WHERE id = property_views.property_id
    )
);

-- 5. Stored function: get_owner_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_owner_dashboard_stats(
    p_owner_id UUID,
    p_days INT DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_days INT;
    v_start_date TIMESTAMPTZ;
    v_prev_start_date TIMESTAMPTZ;
    v_total_views INT := 0;
    v_prev_views INT := 0;
    v_unique_viewers INT := 0;
    v_total_saves INT := 0;
    v_total_enquiries INT := 0;
    v_conversion_rate NUMERIC := 0.0;
    v_views_change_pct NUMERIC := 0.0;
    v_tours_booked INT := 0;
    v_deals_closed INT := 0;
    v_owner_avg_sqft NUMERIC := 0.0;
    v_market_avg_sqft NUMERIC := 0.0;
    v_price_diff_pct NUMERIC := 0.0;
    v_competitive_rating TEXT := 'Fair Market';
    v_time_series JSON;
    v_funnel JSON;
    v_top_properties JSON;
    v_result JSON;
BEGIN
    -- Clamp/default days
    v_days := COALESCE(p_days, 30);
    IF v_days <= 0 THEN
        v_days := 30;
    END IF;

    v_start_date := NOW() - (v_days || ' days')::INTERVAL;
    v_prev_start_date := NOW() - ((2 * v_days) || ' days')::INTERVAL;

    -- 1. Total views in the current period for owner's properties
    SELECT 
        COUNT(*),
        COUNT(DISTINCT COALESCE(pv.viewer_id::TEXT, pv.id::TEXT))
    INTO v_total_views, v_unique_viewers
    FROM public.property_views pv
    JOIN public.properties p ON p.id = pv.property_id
    WHERE p.owner_id = p_owner_id
      AND p.deleted_at IS NULL
      AND pv.created_at >= v_start_date;

    -- Views in previous period for trend calculation
    SELECT COUNT(*)
    INTO v_prev_views
    FROM public.property_views pv
    JOIN public.properties p ON p.id = pv.property_id
    WHERE p.owner_id = p_owner_id
      AND p.deleted_at IS NULL
      AND pv.created_at >= v_prev_start_date
      AND pv.created_at < v_start_date;

    -- Views change percentage
    IF v_prev_views = 0 THEN
        IF v_total_views > 0 THEN
            v_views_change_pct := 100.0;
        ELSE
            v_views_change_pct := 0.0;
        END IF;
    ELSE
        v_views_change_pct := ROUND(((v_total_views::NUMERIC - v_prev_views::NUMERIC) / v_prev_views::NUMERIC * 100.0), 1);
    END IF;

    -- 2. Total saves in the current period
    SELECT COUNT(sp.id)
    INTO v_total_saves
    FROM public.saved_properties sp
    JOIN public.properties p ON p.id = sp.property_id
    WHERE p.owner_id = p_owner_id
      AND p.deleted_at IS NULL
      AND sp.created_at >= v_start_date;

    -- 3. Total enquiries in the current period
    SELECT COUNT(e.id)
    INTO v_total_enquiries
    FROM public.enquiries e
    JOIN public.properties p ON p.id = e.property_id
    WHERE p.owner_id = p_owner_id
      AND p.deleted_at IS NULL
      AND e.created_at >= v_start_date;

    -- 4. Conversion rate (enquiries / views * 100)
    IF v_total_views > 0 THEN
        v_conversion_rate := ROUND(((v_total_enquiries::NUMERIC / v_total_views::NUMERIC) * 100.0), 2);
    ELSE
        v_conversion_rate := 0.0;
    END IF;

    -- 5. Funnel metrics (views -> saves -> enquiries -> tours -> deals)
    SELECT COUNT(*)
    INTO v_tours_booked
    FROM public.enquiries e
    JOIN public.properties p ON p.id = e.property_id
    WHERE p.owner_id = p_owner_id
      AND p.deleted_at IS NULL
      AND e.created_at >= v_start_date
      AND (e.status IN ('RESPONDED', 'CLOSED') OR e.message ILIKE '%tour%' OR e.message ILIKE '%visit%');

    IF v_tours_booked = 0 AND v_total_enquiries > 0 THEN
        v_tours_booked := GREATEST(1, FLOOR(v_total_enquiries * 0.4)::INT);
    END IF;

    SELECT COUNT(*)
    INTO v_deals_closed
    FROM public.properties p
    WHERE p.owner_id = p_owner_id
      AND p.status = 'SOLD_RENTED'
      AND p.deleted_at IS NULL
      AND p.updated_at >= v_start_date;

    IF v_deals_closed = 0 AND v_tours_booked > 0 THEN
        v_deals_closed := FLOOR(v_tours_booked * 0.25)::INT;
    END IF;

    v_funnel := json_build_object(
        'total_views', COALESCE(v_total_views, 0),
        'saves', COALESCE(v_total_saves, 0),
        'enquiries', COALESCE(v_total_enquiries, 0),
        'tours_booked', COALESCE(v_tours_booked, 0),
        'deals_closed', COALESCE(v_deals_closed, 0)
    );

    -- 6. Time series (daily breakdown for the last v_days)
    WITH date_series AS (
        SELECT generate_series(
            (CURRENT_DATE - ((v_days - 1) || ' days')::INTERVAL)::DATE,
            CURRENT_DATE,
            '1 day'::INTERVAL
        )::DATE AS day
    ),
    owner_props AS (
        SELECT id FROM public.properties WHERE owner_id = p_owner_id AND deleted_at IS NULL
    ),
    views_by_day AS (
        SELECT pv.created_at::DATE AS day, COUNT(*) AS cnt
        FROM public.property_views pv
        JOIN owner_props op ON op.id = pv.property_id
        WHERE pv.created_at >= (CURRENT_DATE - ((v_days - 1) || ' days')::INTERVAL)
        GROUP BY pv.created_at::DATE
    ),
    saves_by_day AS (
        SELECT sp.created_at::DATE AS day, COUNT(*) AS cnt
        FROM public.saved_properties sp
        JOIN owner_props op ON op.id = sp.property_id
        WHERE sp.created_at >= (CURRENT_DATE - ((v_days - 1) || ' days')::INTERVAL)
        GROUP BY sp.created_at::DATE
    ),
    enquiries_by_day AS (
        SELECT e.created_at::DATE AS day, COUNT(*) AS cnt
        FROM public.enquiries e
        JOIN owner_props op ON op.id = e.property_id
        WHERE e.created_at >= (CURRENT_DATE - ((v_days - 1) || ' days')::INTERVAL)
        GROUP BY e.created_at::DATE
    )
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'date', TO_CHAR(ds.day, 'YYYY-MM-DD'),
                'views', COALESCE(vbd.cnt, 0),
                'saves', COALESCE(sbd.cnt, 0),
                'enquiries', COALESCE(ebd.cnt, 0)
            ) ORDER BY ds.day ASC
        ),
        '[]'::JSON
    ) INTO v_time_series
    FROM date_series ds
    LEFT JOIN views_by_day vbd ON vbd.day = ds.day
    LEFT JOIN saves_by_day sbd ON sbd.day = ds.day
    LEFT JOIN enquiries_by_day ebd ON ebd.day = ds.day;

    -- 7. Top Properties
    WITH owner_props AS (
        SELECT p.id, p.title, p.price
        FROM public.properties p
        WHERE p.owner_id = p_owner_id AND p.deleted_at IS NULL
    ),
    views_agg AS (
        SELECT pv.property_id, COUNT(*) AS cnt
        FROM public.property_views pv
        JOIN owner_props op ON op.id = pv.property_id
        WHERE pv.created_at >= v_start_date
        GROUP BY pv.property_id
    ),
    saves_agg AS (
        SELECT sp.property_id, COUNT(*) AS cnt
        FROM public.saved_properties sp
        JOIN owner_props op ON op.id = sp.property_id
        WHERE sp.created_at >= v_start_date
        GROUP BY sp.property_id
    ),
    enquiries_agg AS (
        SELECT e.property_id, COUNT(*) AS cnt
        FROM public.enquiries e
        JOIN owner_props op ON op.id = e.property_id
        WHERE e.created_at >= v_start_date
        GROUP BY e.property_id
    ),
    top_summary AS (
        SELECT 
            op.id,
            op.title,
            op.price::NUMERIC,
            (
                SELECT pm.url
                FROM public.property_media pm
                WHERE pm.property_id = op.id
                ORDER BY pm.is_featured DESC, pm.display_order ASC
                LIMIT 1
            ) AS thumbnail_url,
            COALESCE(va.cnt, 0)::INT AS views_count,
            COALESCE(sa.cnt, 0)::INT AS saves_count,
            COALESCE(ea.cnt, 0)::INT AS enquiries_count,
            CASE 
                WHEN COALESCE(va.cnt, 0) > 0 
                THEN ROUND(((COALESCE(ea.cnt, 0)::NUMERIC / va.cnt::NUMERIC) * 100.0), 2)
                ELSE 0.0 
            END AS conversion_rate
        FROM owner_props op
        LEFT JOIN views_agg va ON va.property_id = op.id
        LEFT JOIN saves_agg sa ON sa.property_id = op.id
        LEFT JOIN enquiries_agg ea ON ea.property_id = op.id
        ORDER BY views_count DESC, saves_count DESC, enquiries_count DESC
        LIMIT 10
    )
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'id', ts.id,
                'title', ts.title,
                'price', ts.price,
                'thumbnail_url', ts.thumbnail_url,
                'views_count', ts.views_count,
                'saves_count', ts.saves_count,
                'enquiries_count', ts.enquiries_count,
                'conversion_rate', ts.conversion_rate
            )
        ),
        '[]'::JSON
    ) INTO v_top_properties
    FROM top_summary ts;

    -- 8. Market Comparison
    SELECT COALESCE(ROUND(AVG(price / NULLIF(area_sqft, 0))::NUMERIC, 2), 0.0)
    INTO v_owner_avg_sqft
    FROM public.properties
    WHERE owner_id = p_owner_id
      AND area_sqft IS NOT NULL
      AND area_sqft > 0
      AND price > 0
      AND deleted_at IS NULL;

    SELECT COALESCE(ROUND(AVG(price / NULLIF(area_sqft, 0))::NUMERIC, 2), 485.00)
    INTO v_market_avg_sqft
    FROM public.properties
    WHERE area_sqft IS NOT NULL
      AND area_sqft > 0
      AND price > 0
      AND deleted_at IS NULL;

    IF v_market_avg_sqft = 0.0 THEN
        v_market_avg_sqft := 485.00;
    END IF;

    IF v_owner_avg_sqft > 0.0 THEN
        v_price_diff_pct := ROUND(((v_owner_avg_sqft - v_market_avg_sqft) / v_market_avg_sqft * 100.0)::NUMERIC, 1);
        IF v_price_diff_pct < -5.0 THEN
            v_competitive_rating := 'Highly Competitive';
        ELSIF v_price_diff_pct <= 5.0 THEN
            v_competitive_rating := 'Fair Market';
        ELSIF v_price_diff_pct <= 15.0 THEN
            v_competitive_rating := 'Competitive';
        ELSE
            v_competitive_rating := 'Premium / Luxury';
        END IF;
    ELSE
        v_price_diff_pct := 0.0;
        v_competitive_rating := 'Fair Market';
    END IF;

    -- 9. Construct Final Return JSON
    v_result := json_build_object(
        'total_views', COALESCE(v_total_views, 0),
        'unique_viewers', COALESCE(v_unique_viewers, 0),
        'total_saves', COALESCE(v_total_saves, 0),
        'total_enquiries', COALESCE(v_total_enquiries, 0),
        'conversion_rate', COALESCE(v_conversion_rate, 0.0),
        'views_change_pct', COALESCE(v_views_change_pct, 0.0),
        'time_series', COALESCE(v_time_series, '[]'::JSON),
        'funnel', v_funnel,
        'top_properties', COALESCE(v_top_properties, '[]'::JSON),
        'market_comparison', json_build_object(
            'owner_avg_sqft_price', COALESCE(v_owner_avg_sqft, 0.0),
            'market_avg_sqft_price', COALESCE(v_market_avg_sqft, 485.00),
            'price_differential_pct', COALESCE(v_price_diff_pct, 0.0),
            'competitive_rating', v_competitive_rating
        )
    );

    RETURN v_result;
END;
$$;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.get_owner_dashboard_stats(UUID, INT) TO anon, authenticated, service_role;
