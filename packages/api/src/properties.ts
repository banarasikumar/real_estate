import { supabase } from './client';
import { Property } from './database.types';

export interface PropertySearchParams {
  query?: string;
  minPrice?: number;
  maxPrice?: number;
  min_price?: number;
  max_price?: number;
  bedrooms?: number | string;
  bathrooms?: number | string;
  propType?: 'APARTMENT' | 'HOUSE' | 'VILLA' | 'COMMERCIAL' | 'ALL' | string;
  prop_type?: string;
  listType?: 'SALE' | 'RENT' | 'ALL' | string;
  list_type?: string;
  status?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'area_desc' | string;
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export const searchProperties = async (params: PropertySearchParams = {}): Promise<Property[]> => {
  try {
    const listType = params.listType || params.list_type;
    const propType = params.propType || params.prop_type;
    const minPrice = params.minPrice ?? params.min_price;
    const maxPrice = params.maxPrice ?? params.max_price;
    const bedrooms = params.bedrooms;
    const bathrooms = params.bathrooms;
    const queryStr = params.query;
    const status = params.status || 'PUBLISHED';

    let queryBuilder = supabase
      .from('properties')
      .select('*, property_media(url)')
      .eq('status', status);

    if (minPrice !== undefined && minPrice !== null && minPrice > 0) {
      queryBuilder = queryBuilder.gte('price', minPrice);
    }

    if (maxPrice !== undefined && maxPrice !== null && maxPrice > 0) {
      queryBuilder = queryBuilder.lte('price', maxPrice);
    }

    if (bedrooms !== undefined && bedrooms !== null && bedrooms !== '' && bedrooms !== 'any') {
      const minBeds = typeof bedrooms === 'string' ? parseInt(bedrooms, 10) : bedrooms;
      if (!isNaN(minBeds) && minBeds > 0) {
        queryBuilder = queryBuilder.gte('bedrooms', minBeds);
      }
    }

    if (bathrooms !== undefined && bathrooms !== null && bathrooms !== '' && bathrooms !== 'any') {
      const minBaths = typeof bathrooms === 'string' ? parseInt(bathrooms, 10) : bathrooms;
      if (!isNaN(minBaths) && minBaths > 0) {
        queryBuilder = queryBuilder.gte('bathrooms', minBaths);
      }
    }

    if (propType && propType !== 'ALL') {
      queryBuilder = queryBuilder.eq('prop_type', propType);
    }

    if (listType && listType !== 'ALL') {
      queryBuilder = queryBuilder.eq('list_type', listType);
    }

    if (queryStr && queryStr.trim()) {
      const q = queryStr.trim();
      queryBuilder = queryBuilder.or(`title.ilike.%${q}%,address.ilike.%${q}%`);
    }

    if (params.sortBy === 'price_asc') {
      queryBuilder = queryBuilder.order('price', { ascending: true });
    } else if (params.sortBy === 'price_desc') {
      queryBuilder = queryBuilder.order('price', { ascending: false });
    } else if (params.sortBy === 'area_desc') {
      queryBuilder = queryBuilder.order('area_sqft', { ascending: false, nullsFirst: false });
    } else {
      queryBuilder = queryBuilder.order('created_at', { ascending: false });
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error searching properties:', error);
      return [];
    }

    let results: Property[] = (data as Property[]) || [];

    if (params.bounds) {
      const { north, south, east, west } = params.bounds;
      results = results.filter((prop: Property) => {
        if (typeof prop.latitude === 'number' && typeof prop.longitude === 'number') {
          return (
            prop.latitude >= south &&
            prop.latitude <= north &&
            prop.longitude >= west &&
            prop.longitude <= east
          );
        }
        // Fallback: if database lacks coordinates, returns filtered results gracefully
        return true;
      });
    }

    return results;
  } catch (err) {
    console.error('Unexpected error searching properties:', err);
    return [];
  }
};

export const getPublishedProperties = async () => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_media(url)')
      .eq('status', 'PUBLISHED');

    if (error) {
      console.error('Error fetching published properties:', error);
      return [];
    }

    return data;
  } catch (err) {
    console.error('Unexpected error fetching published properties:', err);
    return [];
  }
};

const isUUID = (str: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

export const getPropertyById = async (id: string) => {
  if (!id || !isUUID(id)) {
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_media(url)')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching property by id (${id}):`, error);
      return null;
    }

    return data;
  } catch (err) {
    console.error(`Unexpected error fetching property by id (${id}):`, err);
    return null;
  }
};

export const createEnquiry = async (propertyId: string, message: string) => {
  try {
    const { data, error } = await supabase
      .from('enquiries')
      .insert([
        { property_id: propertyId, message },
      ])
      .select();

    if (error) {
      console.error('Error creating enquiry:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error creating enquiry:', err);
    return { success: false, error: err };
  }
};

export const getPendingProperties = async () => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_media(url)')
      .eq('status', 'PENDING_APPROVAL');

    if (error) {
      console.error('Error fetching pending properties:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Unexpected error fetching pending properties:', err);
    return [];
  }
};

export const approveProperty = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .update({ status: 'PUBLISHED' })
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error approving property (${id}):`, error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error(`Unexpected error approving property (${id}):`, err);
    return { success: false, error: err };
  }
};

export const rejectProperty = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .update({ status: 'REJECTED' })
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error rejecting property (${id}):`, error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error(`Unexpected error rejecting property (${id}):`, err);
    return { success: false, error: err };
  }
};

export const getOwnerEnquiries = async (ownerId: string) => {
  try {
    const { data, error } = await supabase
      .from('enquiries')
      .select('*, properties(*)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching owner enquiries (${ownerId}):`, error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error(`Unexpected error fetching owner enquiries (${ownerId}):`, err);
    return [];
  }
};

export const getOwnerProperties = async (ownerId: string) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_media(url)')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching owner properties (${ownerId}):`, error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error(`Unexpected error fetching owner properties (${ownerId}):`, err);
    return [];
  }
};

export const createProperty = async (propertyData: Partial<import('./database.types').Property>) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error creating property:', err);
    return { success: false, error: err };
  }
};


export const addPropertyMedia = async (propertyId: string, url: string, isFeatured: boolean = false, displayOrder: number = 0) => {
  try {
    const { data, error } = await supabase
      .from('property_media')
      .insert([
        { property_id: propertyId, url, type: 'IMAGE', is_featured: isFeatured, display_order: displayOrder },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding property media:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error adding property media:', err);
    return { success: false, error: err };
  }
};

export const checkIfSaved = async (userId: string, propertyId: string) => {
  if (!userId || !propertyId || !isUUID(userId) || !isUUID(propertyId)) {
    return false;
  }
  try {
    const { data, error } = await supabase
      .from('saved_properties')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if property is saved:', error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error('Unexpected error checking if property is saved:', err);
    return false;
  }
};

export const toggleSavedProperty = async (userId: string, propertyId: string) => {
  if (!userId || !propertyId || !isUUID(userId) || !isUUID(propertyId)) {
    return { success: false, isSaved: false, error: 'Invalid ID' };
  }
  try {
    const isSaved = await checkIfSaved(userId, propertyId);
    
    if (isSaved) {
      const { error } = await supabase
        .from('saved_properties')
        .delete()
        .eq('user_id', userId)
        .eq('property_id', propertyId);
        
      if (error) {
        console.error('Error removing saved property:', error);
        return { success: false, isSaved: true };
      }
      return { success: true, isSaved: false };
    } else {
      const { error } = await supabase
        .from('saved_properties')
        .insert([{ user_id: userId, property_id: propertyId }]);
        
      if (error) {
        console.error('Error saving property:', error);
        return { success: false, isSaved: false };
      }
      return { success: true, isSaved: true };
    }
  } catch (err) {
    console.error('Unexpected error toggling saved property:', err);
    return { success: false, isSaved: false };
  }
};

export const getSavedProperties = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('saved_properties')
      .select('*, properties(*, property_media(url))')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching saved properties:', error);
      return [];
    }

    return data ? data.map((item: any) => item.properties) : [];
  } catch (err) {
    console.error('Unexpected error fetching saved properties:', err);
    return [];
  }
};


