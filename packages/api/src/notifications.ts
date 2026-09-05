import { supabase } from './client';

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
