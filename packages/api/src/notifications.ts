import { supabase } from './client';
import type { AppNotification } from './database.types';

/**
 * Updates the push notification token for a user profile.
 */
export const updateUserPushToken = async (
  userId: string,
  token: string
): Promise<{ success: boolean; error?: any }> => {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user push token:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in updateUserPushToken:', err);
    return { success: false, error: err };
  }
};

/**
 * Sends an Expo push notification to the specified push token.
 */
export const sendExpoPushNotification = async (
  pushToken: string,
  title: string,
  body: string,
  data?: any
): Promise<{ success: boolean; error?: any }> => {
  if (!pushToken) {
    return { success: false, error: 'Push token is required' };
  }

  try {
    const payload: Record<string, any> = {
      to: pushToken,
      title,
      body,
    };

    if (data !== undefined) {
      payload.data = data;
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Expo push notification failed [${response.status}]:`, errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in sendExpoPushNotification:', err);
    return { success: false, error: err };
  }
};

/**
 * Fetches all notifications for a given user, ordered newest first.
 * Attempts to join associated property and saved search records.
 *
 * @param userId - ID of the recipient user
 * @returns Array of AppNotification objects
 */
export const getUserNotifications = async (userId: string): Promise<AppNotification[]> => {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*, properties(*, property_media(url)), saved_searches(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching detailed notifications, falling back to basic fetch:', error.message);
      const fallback = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return (fallback.data as AppNotification[]) || [];
    }

    // Normalize joins to property and saved_search fields
    const formatted = (data || []).map((item: any) => ({
      ...item,
      property: item.properties || null,
      saved_search: item.saved_searches || null,
    }));

    return formatted as AppNotification[];
  } catch (err) {
    console.error('Unexpected error in getUserNotifications:', err);
    return [];
  }
};

/**
 * Marks a specific notification as read.
 *
 * @param notificationId - UUID of the notification
 * @returns Object with success flag and error details if any
 */
export const markNotificationAsRead = async (
  notificationId: string
): Promise<{ success: boolean; error: any }> => {
  if (!notificationId) {
    return { success: false, error: 'Notification ID is required' };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Unexpected error in markNotificationAsRead:', err);
    return { success: false, error: err };
  }
};

/**
 * Returns the count of unread notifications for a user.
 *
 * @param userId - UUID of the user
 * @returns Number of unread notifications
 */
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  if (!userId) return 0;

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Unexpected error in getUnreadNotificationCount:', err);
    return 0;
  }
};

/**
 * Marks all unread notifications as read for a given user.
 *
 * @param userId - UUID of the user
 * @returns Object with success flag and error details if any
 */
export const markAllNotificationsAsRead = async (
  userId: string
): Promise<{ success: boolean; error: any }> => {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.error('Unexpected error in markAllNotificationsAsRead:', err);
    return { success: false, error: err };
  }
};

/**
 * Subscribes to realtime new notifications for a given user.
 *
 * @param userId - UUID of the user
 * @param onNotification - Callback invoked when a new notification is inserted
 * @returns Unsubscribe cleanup function
 */
export const subscribeToUserNotifications = (
  userId: string,
  onNotification: (notification: AppNotification) => void
): (() => void) => {
  const channelName = `user-notifications-${userId}-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotification(payload.new as AppNotification);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Deletes a specific notification by ID.
 *
 * @param notificationId - UUID of the notification
 * @returns Object with success flag and optional error
 */
export const deleteNotification = async (
  notificationId: string
): Promise<{ success: boolean; error?: any }> => {
  if (!notificationId) {
    return { success: false, error: 'Notification ID is required' };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in deleteNotification:', err);
    return { success: false, error: err };
  }
};

/**
 * Clears/deletes all notifications for a given user.
 *
 * @param userId - UUID of the user
 * @returns Object with success flag and optional error
 */
export const clearAllNotifications = async (
  userId: string
): Promise<{ success: boolean; error?: any }> => {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing all notifications:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in clearAllNotifications:', err);
    return { success: false, error: err };
  }
};

