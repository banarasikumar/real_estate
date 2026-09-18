import { supabase } from './client';
import type { SavedSearch } from './database.types';

/**
 * Normalizes a raw Supabase saved_searches row into a full SavedSearch object
 * with backwards-compatible aliases for legacy UI store components.
 */
const formatSavedSearch = (row: any): SavedSearch => {
  if (!row) return row;
  return {
    ...row,
    user_id: row.user_id,
    userId: row.user_id,
    name: row.name,
    search_query: row.search_query ?? row.query ?? null,
    query: row.search_query ?? row.query ?? null,
    region_id: row.region_id ?? null,
    filters: row.filters || {},
    boundary: row.boundary ?? row.polygon ?? null,
    polygon: row.boundary ?? row.polygon ?? null,
    notification_frequency: row.notification_frequency ?? row.notificationFrequency ?? 'INSTANT',
    notificationFrequency: row.notification_frequency ?? row.notificationFrequency ?? 'INSTANT',
    alert_new_listings: row.alert_new_listings ?? row.alert_new_matches ?? true,
    alert_new_matches: row.alert_new_listings ?? row.alert_new_matches ?? true,
    alert_price_drops: row.alert_price_drops ?? row.alert_price_drop ?? true,
    alert_price_drop: row.alert_price_drops ?? row.alert_price_drop ?? true,
    new_matches_count: row.new_matches_count ?? row.match_count ?? 0,
    match_count: row.new_matches_count ?? row.match_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

/**
 * Creates a new saved search in Supabase.
 *
 * @param search - Partial saved search object to insert
 * @returns Object containing the created SavedSearch record or error
 */
export const createSavedSearch = async (
  search: Partial<SavedSearch>
): Promise<{ data: SavedSearch | null; error: any }> => {
  try {
    const payload: Record<string, any> = {
      name: search.name,
      user_id: search.user_id || search.userId,
      search_query: search.search_query ?? search.query ?? null,
      region_id: search.region_id ?? null,
      filters: search.filters || {},
      boundary: search.boundary ?? search.polygon ?? null,
      notification_frequency: search.notification_frequency ?? search.notificationFrequency ?? 'INSTANT',
      alert_new_listings: search.alert_new_listings ?? search.alert_new_matches ?? true,
      alert_price_drops: search.alert_price_drops ?? search.alert_price_drop ?? true,
      new_matches_count: search.new_matches_count ?? search.match_count ?? 0,
    };

    if (search.id && !search.id.startsWith('saved_') && !search.id.startsWith('search_')) {
      payload.id = search.id;
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creating saved search in database:', error);
      return { data: null, error };
    }

    return { data: formatSavedSearch(data), error: null };
  } catch (err: any) {
    console.error('Unexpected error in createSavedSearch:', err);
    return { data: null, error: err };
  }
};

/**
 * Retrieves all saved searches for a given user ordered by creation date descending.
 *
 * @param userId - ID of the user whose saved searches to fetch
 * @returns Array of SavedSearch items
 */
export const getSavedSearches = async (userId: string): Promise<SavedSearch[]> => {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved searches:', error);
      return [];
    }

    return (data || []).map(formatSavedSearch);
  } catch (err) {
    console.error('Unexpected error in getSavedSearches:', err);
    return [];
  }
};

/**
 * Retrieves a single saved search by its unique ID.
 *
 * @param id - UUID of the saved search
 * @returns SavedSearch or null
 */
export const getSavedSearchById = async (id: string): Promise<SavedSearch | null> => {
  if (!id) return null;

  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching saved search by id:', error);
      return null;
    }

    return data ? formatSavedSearch(data) : null;
  } catch (err) {
    console.error('Unexpected error in getSavedSearchById:', err);
    return null;
  }
};

/**
 * Updates an existing saved search by ID.
 *
 * @param id - UUID of the saved search to update
 * @param updates - Partial saved search properties to update
 * @param userId - Optional user ID check
 * @returns Object containing the updated SavedSearch record or error
 */
export const updateSavedSearch = async (
  id: string,
  updates: Partial<SavedSearch>,
  userId?: string | null
): Promise<{ data: SavedSearch | null; error: any }> => {
  if (!id) {
    return { data: null, error: 'Saved search ID is required' };
  }

  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.search_query !== undefined || updates.query !== undefined) {
      payload.search_query = updates.search_query ?? updates.query;
    }
    if (updates.region_id !== undefined) payload.region_id = updates.region_id;
    if (updates.filters !== undefined) payload.filters = updates.filters;
    if (updates.boundary !== undefined || updates.polygon !== undefined) {
      payload.boundary = updates.boundary ?? updates.polygon;
    }
    if (updates.notification_frequency !== undefined || updates.notificationFrequency !== undefined) {
      payload.notification_frequency = updates.notification_frequency ?? updates.notificationFrequency;
    }
    if (updates.alert_new_listings !== undefined || updates.alert_new_matches !== undefined) {
      payload.alert_new_listings = updates.alert_new_listings ?? updates.alert_new_matches;
    }
    if (updates.alert_price_drops !== undefined || updates.alert_price_drop !== undefined) {
      payload.alert_price_drops = updates.alert_price_drops ?? updates.alert_price_drop;
    }
    if (updates.new_matches_count !== undefined || updates.match_count !== undefined) {
      payload.new_matches_count = updates.new_matches_count ?? updates.match_count;
    }

    let query = supabase.from('saved_searches').update(payload).eq('id', id);
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      console.error('Error updating saved search:', error);
      return { data: null, error };
    }

    return { data: formatSavedSearch(data), error: null };
  } catch (err: any) {
    console.error('Unexpected error in updateSavedSearch:', err);
    return { data: null, error: err };
  }
};

/**
 * Deletes a saved search by ID.
 *
 * @param id - UUID of the saved search to delete
 * @param userId - Optional user ID check
 * @returns Object indicating success and any error encountered
 */
export const deleteSavedSearch = async (
  id: string,
  userId?: string | null
): Promise<{ success: boolean; error: any }> => {
  if (!id) {
    return { success: false, error: 'Saved search ID is required' };
  }

  try {
    let query = supabase.from('saved_searches').delete().eq('id', id);
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting saved search:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Unexpected error in deleteSavedSearch:', err);
    return { success: false, error: err };
  }
};

/**
 * Subscribes to realtime updates for a user's saved searches.
 *
 * @param userId - ID of the user
 * @param onUpdate - Callback invoked when a saved search is inserted, updated, or deleted
 * @returns Unsubscribe cleanup function
 */
export const subscribeToSavedSearches = (
  userId: string,
  onUpdate: (payload: any) => void
): (() => void) => {
  const channelName = `saved-searches-${userId}-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'saved_searches',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
