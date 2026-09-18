// Supabase Edge Function: match-saved-searches
// Evaluates newly inserted or price-reduced properties against active saved searches,
// records notifications in the database, and sends Expo push notifications to users.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyRecord {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  prop_type: string;
  list_type: string;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnishing: string | null;
  address: string | null;
  city?: string | null;
  state?: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  is_approved?: boolean | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface SavedSearchRecord {
  id: string;
  user_id: string;
  name: string;
  search_query?: string | null;
  region_id?: string | null;
  filters?: Record<string, any> | null;
  boundary?: any | null;
  notification_frequency?: string;
  alert_new_listings?: boolean;
  alert_price_drops?: boolean;
  new_matches_count?: number;
}

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | string;
  record: PropertyRecord;
  old_record?: PropertyRecord;
  table?: string;
  schema?: string;
}

/**
 * Normalizes various boundary formats (GeoJSON, array of {latitude, longitude},
 * array of [lng, lat] coordinate tuples) into an array of polygon rings.
 */
function extractPolygonRings(boundary: any): Array<Array<[number, number]>> {
  if (!boundary) return [];

  // GeoJSON FeatureCollection
  if (boundary.type === 'FeatureCollection' && Array.isArray(boundary.features)) {
    return boundary.features.flatMap((f: any) => extractPolygonRings(f.geometry || f));
  }

  // GeoJSON Feature
  if (boundary.type === 'Feature' && boundary.geometry) {
    return extractPolygonRings(boundary.geometry);
  }

  // GeoJSON Polygon coordinates: number[][][] (array of rings)
  if (boundary.type === 'Polygon' && Array.isArray(boundary.coordinates)) {
    return boundary.coordinates;
  }

  // GeoJSON MultiPolygon coordinates: number[][][][]
  if (boundary.type === 'MultiPolygon' && Array.isArray(boundary.coordinates)) {
    return boundary.coordinates.flat(1);
  }

  if (Array.isArray(boundary)) {
    if (boundary.length === 0) return [];

    // Format: [ [ [lng, lat], ... ] ]
    if (Array.isArray(boundary[0]) && Array.isArray(boundary[0][0])) {
      return boundary as Array<Array<[number, number]>>;
    }

    // Format: [ [lng, lat], [lng, lat], ... ]
    if (Array.isArray(boundary[0]) && typeof boundary[0][0] === 'number') {
      return [boundary as Array<[number, number]>];
    }

    // Format: [ { latitude, longitude }, ... ] or [ { lat, lng }, ... ]
    if (typeof boundary[0] === 'object' && boundary[0] !== null) {
      const ring: Array<[number, number]> = boundary
        .map((pt: any) => {
          const lat = Number(pt.latitude ?? pt.lat);
          const lng = Number(pt.longitude ?? pt.lng);
          return [lng, lat] as [number, number];
        })
        .filter((pt: [number, number]) => !isNaN(pt[0]) && !isNaN(pt[1]));
      return ring.length >= 3 ? [ring] : [];
    }
  }

  return [];
}

/**
 * Point-in-polygon test using ray-casting algorithm (Jordan Curve Theorem).
 * Determines if point (lng, lat) is within a closed polygon ring.
 */
function isPointInRing(lng: number, lat: number, ring: Array<[number, number]>): boolean {
  if (!ring || ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Tests whether a coordinate (lng, lat) is enclosed by any ring in the boundary.
 */
function isPointInBoundary(lng: number, lat: number, boundary: any): boolean {
  const rings = extractPolygonRings(boundary);
  if (rings.length === 0) return true; // No boundary restriction

  for (const ring of rings) {
    if (isPointInRing(lng, lat, ring)) {
      return true;
    }
  }
  return false;
}

/**
 * Validates a property against a saved search's criteria (price, beds, baths, prop_type, list_type, boundary, query).
 */
function matchesSearch(record: PropertyRecord, search: SavedSearchRecord): boolean {
  // Only published active listings match
  if (record.status !== 'PUBLISHED' || record.deleted_at) {
    return false;
  }

  const filters = search.filters || {};
  const price = Number(record.price);
  if (isNaN(price)) return false;

  // 1. Price boundaries
  const minPrice = filters.minPrice ?? filters.min_price;
  if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
    if (price < Number(minPrice)) return false;
  }

  const maxPrice = filters.maxPrice ?? filters.max_price;
  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    if (price > Number(maxPrice)) return false;
  }

  // Handle priceRange preset strings
  if (filters.priceRange) {
    const range = String(filters.priceRange).toLowerCase();
    if (range === 'under_1cr' && price > 10000000) return false;
    if (range === '1cr_3cr' && (price < 10000000 || price > 30000000)) return false;
    if (range === 'above_3cr' && price < 30000000) return false;
    if (range === 'under_1m' && price > 1000000) return false;
    if (range === '1m_5m' && (price < 1000000 || price > 5000000)) return false;
    if (range === 'above_5m' && price < 5000000) return false;
  }

  // 2. Bedrooms criteria
  const bedrooms = filters.bedrooms ?? filters.minBedrooms ?? filters.min_bedrooms;
  if (bedrooms !== undefined && bedrooms !== null && bedrooms !== '' && bedrooms !== 'any') {
    const minBeds = Number(bedrooms);
    if (!isNaN(minBeds) && minBeds > 0) {
      if ((record.bedrooms ?? 0) < minBeds) return false;
    }
  }

  // 3. Bathrooms criteria
  const bathrooms = filters.bathrooms ?? filters.minBathrooms ?? filters.min_bathrooms;
  if (bathrooms !== undefined && bathrooms !== null && bathrooms !== '' && bathrooms !== 'any') {
    const minBaths = Number(bathrooms);
    if (!isNaN(minBaths) && minBaths > 0) {
      if ((record.bathrooms ?? 0) < minBaths) return false;
    }
  }

  // 4. Property Type
  const propType = filters.propType ?? filters.prop_type;
  if (propType && propType !== 'ALL' && propType !== 'all' && propType !== 'any') {
    if (String(propType).toUpperCase() !== String(record.prop_type).toUpperCase()) {
      return false;
    }
  }

  // 5. Listing Type (SALE / RENT)
  const listType = filters.listType ?? filters.list_type;
  if (listType && listType !== 'ALL' && listType !== 'all' && listType !== 'any') {
    if (String(listType).toUpperCase() !== String(record.list_type).toUpperCase()) {
      return false;
    }
  }

  // 6. Search Query keyword check
  const rawQuery = search.search_query ?? (search as any).query;
  if (rawQuery && typeof rawQuery === 'string' && rawQuery.trim().length > 0) {
    const cleanTokens = rawQuery
      .toLowerCase()
      .replace(/homes|properties|luxury|estates|custom drawn boundary area/gi, '')
      .trim()
      .split(/\s+/)
      .filter((t: string) => t.length > 2);

    if (cleanTokens.length > 0) {
      const combined = `${record.title || ''} ${record.description || ''} ${record.address || ''} ${record.city || ''} ${record.state || ''}`.toLowerCase();
      const matchedAny = cleanTokens.some((tok: string) => combined.includes(tok));
      if (!matchedAny) return false;
    }
  }

  // 7. Region ID check
  if (search.region_id && typeof search.region_id === 'string' && search.region_id.trim().length > 0) {
    const regionId = search.region_id.trim().toLowerCase();
    const normalized = regionId.replace(/[-_]/g, ' ');
    const locationText = `${record.city || ''} ${record.state || ''} ${record.address || ''}`.toLowerCase();
    if (!locationText.includes(normalized) && !locationText.includes(regionId)) {
      if (!search.boundary && !(search as any).polygon) {
        return false;
      }
    }
  }

  // 8. Spatial boundary check (point-in-polygon)
  const boundary = search.boundary ?? (search as any).polygon;
  if (boundary) {
    const propLat = Number(record.latitude);
    const propLng = Number(record.longitude);
    if (isNaN(propLat) || isNaN(propLng)) {
      return false; // Cannot match geographic boundary without coordinates
    }

    if (!isPointInBoundary(propLng, propLat, boundary)) {
      return false;
    }
  }

  return true;
}

/**
 * Dispatches an Expo push notification.
 */
async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, any>
): Promise<boolean> {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data,
        sound: 'default',
        priority: 'high',
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[sendExpoPush] Network error sending notification:', err);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      Deno.env.get('SUPABASE_ANON_KEY') ||
      '';

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: WebhookPayload = await req.json();
    const { type, record, old_record } = payload;

    if (!record || !record.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: missing property record' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine event classification
    const isNewListing =
      type === 'INSERT' ||
      (type === 'UPDATE' && old_record && old_record.status !== 'PUBLISHED' && record.status === 'PUBLISHED');

    const isPriceDrop =
      type === 'UPDATE' &&
      old_record &&
      typeof old_record.price === 'number' &&
      typeof record.price === 'number' &&
      record.price < old_record.price;

    if (!isNewListing && !isPriceDrop) {
      return new Response(
        JSON.stringify({
          message: 'No notification action required (not a new listing or price reduction)',
          type,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for relevant saved searches
    let query = supabase
      .from('saved_searches')
      .select('*')
      .neq('notification_frequency', 'NEVER');

    if (isNewListing && !isPriceDrop) {
      query = query.eq('alert_new_listings', true);
    } else if (isPriceDrop && !isNewListing) {
      query = query.eq('alert_price_drops', true);
    } else {
      query = query.or('alert_new_listings.eq.true,alert_price_drops.eq.true');
    }

    const { data: savedSearches, error: searchError } = await query;

    if (searchError) {
      console.error('[match-saved-searches] Error fetching saved searches:', searchError);
      return new Response(
        JSON.stringify({ error: searchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!savedSearches || savedSearches.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active saved searches found', matched: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter to matches, excluding the owner's own saved searches
    const matches = (savedSearches as SavedSearchRecord[]).filter((search) => {
      if (search.user_id === record.owner_id) {
        return false;
      }
      return matchesSearch(record, search);
    });

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No saved searches matched criteria', matched: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user push tokens
    const userIds = [...new Set(matches.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, push_token')
      .in('id', userIds);

    const tokenMap = new Map<string, string | null>();
    profiles?.forEach((p: { id: string; push_token?: string | null }) => {
      if (p.push_token) tokenMap.set(p.id, p.push_token);
    });

    const notifType = isPriceDrop ? 'PRICE_DROP' : 'NEW_MATCH';
    const formattedPrice =
      typeof record.price === 'number'
        ? `$${record.price.toLocaleString()}`
        : String(record.price);

    let notificationsCreated = 0;
    let pushesSent = 0;

    for (const search of matches) {
      const title = isPriceDrop
        ? `Price Drop: ${record.title}`
        : `New Listing: ${record.title}`;

      const body = isPriceDrop
        ? `Price dropped from $${old_record?.price?.toLocaleString()} to ${formattedPrice} for "${record.title}".`
        : `A new property matching "${search.name}" was just listed for ${formattedPrice}.`;

      // 1. Insert database notification
      const { error: insertErr } = await supabase.from('notifications').insert({
        user_id: search.user_id,
        title,
        body,
        type: notifType,
        property_id: record.id,
        saved_search_id: search.id,
        is_read: false,
        data: {
          property_id: record.id,
          saved_search_id: search.id,
          price: record.price,
          old_price: old_record?.price,
          search_name: search.name,
          list_type: record.list_type,
          prop_type: record.prop_type,
        },
      });

      if (!insertErr) {
        notificationsCreated++;

        // 2. Increment match count
        await supabase
          .from('saved_searches')
          .update({
            new_matches_count: (search.new_matches_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', search.id);
      } else {
        console.error('[match-saved-searches] Notification insert error:', insertErr);
      }

      // 3. Send Expo push notification if token available
      const pushToken = tokenMap.get(search.user_id);
      if (pushToken) {
        const sent = await sendExpoPush(pushToken, title, body, {
          propertyId: record.id,
          savedSearchId: search.id,
          type: notifType,
        });
        if (sent) pushesSent++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        matched: matches.length,
        notifications_created: notificationsCreated,
        pushes_sent: pushesSent,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[match-saved-searches] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

// Start Deno HTTP server
// @ts-ignore Deno global namespace
if (typeof Deno !== 'undefined' && typeof (Deno as any).serve === 'function') {
  // @ts-ignore
  (Deno as any).serve(handler);
} else {
  serve(handler);
}
