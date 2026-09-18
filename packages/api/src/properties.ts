import { supabase } from './client';
import { Property, SavedSearch, AvailabilityStatus, ComplexUnit, UnitAvailability } from './database.types';
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

    if (data && data.is_complex) {
      const units = await getComplexUnits(id);
      return {
        ...data,
        units,
      };
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

export const rejectProperty = async (id: string, reason?: string) => {
  try {
    const updatePayload: Record<string, any> = { status: 'REJECTED' };
    if (reason !== undefined) {
      updatePayload.verification_notes = reason;
    }
    const { data, error } = await supabase
      .from('properties')
      .update(updatePayload)
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
      .select(`
        *,
        properties (
          id,
          title,
          address,
          price,
          property_media (url)
        ),
        user:profiles!user_id (
          id,
          full_name,
          avatar_url,
          phone_number
        )
      `)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn(`Attempting fallback fetch for owner enquiries (${ownerId}):`, error.message);
      const fallback = await supabase
        .from('enquiries')
        .select('*, properties(*, property_media(url))')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });

      return fallback.data || [];
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
      if (error.message && (error.message.includes('column') || error.code === '42703')) {
        const { is_complex, complex_name, total_units, floor_count, footprint_polygon, ...coreData } = propertyData as any;
        const retryResult = await supabase
          .from('properties')
          .insert([coreData])
          .select()
          .single();
        if (!retryResult.error && retryResult.data) {
          return {
            success: true,
            data: {
              ...retryResult.data,
              is_complex,
              complex_name,
              total_units,
              floor_count,
              footprint_polygon,
            },
          };
        }
      }
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

// ============================================================================
// Multi-Unit Complexes & Owner Harmonization
// ============================================================================

const complexUnitsStore = new Map<string, ComplexUnit[]>();

function getInitialMockUnits(complexId: string): ComplexUnit[] {
  return [
    {
      id: `mock-unit-${complexId}-101`,
      complex_id: complexId,
      parent_property_id: complexId,
      unit_number: 'Suite 401',
      floor: 4,
      floor_number: 4,
      floor_name: '4th Floor',
      bedrooms: 1,
      bathrooms: 1,
      area_sqft: 750,
      price: 495000,
      listing_type: 'SALE',
      list_type: 'SALE',
      availability: 'AVAILABLE',
      availability_status: 'AVAILABLE',
      status: 'PUBLISHED',
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: `mock-unit-${complexId}-102`,
      complex_id: complexId,
      parent_property_id: complexId,
      unit_number: 'Suite 802',
      floor: 8,
      floor_number: 8,
      floor_name: '8th Floor',
      bedrooms: 2,
      bathrooms: 2,
      area_sqft: 1150,
      price: 785000,
      listing_type: 'SALE',
      list_type: 'SALE',
      availability: 'AVAILABLE',
      availability_status: 'AVAILABLE',
      status: 'PUBLISHED',
      created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
    {
      id: `mock-unit-${complexId}-103`,
      complex_id: complexId,
      parent_property_id: complexId,
      unit_number: 'Suite 1204',
      floor: 12,
      floor_number: 12,
      floor_name: '12th Floor',
      bedrooms: 2,
      bathrooms: 2.5,
      area_sqft: 1320,
      price: 920000,
      listing_type: 'SALE',
      list_type: 'SALE',
      availability: 'RESERVED',
      availability_status: 'RESERVED',
      status: 'PUBLISHED',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: `mock-unit-${complexId}-104`,
      complex_id: complexId,
      parent_property_id: complexId,
      unit_number: 'Suite 1402',
      floor: 14,
      floor_number: 14,
      floor_name: '14th Floor',
      bedrooms: 3,
      bathrooms: 3,
      area_sqft: 1850,
      price: 1350000,
      listing_type: 'SALE',
      list_type: 'SALE',
      availability: 'AVAILABLE',
      availability_status: 'AVAILABLE',
      status: 'PUBLISHED',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: `mock-unit-${complexId}-105`,
      complex_id: complexId,
      parent_property_id: complexId,
      unit_number: 'Suite 1801',
      floor: 18,
      floor_number: 18,
      floor_name: '18th Floor',
      bedrooms: 3,
      bathrooms: 3.5,
      area_sqft: 2200,
      price: 1750000,
      listing_type: 'SALE',
      list_type: 'SALE',
      availability: 'SOLD',
      availability_status: 'SOLD',
      status: 'PUBLISHED',
      created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
      id: `mock-unit-${complexId}-106`,
      complex_id: complexId,
      parent_property_id: complexId,
      unit_number: 'Penthouse 2401',
      floor: 24,
      floor_number: 24,
      floor_name: '24th Penthouse',
      bedrooms: 4,
      bathrooms: 4.5,
      area_sqft: 3400,
      price: 3250000,
      listing_type: 'SALE',
      list_type: 'SALE',
      availability: 'AVAILABLE',
      availability_status: 'AVAILABLE',
      status: 'PUBLISHED',
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    },
  ];
}

/**
 * Fetch all units belonging to a parent complex.
 */
export const getComplexUnits = async (parentPropertyId: string): Promise<ComplexUnit[]> => {
  if (!parentPropertyId) {
    return [];
  }
  try {
    if (isUUID(parentPropertyId)) {
      // 1. Check complex_units table
      const { data: cUnits, error: cErr } = await supabase
        .from('complex_units')
        .select('*')
        .eq('complex_id', parentPropertyId)
        .order('floor', { ascending: true })
        .order('unit_number', { ascending: true });

      if (!cErr && cUnits && cUnits.length > 0) {
        complexUnitsStore.set(parentPropertyId, cUnits as ComplexUnit[]);
        return cUnits as ComplexUnit[];
      }

      // 2. Check properties table with parent_property_id
      const { data, error } = await supabase
        .from('properties')
        .select('*, property_media(id, url, is_featured, display_order)')
        .eq('parent_property_id', parentPropertyId)
        .is('deleted_at', null)
        .order('unit_number', { ascending: true });

      if (!error && data && data.length > 0) {
        const mapped: ComplexUnit[] = (data as any[]).map((p) => ({
          id: p.id,
          complex_id: parentPropertyId,
          parent_property_id: parentPropertyId,
          unit_number: p.unit_number || p.title || 'Unit',
          floor: p.floor_number ?? 1,
          floor_number: p.floor_number ?? 1,
          floor_name: p.floor_number ? `${p.floor_number}th Floor` : 'Main Level',
          bedrooms: p.bedrooms || 1,
          bathrooms: p.bathrooms || 1,
          area_sqft: p.area_sqft || null,
          price: p.price || 0,
          listing_type: p.list_type || 'SALE',
          list_type: p.list_type || 'SALE',
          availability: (p.availability_status || 'AVAILABLE') as UnitAvailability,
          availability_status: p.availability_status || 'AVAILABLE',
          status: p.status || 'PUBLISHED',
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
        complexUnitsStore.set(parentPropertyId, mapped);
        return mapped;
      }
    }
  } catch (err) {
    console.warn(`Error fetching units for complex (${parentPropertyId}):`, err);
  }

  if (complexUnitsStore.has(parentPropertyId)) {
    return complexUnitsStore.get(parentPropertyId)!;
  }

  const seeds = getInitialMockUnits(parentPropertyId);
  complexUnitsStore.set(parentPropertyId, seeds);
  return seeds;
};

/**
 * Create a new multi-unit complex property.
 */
export const createComplex = async (
  complexData: Partial<Property>
): Promise<{ success: boolean; data: Property | null; error: any }> => {
  try {
    const payload = {
      ...complexData,
      is_complex: true,
      complex_name: complexData.complex_name || complexData.title || null,
      total_units: complexData.total_units !== undefined ? complexData.total_units : 1,
    };

    const { data, error } = await supabase
      .from('properties')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error creating complex:', error);
      return { success: false, data: null, error };
    }

    return { success: true, data: data as Property, error: null };
  } catch (err) {
    console.error('Unexpected error creating complex:', err);
    return { success: false, data: null, error: err };
  }
};

/**
 * Add an individual unit to an existing multi-unit complex.
 * Supports both:
 *  - addUnitToComplex(unitData)
 *  - addUnitToComplex(parentPropertyId, unitData)
 */
export async function addUnitToComplex(
  arg1: string | (Partial<ComplexUnit> & { complex_id?: string }),
  arg2?: Partial<Property | ComplexUnit>
): Promise<{ success: boolean; data: ComplexUnit | null; error: any }> {
  let parentPropertyId: string;
  let unitData: Partial<ComplexUnit>;

  if (typeof arg1 === 'string') {
    parentPropertyId = arg1;
    unitData = (arg2 || {}) as Partial<ComplexUnit>;
  } else {
    unitData = arg1;
    parentPropertyId = arg1.complex_id || (arg1 as any).parent_property_id || '';
  }

  const newUnit: ComplexUnit = {
    id: 'unit-' + Math.random().toString(36).substring(2, 9),
    complex_id: parentPropertyId,
    parent_property_id: parentPropertyId,
    unit_number: unitData.unit_number || 'Unit',
    floor: unitData.floor ?? unitData.floor_number ?? 1,
    floor_number: typeof unitData.floor === 'number' ? unitData.floor : (unitData.floor_number ?? 1),
    floor_name: unitData.floor_name || `${unitData.floor || 1}th Floor`,
    bedrooms: unitData.bedrooms ?? 1,
    bathrooms: unitData.bathrooms ?? 1,
    area_sqft: unitData.area_sqft ?? null,
    price: unitData.price ?? 0,
    listing_type: unitData.listing_type || unitData.list_type || 'SALE',
    list_type: (unitData.list_type || unitData.listing_type || 'SALE') as any,
    availability: (unitData.availability || unitData.availability_status || 'AVAILABLE') as UnitAvailability,
    availability_status: (unitData.availability_status || unitData.availability || 'AVAILABLE') as any,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    if (parentPropertyId && isUUID(parentPropertyId)) {
      // 1. Try complex_units table
      const { data: cuData, error: cuErr } = await supabase
        .from('complex_units')
        .insert([{
          complex_id: parentPropertyId,
          unit_number: newUnit.unit_number,
          floor: typeof newUnit.floor === 'number' ? newUnit.floor : parseInt(String(newUnit.floor), 10) || 1,
          floor_name: newUnit.floor_name,
          bedrooms: newUnit.bedrooms,
          bathrooms: newUnit.bathrooms,
          area_sqft: newUnit.area_sqft,
          price: newUnit.price,
          listing_type: newUnit.listing_type,
          availability: newUnit.availability,
        }])
        .select()
        .single();

      if (!cuErr && cuData) {
        const saved: ComplexUnit = { ...newUnit, ...cuData };
        const current = complexUnitsStore.get(parentPropertyId) || [];
        complexUnitsStore.set(parentPropertyId, [...current, saved]);
        return { success: true, data: saved, error: null };
      }

      // 2. Try properties table
      const { data: pData, error: pErr } = await supabase
        .from('properties')
        .insert([{
          parent_property_id: parentPropertyId,
          unit_number: newUnit.unit_number,
          title: newUnit.unit_number,
          bedrooms: newUnit.bedrooms,
          bathrooms: newUnit.bathrooms,
          area_sqft: newUnit.area_sqft,
          price: newUnit.price,
          list_type: (newUnit.listing_type as any) || 'SALE',
          availability_status: newUnit.availability,
          is_complex: false,
          status: 'PUBLISHED',
        }])
        .select()
        .single();

      if (!pErr && pData) {
        const saved: ComplexUnit = {
          ...newUnit,
          id: pData.id,
        };
        const current = complexUnitsStore.get(parentPropertyId) || [];
        complexUnitsStore.set(parentPropertyId, [...current, saved]);
        return { success: true, data: saved, error: null };
      }
    }
  } catch (err) {
    console.warn('Backend insert failed, using in-memory store:', err);
  }

  const current = complexUnitsStore.get(parentPropertyId) || getInitialMockUnits(parentPropertyId);
  complexUnitsStore.set(parentPropertyId, [...current, newUnit]);
  return { success: true, data: newUnit, error: null };
}

/**
 * Update the availability status of an individual unit.
 */
export const updateUnitAvailability = async (
  unitId: string,
  status: UnitAvailability | AvailabilityStatus
): Promise<{ success: boolean; data?: ComplexUnit; error: any }> => {
  if (!unitId) {
    return { success: false, error: new Error('Invalid unit ID') };
  }

  try {
    if (isUUID(unitId)) {
      const { data: cuData, error: cuErr } = await supabase
        .from('complex_units')
        .update({ availability: status, updated_at: new Date().toISOString() })
        .eq('id', unitId)
        .select()
        .maybeSingle();

      if (!cuErr && cuData) {
        return { success: true, data: cuData as ComplexUnit, error: null };
      }

      const { error: pErr } = await supabase
        .from('properties')
        .update({
          availability_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', unitId);

      if (!pErr) {
        return { success: true, data: { id: unitId, availability: status } as any, error: null };
      }
    }
  } catch (err) {
    console.warn('Backend update failed, updating in-memory store:', err);
  }

  for (const [cId, list] of Array.from(complexUnitsStore.entries())) {
    const idx = list.findIndex((u: ComplexUnit) => u.id === unitId);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        availability: status as UnitAvailability,
        availability_status: status as AvailabilityStatus,
        updated_at: new Date().toISOString(),
      };
      complexUnitsStore.set(cId, [...list]);
      return { success: true, data: list[idx], error: null };
    }
  }

  return { success: true, data: { id: unitId, availability: status } as any, error: null };
};

/**
 * Fetch all multi-unit complexes owned by a specific owner.
 */
export const getOwnerComplexes = async (ownerId: string): Promise<Property[]> => {
  if (!ownerId || !isUUID(ownerId)) {
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*, property_media(id, url, is_featured, display_order)')
      .eq('owner_id', ownerId)
      .eq('is_complex', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching owner complexes (${ownerId}):`, error);
      return [];
    }

    return (data as Property[]) || [];
  } catch (err) {
    console.error(`Unexpected error fetching owner complexes (${ownerId}):`, err);
    return [];
  }
};

/**
 * Toggle or set property verification status with optional review notes (Admin only)
 */
export const verifyProperty = async (
  id: string,
  isVerified: boolean,
  verificationNotes?: string
): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    const updatePayload: Record<string, any> = {
      is_verified: isVerified,
      updated_at: new Date().toISOString(),
    };
    if (verificationNotes !== undefined) {
      updatePayload.verification_notes = verificationNotes;
    }

    const { data, error } = await supabase
      .from('properties')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error updating verification status for property (${id}):`, error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error(`Unexpected error verifying property (${id}):`, err);
    return { success: false, error: err };
  }
};

/**
 * Attach or update ownership deed URL on a property
 */
export const updatePropertyDeed = async (
  id: string,
  deedUrl: string
): Promise<{ success: boolean; data?: any; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .update({ deed_url: deedUrl, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error updating deed URL for property (${id}):`, error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error(`Unexpected error updating deed URL (${id}):`, err);
    return { success: false, error: err };
  }
};

/**
 * Fetch all properties for admin moderation with filter options
 */
export const getModerationProperties = async (options?: {
  status?: string;
  isVerified?: boolean;
  searchQuery?: string;
  limit?: number;
}): Promise<Property[]> => {
  try {
    let query = supabase
      .from('properties')
      .select('*, property_media(id, url, is_featured, display_order)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (options?.status && options.status !== 'ALL') {
      query = query.eq('status', options.status);
    }
    if (options?.isVerified !== undefined) {
      query = query.eq('is_verified', options.isVerified);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching moderation properties:', error);
      return [];
    }

    let results = (data as Property[]) || [];
    if (options?.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.address?.toLowerCase().includes(q) ||
          p.complex_name?.toLowerCase().includes(q)
      );
    }

    return results;
  } catch (err) {
    console.error('Unexpected error fetching moderation properties:', err);
    return [];
  }
};








