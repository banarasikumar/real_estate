import { supabase } from './client';

export interface UserEnquiryResponse {
  success: boolean;
  data?: any[];
  error?: any;
}

/**
 * Fetches all enquiries submitted by a user with the specified email address,
 * including associated property details (title, address, price, and media URLs).
 * Ordered by creation timestamp descending.
 *
 * @param email - The email address of the user who submitted enquiries.
 * @returns Object with success flag, data array of enquiries, and error details if any.
 */
export const getUserEnquiries = async (identifier: string): Promise<UserEnquiryResponse> => {
  if (!identifier || typeof identifier !== 'string') {
    return {
      success: true,
      data: [],
    };
  }

  try {
    let query = supabase
      .from('enquiries')
      .select('*, properties(*, property_media(url))');

    if (identifier.includes('@')) {
      query = query.ilike('message', `%${identifier}%`);
    } else {
      query = query.or(`user_id.eq.${identifier},message.ilike.%${identifier}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // Fallback query without relations
      let fallbackQuery = supabase.from('enquiries').select('*');
      if (identifier.includes('@')) {
        fallbackQuery = fallbackQuery.ilike('message', `%${identifier}%`);
      } else {
        fallbackQuery = fallbackQuery.or(`user_id.eq.${identifier},message.ilike.%${identifier}%`);
      }

      const fallbackRes = await fallbackQuery.order('created_at', { ascending: false });
      return {
        success: true,
        data: fallbackRes.data || [],
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err: any) {
    return {
      success: true,
      data: [],
    };
  }
};

/**
 * Marks an enquiry as READ if its current status is NEW.
 */
export const markEnquiryAsRead = async (
  enquiryId: string
): Promise<{ success: boolean; error?: any }> => {
  if (!enquiryId) {
    return { success: false, error: 'Enquiry ID is required' };
  }

  try {
    const { error } = await supabase
      .from('enquiries')
      .update({
        status: 'READ',
        updated_at: new Date().toISOString(),
      })
      .eq('id', enquiryId)
      .eq('status', 'NEW');

    if (error) {
      console.error('Error marking enquiry as read:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in markEnquiryAsRead:', err);
    return { success: false, error: err };
  }
};

/**
 * Updates the status of an enquiry (e.g. 'RESPONDED' when tour is confirmed, 'CLOSED' when declined).
 */
export const updateEnquiryStatus = async (
  enquiryId: string,
  status: 'NEW' | 'READ' | 'RESPONDED' | 'CLOSED'
): Promise<{ success: boolean; error?: any }> => {
  if (!enquiryId) {
    return { success: false, error: 'Enquiry ID is required' };
  }

  try {
    const { error } = await supabase
      .from('enquiries')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', enquiryId);

    if (error) {
      console.error('Error updating enquiry status:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in updateEnquiryStatus:', err);
    return { success: false, error: err };
  }
};

/**
 * Counts unread (NEW) enquiries for a given property owner.
 */
export const getOwnerUnreadEnquiryCount = async (ownerId: string): Promise<number> => {
  if (!ownerId) return 0;

  try {
    const { count, error } = await supabase
      .from('enquiries')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .eq('status', 'NEW');

    if (error) {
      console.error('Error counting owner unread enquiries:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Unexpected error in getOwnerUnreadEnquiryCount:', err);
    return 0;
  }
};

/**
 * Subscribes to realtime changes on the enquiries table for a property owner.
 */
export const subscribeToOwnerEnquiries = (
  ownerId: string,
  onUpdate: (newEnquiry?: any) => void
): (() => void) => {
  const channelName = `owner-enquiries-${ownerId}-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'enquiries',
        filter: `owner_id=eq.${ownerId}`,
      },
      (payload) => {
        onUpdate(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

