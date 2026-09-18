import { supabase } from './client';
import { SearchRegion } from './database.types';

/**
 * Fetch all active search regions for discovery and map usage
 */
export async function getActiveSearchRegions(): Promise<SearchRegion[]> {
  try {
    const { data, error } = await supabase
      .from('search_regions')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching active search regions:', error);
      return [];
    }

    return (data as SearchRegion[]) || [];
  } catch (err) {
    console.error('Unexpected error fetching search regions:', err);
    return [];
  }
}

/**
 * Fetch all search regions (active and inactive) for admin management
 */
export async function getAllSearchRegions(): Promise<SearchRegion[]> {
  try {
    const { data, error } = await supabase
      .from('search_regions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all search regions:', error);
      return [];
    }

    return (data as SearchRegion[]) || [];
  } catch (err) {
    console.error('Unexpected error in getAllSearchRegions:', err);
    return [];
  }
}

/**
 * Fetch single region by slug
 */
export async function getSearchRegionBySlug(slug: string): Promise<SearchRegion | null> {
  try {
    const { data, error } = await supabase
      .from('search_regions')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      console.error(`Error fetching search region by slug (${slug}):`, error);
      return null;
    }

    return data as SearchRegion;
  } catch (err) {
    console.error('Unexpected error in getSearchRegionBySlug:', err);
    return null;
  }
}

/**
 * Create a new search region (Admin only)
 */
export async function createSearchRegion(
  region: Omit<SearchRegion, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: SearchRegion; error?: any }> {
  try {
    const { data, error } = await supabase
      .from('search_regions')
      .insert({
        ...region,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating search region:', error);
      return { success: false, error };
    }

    return { success: true, data: data as SearchRegion };
  } catch (err) {
    console.error('Unexpected error creating search region:', err);
    return { success: false, error: err };
  }
}

/**
 * Update an existing search region (Admin only)
 */
export async function updateSearchRegion(
  id: string,
  updates: Partial<Omit<SearchRegion, 'id' | 'created_at'>>
): Promise<{ success: boolean; data?: SearchRegion; error?: any }> {
  try {
    const { data, error } = await supabase
      .from('search_regions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating search region (${id}):`, error);
      return { success: false, error };
    }

    return { success: true, data: data as SearchRegion };
  } catch (err) {
    console.error(`Unexpected error updating search region (${id}):`, err);
    return { success: false, error: err };
  }
}

/**
 * Delete a search region (Admin only)
 */
export async function deleteSearchRegion(
  id: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const { error } = await supabase
      .from('search_regions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting search region (${id}):`, error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error(`Unexpected error deleting search region (${id}):`, err);
    return { success: false, error: err };
  }
}

/**
 * Toggle region active status
 */
export async function toggleSearchRegionActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: any }> {
  return updateSearchRegion(id, { is_active: isActive });
}
