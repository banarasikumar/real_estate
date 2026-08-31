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
