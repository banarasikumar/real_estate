import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  useAuth,
  supabase,
  getUnreadMessageCount,
  subscribeToUserConversations,
  subscribeToUserUnreadMessages,
} from '@repo/api';

export interface BannerParams {
  title: string;
  body: string;
  propertyTitle?: string;
  senderAvatar?: string;
  onPress?: () => void;
}

export interface NotificationContextType {
  unreadMessagesCount: number;
  refreshCounts: () => Promise<void>;
  showInAppBanner: (params: BannerParams) => void;
  bannerData: BannerParams | null;
  bannerVisible: boolean;
  dismissBanner: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Graceful push token registration (safe for web/simulator, won't throw if expo-notifications is missing).
 */
export const registerForPushNotifications = async (userId: string): Promise<string | null> => {
  if (Platform.OS === 'web' || !userId) {
    return null;
  }

  try {
    // Dynamic import to prevent crash when module is not installed
    let Notifications: any;
    try {
      Notifications = require('expo-notifications');
    } catch {
      // expo-notifications not installed in environment
      return null;
    }

    if (!Notifications || !Notifications.getPermissionsAsync) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted' && Notifications.requestPermissionsAsync) {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenResponse?.data;

    if (pushToken) {
      await supabase
        .from('profiles')
        .update({ push_token: pushToken })
        .eq('id', userId);
      return pushToken;
    }

    return null;
  } catch (error) {
    console.log('Push token registration skipped or unsupported:', error);
    return null;
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { user } = useAuth();

  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [bannerData, setBannerData] = useState<BannerParams | null>(null);
  const [bannerVisible, setBannerVisible] = useState<boolean>(false);

  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshCounts = useCallback(async () => {
    if (!user?.id) {
      setUnreadMessagesCount(0);
      return;
    }

    try {
      const count = await getUnreadMessageCount(user.id);
      setUnreadMessagesCount(count);
    } catch (err) {
      console.error('Error refreshing unread count:', err);
    }
  }, [user?.id]);

  const dismissBanner = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setBannerVisible(false);
  }, []);

  const showInAppBanner = useCallback(
    (params: BannerParams) => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      setBannerData(params);
      setBannerVisible(true);

      // Auto-dismiss after 4 seconds
      dismissTimerRef.current = setTimeout(() => {
        setBannerVisible(false);
      }, 4000);
    },
    []
  );

  useEffect(() => {
    if (!user?.id) {
      setUnreadMessagesCount(0);
      return;
    }

    // 1. Initial count refresh
    refreshCounts();

    // 2. Register push token gracefully
    registerForPushNotifications(user.id);

    // 3. Subscribe to user conversations changes
    const unsubConversations = subscribeToUserConversations(user.id, () => {
      refreshCounts();
    });

    // 4. Subscribe to user unread messages changes & incoming replies
    const unsubMessages = subscribeToUserUnreadMessages(user.id, async (payload) => {
      await refreshCounts();

      // If owner replied with a new message
      if (payload?.eventType === 'INSERT' && payload.new && payload.new.sender_id !== user.id) {
        const newMsg = payload.new;
        let senderName = 'Property Owner';
        let propertyTitle: string | undefined;
        let senderAvatar: string | undefined;

        try {
          const { data: conv } = await supabase
            .from('conversations')
            .select(`
              id,
              property_id,
              properties (title),
              owner:profiles!owner_id (full_name, avatar_url)
            `)
            .eq('id', newMsg.conversation_id)
            .maybeSingle();

          if (conv) {
            senderName = (conv.owner as any)?.full_name || 'Property Owner';
            senderAvatar = (conv.owner as any)?.avatar_url || undefined;
            propertyTitle = (conv.properties as any)?.title || undefined;
          }
        } catch (err) {
          console.warn('Error fetching details for banner toast:', err);
        }

        showInAppBanner({
          title: senderName,
          body: newMsg.text || 'Sent you a new message',
          propertyTitle,
          senderAvatar,
          onPress: () => {
            router.push('/(tabs)/messages');
          },
        });
      }
    });

    return () => {
      unsubConversations();
      unsubMessages();
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [user?.id, refreshCounts, showInAppBanner, router]);

  return (
    <NotificationContext.Provider
      value={{
        unreadMessagesCount,
        refreshCounts,
        showInAppBanner,
        bannerData,
        bannerVisible,
        dismissBanner,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
