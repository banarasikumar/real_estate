-- Migration: Property Recommendations Stored Function & Recommender Engine
-- 00000000000013_property_recommendations.sql

-- 1. Helper indexes for fast recommendation queries
CREATE INDEX IF NOT EXISTS idx_properties_status_deleted ON public.properties(status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_properties_city_status ON public.properties(city, status);
CREATE INDEX IF NOT EXISTS idx_properties_prop_type_status ON public.properties(prop_type, status);
CREATE INDEX IF NOT EXISTS idx_properties_price_status ON public.properties(price, status);
CREATE INDEX IF NOT EXISTS idx_property_views_prop_viewer ON public.property_views(property_id, viewer_id);
CREATE INDEX IF NOT EXISTS idx_saved_properties_user_prop ON public.saved_properties(user_id, property_id);

-- 2. Stored Function: get_property_recommendations
CREATE OR REPLACE FUNCTION public.get_property_recommendations(
    p_user_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 10,
    p_city TEXT DEFAULT NULL
)
RETURNS TABLE (
    property_id UUID,
    match_score INT,
    match_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_limit INT;
    v_avg_price NUMERIC;
    v_top_property_type TEXT;
    v_top_city TEXT;
    v_interacted_count INT := 0;
    v_max_views NUMERIC := 1.0;
BEGIN
    -- Validate and clamp limit
    v_limit := COALESCE(p_limit, 10);
    IF v_limit <= 0 THEN
        v_limit := 10;
    ELSIF v_limit > 50 THEN
        v_limit := 50;
    END IF;

    -- Calculate max views across all properties for normalization
    SELECT COALESCE(MAX(view_count), 1)
    INTO v_max_views
    FROM (
        SELECT COUNT(*) AS view_count
        FROM public.property_views
        GROUP BY property_id
    ) vc;

    IF v_max_views < 1 THEN
        v_max_views := 1;
    END IF;

    -- Part 1: Implicit User Profile
    -- If p_user_id is provided, aggregate viewed and saved properties
    IF p_user_id IS NOT NULL THEN
        -- Interacted properties count and average price
        SELECT 
            COUNT(inter.property_id),
            AVG(p.price)
        INTO v_interacted_count, v_avg_price
        FROM (
            SELECT pv.property_id FROM public.property_views pv WHERE pv.viewer_id = p_user_id
            UNION
            SELECT sp.property_id FROM public.saved_properties sp WHERE sp.user_id = p_user_id
        ) inter
        JOIN public.properties p ON p.id = inter.property_id
        WHERE p.deleted_at IS NULL;

        -- Most frequently viewed property type
        SELECT p.prop_type::TEXT
        INTO v_top_property_type
        FROM (
            SELECT pv.property_id FROM public.property_views pv WHERE pv.viewer_id = p_user_id
            UNION ALL
            SELECT sp.property_id FROM public.saved_properties sp WHERE sp.user_id = p_user_id
        ) inter
        JOIN public.properties p ON p.id = inter.property_id
        WHERE p.deleted_at IS NULL
        GROUP BY p.prop_type
        ORDER BY COUNT(*) DESC
        LIMIT 1;

        -- Most frequently viewed city
        SELECT p.city
        INTO v_top_city
        FROM (
            SELECT pv.property_id FROM public.property_views pv WHERE pv.viewer_id = p_user_id
            UNION ALL
            SELECT sp.property_id FROM public.saved_properties sp WHERE sp.user_id = p_user_id
        ) inter
        JOIN public.properties p ON p.id = inter.property_id
        WHERE p.deleted_at IS NULL 
          AND p.city IS NOT NULL 
          AND TRIM(p.city) != ''
        GROUP BY p.city
        ORDER BY COUNT(*) DESC
        LIMIT 1;
    END IF;

    -- Part 2, 3, 4: Personalized Scoring or Fallback
    -- If user has no history (null p_user_id, 0 views/saves, or missing price baseline),
    -- execute Fallback to top trending/popular properties
    IF p_user_id IS NULL OR v_interacted_count = 0 OR v_avg_price IS NULL THEN
        RETURN QUERY
        SELECT 
            p.id AS property_id,
            LEAST(99, GREATEST(60, (98 - (ROW_NUMBER() OVER (ORDER BY COUNT(pv.id) DESC, p.created_at DESC) - 1) * 2)))::INT AS match_score,
            CASE 
                WHEN ROW_NUMBER() OVER (ORDER BY COUNT(pv.id) DESC, p.created_at DESC) = 1 THEN 'Top rated luxury estate'
                WHEN p_city IS NOT NULL AND TRIM(p_city) != '' THEN 'Trending in ' || INITCAP(TRIM(p_city))
                WHEN COUNT(pv.id) >= 5 THEN 'High demand luxury listing'
                WHEN p.city IS NOT NULL AND TRIM(p.city) != '' THEN 'Trending in ' || INITCAP(p.city)
                ELSE 'Top rated luxury estate'
            END AS match_reason
        FROM public.properties p
        LEFT JOIN public.property_views pv ON pv.property_id = p.id
        WHERE p.status = 'PUBLISHED'::property_status
          AND p.deleted_at IS NULL
          AND (p_city IS NULL OR TRIM(p_city) = '' OR LOWER(p.city) = LOWER(TRIM(p_city)))
        GROUP BY p.id, p.city, p.created_at
        ORDER BY COUNT(pv.id) DESC, p.created_at DESC
        LIMIT v_limit;
        RETURN;
    END IF;

    -- If user has history: Hybrid Collaborative (40%), Content (40%), Popularity (20%)
    RETURN QUERY
    WITH user_history AS (
        SELECT pv.property_id FROM public.property_views pv WHERE pv.viewer_id = p_user_id
        UNION
        SELECT sp.property_id FROM public.saved_properties sp WHERE sp.user_id = p_user_id
    ),
    -- Part 2: Peer users who viewed properties p_user_id viewed
    peers AS (
        SELECT DISTINCT pv.viewer_id AS peer_id
        FROM public.property_views pv
        WHERE pv.property_id IN (SELECT property_id FROM user_history)
          AND pv.viewer_id IS NOT NULL
          AND pv.viewer_id != p_user_id
    ),
    -- Properties those peer users viewed that p_user_id has NOT yet viewed
    peer_recommendations AS (
        SELECT 
            pv.property_id,
            COUNT(DISTINCT pv.viewer_id) AS peer_view_count
        FROM public.property_views pv
        WHERE pv.viewer_id IN (SELECT peer_id FROM peers)
          AND pv.property_id NOT IN (SELECT property_id FROM user_history)
        GROUP BY pv.property_id
    ),
    max_peer AS (
        SELECT COALESCE(MAX(peer_view_count), 1) AS max_pvc FROM peer_recommendations
    ),
    -- Candidate properties (active, published, not yet viewed by user)
    candidate_properties AS (
        SELECT 
            p.id,
            p.title,
            p.prop_type,
            p.price,
            p.city,
            p.created_at,
            COUNT(pv_all.id) AS total_views,
            COALESCE(pr.peer_view_count, 0) AS peer_views,
            (SELECT max_pvc FROM max_peer) AS max_peer_views
        FROM public.properties p
        LEFT JOIN public.property_views pv_all ON pv_all.property_id = p.id
        LEFT JOIN peer_recommendations pr ON pr.property_id = p.id
        WHERE p.status = 'PUBLISHED'::property_status
          AND p.deleted_at IS NULL
          AND p.id NOT IN (SELECT property_id FROM user_history)
          AND (p_city IS NULL OR TRIM(p_city) = '' OR LOWER(p.city) = LOWER(TRIM(p_city)))
        GROUP BY p.id, p.title, p.prop_type, p.price, p.city, p.created_at, pr.peer_view_count
    ),
    scored_candidates AS (
        SELECT 
            cp.id AS prop_id,
            cp.title,
            cp.prop_type,
            cp.city,
            cp.price,
            -- Part 2: Collaborative Score (0-100)
            CASE 
                WHEN cp.peer_views > 0 THEN 
                    LEAST(100.0, (cp.peer_views::NUMERIC / NULLIF(cp.max_peer_views, 0)) * 100.0)
                ELSE 0.0
            END AS score_collab,
            
            -- Part 3: Content Similarity Score (0-100)
            -- Price match (within 30% gets up to 50 pts, within 15% gets 50 pts)
            (
                CASE 
                    WHEN v_avg_price > 0 AND ABS(cp.price - v_avg_price) / v_avg_price <= 0.15 THEN 50.0
                    WHEN v_avg_price > 0 AND ABS(cp.price - v_avg_price) / v_avg_price <= 0.30 THEN 35.0
                    WHEN v_avg_price > 0 AND ABS(cp.price - v_avg_price) / v_avg_price <= 0.50 THEN 15.0
                    ELSE 0.0
                END
                +
                -- Property type match (30 pts)
                CASE 
                    WHEN v_top_property_type IS NOT NULL AND cp.prop_type::TEXT = v_top_property_type THEN 30.0
                    ELSE 0.0
                END
                +
                -- City match (20 pts)
                CASE 
                    WHEN v_top_city IS NOT NULL AND LOWER(cp.city) = LOWER(v_top_city) THEN 20.0
                    ELSE 0.0
                END
            ) AS score_content,

            -- Part 4: Popularity Score (0-100)
            LEAST(100.0, (cp.total_views::NUMERIC / NULLIF(v_max_views, 0)) * 100.0) AS score_popularity,
            
            -- Price differential pct for reason assignment
            CASE 
                WHEN v_avg_price > 0 THEN ABS(cp.price - v_avg_price) / v_avg_price 
                ELSE 1.0 
            END AS price_diff_ratio
        FROM candidate_properties cp
    ),
    final_scored AS (
        SELECT 
            sc.prop_id,
            -- Combined scoring formula:
            -- If peer interactions exist: 40% Collab, 40% Content, 20% Popularity
            -- If no peer views exist: 70% Content, 30% Popularity
            ROUND(
                60 + (
                    CASE 
                        WHEN sc.score_collab > 0 THEN
                            (sc.score_collab * 0.40) + (sc.score_content * 0.40) + (sc.score_popularity * 0.20)
                        ELSE
                            (sc.score_content * 0.70) + (sc.score_popularity * 0.30)
                    END
                ) * 0.39
            )::INT AS computed_score,
            
            -- Match reason determination
            CASE 
                WHEN sc.score_collab >= 60 THEN 'Similar to properties you saved'
                WHEN sc.price_diff_ratio <= 0.20 AND sc.score_content >= 50 THEN 'Matches your preferred price band'
                WHEN v_top_city IS NOT NULL AND LOWER(sc.city) = LOWER(v_top_city) AND sc.score_popularity >= 35 THEN 'Trending in your favorite city'
                WHEN v_top_property_type IS NOT NULL AND sc.prop_type::TEXT = v_top_property_type THEN 'Matches your ' || INITCAP(sc.prop_type::TEXT) || ' preference'
                WHEN sc.score_popularity >= 50 THEN 'Top rated luxury estate'
                WHEN sc.price_diff_ratio <= 0.30 THEN 'Matches your preferred price band'
                ELSE 'Top rated luxury estate'
            END AS reason_text
        FROM scored_candidates sc
    ),
    ranked_personalized AS (
        SELECT 
            fs.prop_id AS property_id,
            LEAST(99, GREATEST(60, fs.computed_score))::INT AS match_score,
            fs.reason_text AS match_reason
        FROM final_scored fs
        ORDER BY computed_score DESC
        LIMIT v_limit
    ),
    -- Fallback pool in case candidate properties are fewer than v_limit
    popular_fallback AS (
        SELECT 
            p.id AS property_id,
            LEAST(99, GREATEST(60, (90 - (ROW_NUMBER() OVER (ORDER BY COUNT(pv.id) DESC, p.created_at DESC) - 1) * 2)))::INT AS match_score,
            CASE 
                WHEN p_city IS NOT NULL AND TRIM(p_city) != '' THEN 'Trending in ' || INITCAP(TRIM(p_city))
                WHEN COUNT(pv.id) >= 5 THEN 'High demand luxury listing'
                ELSE 'Top rated luxury estate'
            END AS match_reason
        FROM public.properties p
        LEFT JOIN public.property_views pv ON pv.property_id = p.id
        WHERE p.status = 'PUBLISHED'::property_status
          AND p.deleted_at IS NULL
          AND p.id NOT IN (SELECT rp.property_id FROM ranked_personalized rp)
          AND (p_city IS NULL OR TRIM(p_city) = '' OR LOWER(p.city) = LOWER(TRIM(p_city)))
        GROUP BY p.id, p.created_at
        ORDER BY COUNT(pv.id) DESC, p.created_at DESC
    )
    SELECT rp.property_id, rp.match_score, rp.match_reason FROM ranked_personalized rp
    UNION ALL
    SELECT pf.property_id, pf.match_score, pf.match_reason 
    FROM popular_fallback pf
    WHERE (SELECT COUNT(*) FROM ranked_personalized) < v_limit
    LIMIT v_limit;

END;
$$;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_property_recommendations(UUID, INT, TEXT) TO authenticated, anon;
