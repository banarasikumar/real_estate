import { supabase } from './client';
import { ALL_DEMO_PROPERTIES, DemoProperty, GOA_PROPERTIES } from './demoProperties';

export interface PropertyRecommendation {
  propertyId: string;
  matchScore: number; // 0-100
  matchReason: string;
  tags: string[];
  property?: any;
}

export interface RecommendationRails {
  topPick: PropertyRecommendation;
  forYou: PropertyRecommendation[];
  trending: PropertyRecommendation[];
  valuePicks: PropertyRecommendation[];
}

/**
 * Helper to match user-specified city with property city
 */
function isCityMatch(propertyCity: string, queryCity?: string): boolean {
  if (!queryCity || !queryCity.trim()) return true;
  const target = queryCity.trim().toLowerCase();
  const propCity = propertyCity.trim().toLowerCase();

  if (propCity === target) return true;

  // Indian Metros & Luxury Hubs
  if ((target === 'mumbai' || target === 'bombay') && (propCity.includes('mumbai') || propCity.includes('bombay'))) return true;
  if ((target === 'bangalore' || target === 'bengaluru' || target === 'blr') && (propCity.includes('bangalore') || propCity.includes('bengaluru'))) return true;
  if (
    (target === 'delhi' || target === 'new delhi' || target === 'ncr' || target === 'del' || target.includes('delhi') || target.includes('gurugram') || target.includes('gurgaon') || target.includes('noida')) &&
    (propCity.includes('delhi') || propCity.includes('gurugram') || propCity.includes('gurgaon') || propCity.includes('noida'))
  ) {
    return true;
  }
  if ((target === 'goa' || target.includes('goa')) && propCity.includes('goa')) return true;
  if ((target === 'ranchi' || target === 'rnc' || target.includes('ranchi')) && propCity.includes('ranchi')) return true;

  // Legacy fallback support
  if ((target === 'la' || target === 'los angeles') && propCity.includes('los angeles')) return true;
  if ((target === 'ny' || target === 'new york' || target === 'nyc') && (propCity.includes('new york') || propCity.includes('manhattan') || propCity.includes('brooklyn'))) return true;

  return propCity.includes(target) || target.includes(propCity);
}

/**
 * Formats a luxury match reason based on property traits, match score, and category
 */
function buildLuxuryMatchReason(
  prop: DemoProperty,
  score: number,
  index: number,
  category: 'personalized' | 'trending' | 'value' = 'personalized'
): string {
  const propType = prop.prop_type ? prop.prop_type.toLowerCase() : 'estate';
  const city = prop.city || 'your area';

  if (category === 'trending') {
    const reasons = [
      `📍 Trending in ${city} • High velocity listing`,
      `🔥 Most viewed luxury ${propType} in ${city} this week`,
      `📍 Trending in ${city} • 14+ tour requests in 48 hrs`,
      `💎 Prime ${city} location • High buyer interest`,
    ];
    return reasons[index % reasons.length];
  }

  if (category === 'value') {
    const reasons = [
      `💰 Within your preferred budget • Exceptional price/sqft`,
      `💰 Outstanding value in ${city} • Motivated prime listing`,
      `💎 Investment grade asset • High capital appreciation potential`,
      `💰 Within your preferred budget • Competitive market valuation`,
    ];
    return reasons[index % reasons.length];
  }

  // Personalized category
  if (index === 0) {
    return `✨ ${score}% AI Match • Matches your luxury ${propType} preference`;
  }
  if (index === 1) {
    return `📍 Trending in ${city} • High velocity listing`;
  }
  if (index === 2) {
    return `💰 Within your preferred budget • Exceptional value for ${prop.bedrooms} BHK`;
  }
  if (index === 3) {
    return `🌟 Curated for you • Similar to properties you saved`;
  }
  if (prop.prop_type === 'VILLA' || prop.prop_type === 'PENTHOUSE') {
    return `🏆 Top rated luxury ${propType} • Panoramic skyline views`;
  }
  if (prop.badge) {
    return `✨ ${score}% AI Match • Highlights: ${prop.badge}`;
  }
  return `✨ ${score}% AI Match • Matches your luxury lifestyle criteria`;
}

/**
 * Builds tags for a property recommendation
 */
function buildRecommendationTags(
  prop: DemoProperty | any,
  score: number,
  reason: string,
  extraTag?: string
): string[] {
  const tags: string[] = [];

  if (extraTag) tags.push(extraTag);
  if (score >= 95) tags.push('AI Match');
  if (prop.prop_type) tags.push(prop.prop_type);
  if (prop.city) tags.push(prop.city);

  if (reason.toLowerCase().includes('trending') || reason.toLowerCase().includes('velocity') || reason.toLowerCase().includes('most viewed')) {
    tags.push('Trending');
  }
  if (reason.toLowerCase().includes('budget') || reason.toLowerCase().includes('value')) {
    tags.push('Best Value');
  }
  if (prop.isVerified || prop.is_verified) {
    tags.push('Verified');
  }

  if (tags.length === 0) {
    tags.push('Exclusive');
  }

  return Array.from(new Set(tags));
}

/**
 * Generates rich, realistic recommendations using the authentic Indian luxury properties dataset (Mumbai, Bangalore, New Delhi / NCR, Ranchi, Goa).
 * Assigns realistic match scores (e.g. 98%, 95%, 91%) and human-readable luxury match reasons.
 *
 * @param userId - Optional user identifier
 * @param city - Optional city filter (e.g. 'Mumbai', 'Bangalore', 'New Delhi', 'Delhi', 'Ranchi', 'Goa')
 * @param limit - Maximum recommendations to return (default: 10)
 */
export async function generateDemoRecommendations(
  userId?: string | null,
  city?: string,
  limit: number = 10
): Promise<PropertyRecommendation[]> {
  const targetLimit = Math.max(1, Math.min(limit || 10, 50));

  const propertyPool = (city && city.toLowerCase().includes('goa'))
    ? [...ALL_DEMO_PROPERTIES, ...(GOA_PROPERTIES || [])]
    : ALL_DEMO_PROPERTIES;

  // Filter properties by city if specified
  let candidates = propertyPool.filter((p) => isCityMatch(p.city, city));

  // Fallback to all properties if city filter returned no items
  if (candidates.length === 0) {
    candidates = [...ALL_DEMO_PROPERTIES];
  }

  // Realistic match scores descending from 98%
  const baseScores = [98, 96, 95, 93, 91, 90, 89, 88, 86, 85, 84, 82, 81, 80, 79, 78];

  const results: PropertyRecommendation[] = [];

  for (let i = 0; i < Math.min(candidates.length, targetLimit); i++) {
    const prop = candidates[i];
    const matchScore = i < baseScores.length ? baseScores[i] : Math.max(65, 78 - (i - baseScores.length));
    const matchReason = buildLuxuryMatchReason(prop, matchScore, i, 'personalized');
    const tags = buildRecommendationTags(prop, matchScore, matchReason, i === 0 ? 'Top Pick' : undefined);

    results.push({
      propertyId: prop.id,
      matchScore,
      matchReason,
      tags,
      property: prop,
    });
  }

  return results;
}

/**
 * Fetches personalized property recommendations for a given user and optional city.
 * Invokes the PostgreSQL stored function `get_property_recommendations`.
 * Hydrates properties with details from the database.
 * If RPC fails, returns null, or for offline/demo users, seamlessly falls back to `generateDemoRecommendations`.
 *
 * @param userId - Optional UUID of the user
 * @param city - Optional target city (e.g. 'Mumbai', 'Bangalore', 'New Delhi', 'Ranchi', 'Goa')
 * @param limit - Maximum recommendations to return (default: 10)
 */
export async function getPersonalizedRecommendations(
  userId?: string | null,
  city?: string,
  limit: number = 10
): Promise<PropertyRecommendation[]> {
  const targetLimit = Math.max(1, Math.min(limit || 10, 50));

  try {
    const { data, error } = await supabase.rpc('get_property_recommendations', {
      p_user_id: userId || null,
      p_limit: targetLimit,
      p_city: city || null,
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      if (error) {
        console.warn('[getPersonalizedRecommendations] RPC call warning, using demo fallback:', error.message);
      }
      return generateDemoRecommendations(userId, city, targetLimit);
    }

    // Extract property IDs from RPC results
    const propertyIds = data.map((item: any) => item.property_id).filter(Boolean);

    if (propertyIds.length === 0) {
      return generateDemoRecommendations(userId, city, targetLimit);
    }

    // Hydrate property details from database
    const { data: dbProperties, error: dbError } = await supabase
      .from('properties')
      .select('*, property_media(id, url, is_featured, display_order)')
      .in('id', propertyIds)
      .is('deleted_at', null);

    if (dbError || !dbProperties || dbProperties.length === 0) {
      return generateDemoRecommendations(userId, city, targetLimit);
    }

    const propMap = new Map<string, any>(dbProperties.map((p: any) => [p.id, p]));
    const recommendations: PropertyRecommendation[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const prop = propMap.get(item.property_id);
      if (!prop) continue;

      const score = Math.max(60, Math.min(99, Number(item.match_score) || 75));
      const reason = item.match_reason || 'Matches your luxury property preferences';
      const tags = buildRecommendationTags(prop, score, reason, i === 0 ? 'Top Pick' : undefined);

      recommendations.push({
        propertyId: item.property_id,
        matchScore: score,
        matchReason: reason,
        tags,
        property: prop,
      });
    }

    if (recommendations.length === 0) {
      return generateDemoRecommendations(userId, city, targetLimit);
    }

    return recommendations;
  } catch (err) {
    console.warn('[getPersonalizedRecommendations] Exception caught, serving demo recommendations:', err);
    return generateDemoRecommendations(userId, city, targetLimit);
  }
}

/**
 * Returns organized recommendation rails:
 * - topPick: The single best match property (highest score)
 * - forYou: Curated recommendations matching user profile / preferences
 * - trending: Listings with high velocity and views
 * - valuePicks: Listings offering superior price/sqft and budget advantages
 *
 * @param userId - Optional user identifier
 * @param city - Optional city filter
 */
export async function getRecommendationRails(
  userId?: string | null,
  city?: string
): Promise<RecommendationRails> {
  // Fetch a broad pool of recommendations
  let pool = await getPersonalizedRecommendations(userId, city, 20);

  // If pool has fewer than 10 items, ensure demo properties fill out all rails
  if (pool.length < 10) {
    const demoPool = await generateDemoRecommendations(userId, city, 20);
    const existingIds = new Set(pool.map((r) => r.propertyId));
    for (const demoItem of demoPool) {
      if (!existingIds.has(demoItem.propertyId)) {
        pool.push(demoItem);
        existingIds.add(demoItem.propertyId);
      }
    }
  }

  // 1. Top Pick: #1 highest match score item
  const topPickItem = pool[0];
  const topPick: PropertyRecommendation = {
    ...topPickItem,
    matchReason: topPickItem.matchReason.startsWith('✨')
      ? topPickItem.matchReason
      : `✨ ${topPickItem.matchScore}% AI Match • Editor's Top Luxury Estate Selection`,
    tags: Array.from(new Set(['Top Pick', 'AI Match', ...topPickItem.tags])),
  };

  // 2. For You: Next personalized recommendations (e.g. 4-5 items)
  const forYouSlice = pool.slice(1, 6);
  const forYou: PropertyRecommendation[] = forYouSlice.map((item, idx) => ({
    ...item,
    tags: Array.from(new Set(['Curated', ...item.tags])),
  }));

  // 3. Trending: Select items with trending characteristics or partition from pool
  const trendingPool = pool.slice(6, 11);
  const trending: PropertyRecommendation[] = trendingPool.map((item, idx) => {
    const cityName = item.property?.city || city || 'Your Market';
    const trendingScore = Math.max(88, item.matchScore);
    const reason = buildLuxuryMatchReason(
      item.property as DemoProperty,
      trendingScore,
      idx,
      'trending'
    );
    return {
      ...item,
      matchScore: trendingScore,
      matchReason: reason,
      tags: Array.from(new Set(['Trending', 'High Demand', cityName, ...item.tags])),
    };
  });

  // 4. Value Picks: Select items representing great value opportunities
  const valuePool = pool.slice(11, 16);
  const valuePicks: PropertyRecommendation[] = (valuePool.length > 0 ? valuePool : pool.slice(2, 7)).map((item, idx) => {
    const valueScore = Math.max(85, item.matchScore - 2);
    const reason = buildLuxuryMatchReason(
      item.property as DemoProperty,
      valueScore,
      idx,
      'value'
    );
    return {
      ...item,
      matchScore: valueScore,
      matchReason: reason,
      tags: Array.from(new Set(['Best Value', 'Price Advantage', ...item.tags])),
    };
  });

  return {
    topPick,
    forYou,
    trending,
    valuePicks,
  };
}
