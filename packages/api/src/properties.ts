import { supabase } from './client';
import { Property } from './database.types';

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
