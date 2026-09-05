import { supabase } from './client';
import { Property } from './database.types';
import { deletePropertyStorageFolder } from './storage';

export interface SearchBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface SearchPropertiesParams {
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
  bounds?: SearchBounds;
}

export type PropertySearchParams = SearchPropertiesParams;

export interface GeocodeResult {
  lat: number;
  lng: number;
  latitude: number;
  longitude: number;
}

/**
 * Geocode an address string to coordinates { lat, lng }.
 * Parses common city and neighborhood keywords (Mumbai, Delhi/NCR, Bangalore, Pune, Hyderabad, Miami)
 * and falls back to a realistic coordinate or Mumbai center.
 */
export const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
  if (!address || typeof address !== 'string' || !address.trim()) {
    return null;
  }

  const text = address.trim().toLowerCase();

  const toResult = (lat: number, lng: number): GeocodeResult => ({
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
    latitude: parseFloat(lat.toFixed(6)),
    longitude: parseFloat(lng.toFixed(6)),
  });

  // Miami / Florida
  if (
    text.includes('miami') ||
    text.includes('florida') ||
    text.includes('brickell') ||
    text.includes('south beach') ||
    text.includes('biscayne')
  ) {
    return toResult(25.7617, -80.1918);
  }

  // Delhi / Noida / Gurgaon
  if (
    text.includes('delhi') ||
    text.includes('noida') ||
    text.includes('gurgaon') ||
    text.includes('gurugram') ||
    text.includes('ncr')
  ) {
    if (text.includes('noida')) {
      return toResult(28.5355, 77.3910);
    }
    if (text.includes('gurgaon') || text.includes('gurugram')) {
      return toResult(28.4595, 77.0266);
    }
    return toResult(28.6139, 77.2090);
  }

  // Bangalore (Whitefield / Indiranagar / Koramangala)
  if (
    text.includes('bangalore') ||
    text.includes('bengaluru') ||
    text.includes('whitefield') ||
    text.includes('indiranagar') ||
    text.includes('koramangala') ||
    text.includes('electronic city') ||
    text.includes('hsr')
  ) {
    if (text.includes('whitefield')) {
      return toResult(12.9698, 77.7499);
    }
    if (text.includes('indiranagar')) {
      return toResult(12.9784, 77.6408);
    }
    if (text.includes('koramangala')) {
      return toResult(12.9352, 77.6245);
    }
    return toResult(12.9716, 77.5946);
  }

  // Pune
  if (
    text.includes('pune') ||
    text.includes('hinjewadi') ||
    text.includes('wakad') ||
    text.includes('koregaon') ||
    text.includes('baner') ||
    text.includes('kothrud')
  ) {
    return toResult(18.5204, 73.8567);
  }

  // Hyderabad
  if (
    text.includes('hyderabad') ||
    text.includes('secunderabad') ||
    text.includes('hitec') ||
    text.includes('gachibowli') ||
    text.includes('jubilee hills') ||
    text.includes('banjara hills')
  ) {
    return toResult(17.3850, 78.4867);
  }

  // Mumbai (Bandstand / Bandra / Lower Parel / etc.)
  if (
    text.includes('mumbai') ||
    text.includes('bombay') ||
    text.includes('bandra') ||
    text.includes('bandstand') ||
    text.includes('lower parel') ||
    text.includes('worli') ||
    text.includes('juhu') ||
    text.includes('andheri') ||
    text.includes('powai') ||
    text.includes('colaba') ||
    text.includes('dadar')
  ) {
    if (text.includes('bandstand') || text.includes('bandra')) {
      return toResult(19.0596, 72.8295);
    }
    if (text.includes('lower parel') || text.includes('worli')) {
      return toResult(18.9986, 72.8306);
    }
    if (text.includes('juhu')) {
      return toResult(19.1075, 72.8263);
    }
    if (text.includes('powai')) {
      return toResult(19.1176, 72.9060);
    }
    return toResult(19.0760, 72.8777);
  }

  // Default fallback: Mumbai center
  return toResult(19.0760, 72.8777);
};

export const searchProperties = async (params: SearchPropertiesParams = {}): Promise<Property[]> => {
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
      .eq('status', status)
      .is('deleted_at', null);

    if (params.bounds) {
      queryBuilder = queryBuilder
        .gte('latitude', params.bounds.south)
        .lte('latitude', params.bounds.north)
        .gte('longitude', params.bounds.west)
        .lte('longitude', params.bounds.east);
    }

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
      .select('*, property_media(id, url, is_featured, display_order)')
      .eq('status', 'PUBLISHED')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

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
      .select('*, property_media(id, url, is_featured, display_order)')
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

export const createEnquiry = async (
  propertyId: string,
  message: string,
  userId?: string | null,
  ownerId?: string | null
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const effectiveUserId = userId !== undefined ? userId : user?.id || null;

    let effectiveOwnerId = ownerId;
    if (!effectiveOwnerId) {
      const { data: prop } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', propertyId)
        .maybeSingle();
      effectiveOwnerId = prop?.owner_id || null;
    }

    const payload: any = {
      property_id: propertyId,
      message,
    };
    if (effectiveUserId) payload.user_id = effectiveUserId;
    if (effectiveOwnerId) payload.owner_id = effectiveOwnerId;

    // Do not chain .select() for guest enquiries because RETURNING * invokes SELECT RLS policies
    // which require authentication (auth.uid() = user_id or owner_id)
    let query: any = supabase.from('enquiries').insert([payload]);
    if (effectiveUserId) {
      query = query.select();
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error creating enquiry:', error.message || error);
      return { success: false, error };
    }

    return { success: true, data: data || null };
  } catch (err: any) {
    console.error('Unexpected error creating enquiry:', err?.message || err);
    return { success: false, error: err };
  }
};

export const getPendingProperties = async () => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_media(url)')
      .eq('status', 'PENDING_APPROVAL')
      .is('deleted_at', null);

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
      .update({ status: 'PUBLISHED', is_approved: true })
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

export const submitPropertyForApproval = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .update({ status: 'PENDING_APPROVAL' })
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error submitting property for approval (${id}):`, error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error(`Unexpected error submitting property for approval (${id}):`, err);
    return { success: false, error: err };
  }
};

export const togglePropertyPublish = async (id: string, publish: boolean) => {
  try {
    const newStatus = publish ? 'PUBLISHED' : 'UNPUBLISHED';
    const { data, error } = await supabase
      .from('properties')
      .update({ status: newStatus })
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error toggling property publish (${id}):`, error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error(`Unexpected error toggling property publish (${id}):`, err);
    return { success: false, error: err };
  }
};

export const updateProperty = async (
  id: string,
  propertyData: Partial<Property>,
  wasPublished?: boolean
) => {
  try {
    const updatePayload: any = wasPublished
      ? {
          ...propertyData,
          is_approved: false,
          status: 'PENDING_APPROVAL',
          updated_at: new Date().toISOString(),
        }
      : {
          ...propertyData,
          updated_at: new Date().toISOString(),
        };

    const { data, error } = await supabase
      .from('properties')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating property (${id}):`, error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error(`Unexpected error updating property (${id}):`, err);
    return { success: false, error: err };
  }
};

export const updatePropertyMediaOrder = async (
  updates: { id: string; display_order: number; is_featured: boolean }[] | string,
  displayOrder?: number,
  isFeatured?: boolean
): Promise<{ success: boolean; error?: any; data?: any }> => {
  try {
    if (Array.isArray(updates)) {
      const promises = updates.map((item) =>
        supabase
          .from('property_media')
          .update({
            display_order: item.display_order,
            is_featured: item.is_featured,
          })
          .eq('id', item.id)
      );
      const results = await Promise.all(promises);
      const failed = results.find((res) => res.error);
      if (failed?.error) {
        console.error('Error updating property media order:', failed.error);
        return { success: false, error: failed.error };
      }
      return { success: true };
    } else {
      const updateData: any = { display_order: displayOrder ?? 0 };
      if (isFeatured !== undefined) {
        updateData.is_featured = isFeatured;
      }
      const { data, error } = await supabase
        .from('property_media')
        .update(updateData)
        .eq('id', updates)
        .select();

      if (error) {
        console.error(`Error updating property media order (${updates}):`, error);
        return { success: false, error };
      }
      return { success: true, data };
    }
  } catch (err) {
    console.error('Unexpected error updating property media order:', err);
    return { success: false, error: err };
  }
};

export const deletePropertyMedia = async (mediaId: string) => {
  try {
    const { error } = await supabase
      .from('property_media')
      .delete()
      .eq('id', mediaId);

    if (error) {
      console.error(`Error deleting property media (${mediaId}):`, error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error(`Unexpected error deleting property media (${mediaId}):`, err);
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

export const getOwnerProperties = async (
  ownerId: string,
  options?: { showDeleted?: boolean }
) => {
  try {
    let query = supabase
      .from('properties')
      .select('*, property_media(id, url, is_featured, display_order)')
      .eq('owner_id', ownerId);

    if (options?.showDeleted) {
      query = query.not('deleted_at', 'is', null);
    } else {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

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

export const softDeleteProperty = async (id: string): Promise<{ success: boolean; error?: any }> => {
  try {
    const { error } = await supabase
      .from('properties')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'UNPUBLISHED',
      })
      .eq('id', id);

    if (error) {
      console.error(`Error soft deleting property (${id}):`, error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error(`Unexpected error soft deleting property (${id}):`, err);
    return { success: false, error: err };
  }
};

export const restoreProperty = async (id: string): Promise<{ success: boolean; error?: any }> => {
  try {
    const { error } = await supabase
      .from('properties')
      .update({
        deleted_at: null,
        status: 'PENDING_APPROVAL',
        is_approved: false,
      })
      .eq('id', id);

    if (error) {
      console.error(`Error restoring property (${id}):`, error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    console.error(`Unexpected error restoring property (${id}):`, err);
    return { success: false, error: err };
  }
};

export const deletePropertyPermanently = async (id: string): Promise<{ success: boolean; error?: any }> => {
  try {
    await deletePropertyStorageFolder(id);

    const { error: mediaError } = await supabase
      .from('property_media')
      .delete()
      .eq('property_id', id);

    if (mediaError) {
      console.error(`Error deleting property media for property (${id}):`, mediaError);
    }

    const { error: propError } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (propError) {
      console.error(`Error permanently deleting property (${id}):`, propError);
      return { success: false, error: propError };
    }

    return { success: true };
  } catch (err) {
    console.error(`Unexpected error permanently deleting property (${id}):`, err);
    return { success: false, error: err };
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





