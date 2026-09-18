import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  useAuth,
  supabase,
  getUnreadMessageCount,
  subscribeToUserConversations,
  subscribeToUserUnreadMessages,
  getUnreadNotificationCount,
  getUserNotifications,
  subscribeToUserNotifications,
  markNotificationAsRead as apiMarkNotificationAsRead,
  markAllNotificationsAsRead as apiMarkAllNotificationsAsRead,
  deleteNotification as apiDeleteNotification,
  clearAllNotifications as apiClearAllNotifications,
  AppNotification,
} from '@repo/api';
import { getDemoLuxuryNotifications } from '../data/mockNotifications';

export interface BannerParams {
  title: string;
  body: string;
  propertyTitle?: string;
  senderAvatar?: string;
  iconName?: string;
  iconColor?: string;
  iconBg?: string;
  badgeText?: string;
  onPress?: () => void;
}

export interface NotificationContextType {
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  totalUnreadCount: number;
  notifications: AppNotification[];
  isLoadingNotifications: boolean;
  refreshCounts: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  showInAppBanner: (params: BannerParams) => void;
  bannerData: BannerParams | null;
  bannerVisible: boolean;
  dismissBanner: () => void;
  markNotificationRead: (id: string) => Promise<{ success: boolean; error?: any }>;
  markNotificationAsRead: (id: string) => Promise<{ success: boolean; error?: any }>;
  markAllNotificationsRead: () => Promise<{ success: boolean; error?: any }>;
  markAllNotificationsAsRead: () => Promise<{ success: boolean; error?: any }>;
  deleteNotification: (id: string) => Promise<{ success: boolean; error?: any }>;
  clearAllNotifications: () => Promise<{ success: boolean; error?: any }>;
  restoreDemoNotifications: () => void;
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
    let Notifications: any;
    try {
      Notifications = require('expo-notifications');
    } catch {
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
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);
  const [hasClearedDemo, setHasClearedDemo] = useState<boolean>(false);

  const [bannerData, setBannerData] = useState<BannerParams | null>(null);
  const [bannerVisible, setBannerVisible] = useState<boolean>(false);

  const totalUnreadCount = unreadMessagesCount + unreadNotificationsCount;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshCounts = useCallback(async () => {
    if (!user?.id) {
      setUnreadMessagesCount(0);
      return;
    }

    try {
      const [msgCount, notifCount] = await Promise.all([
        getUnreadMessageCount(user.id),
        getUnreadNotificationCount(user.id),
      ]);
      setUnreadMessagesCount(msgCount);
      setUnreadNotificationsCount(notifCount);
    } catch (err) {
      console.error('Error refreshing counts:', err);
    }
  }, [user?.id]);

  const refreshNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      if (user?.id) {
        const fetched = await getUserNotifications(user.id);
        if (fetched && fetched.length > 0) {
          setNotifications(fetched);
          const unread = fetched.filter((n) => !n.is_read).length;
          setUnreadNotificationsCount(unread);
          setIsLoadingNotifications(false);
          return;
        }
      }

      // Guest or 0 DB notifications: fallback to curated luxury notifications unless explicitly cleared
      if (!hasClearedDemo) {
        const demo = getDemoLuxuryNotifications();
        setNotifications(demo);
        const unread = demo.filter((n) => !n.is_read).length;
        setUnreadNotificationsCount(unread);
      } else {
        setNotifications([]);
        setUnreadNotificationsCount(0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      if (!hasClearedDemo) {
        const demo = getDemoLuxuryNotifications();
        setNotifications(demo);
        setUnreadNotificationsCount(demo.filter((n) => !n.is_read).length);
      }
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [user?.id, hasClearedDemo]);

  const markNotificationRead = useCallback(
    async (id: string): Promise<{ success: boolean; error?: any }> => {
      // Optimistic local update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));

      if (id.startsWith('demo-')) {
        return { success: true };
      }

      try {
        const res = await apiMarkNotificationAsRead(id);
        return res;
      } catch (err) {
        console.error('Error marking notification as read:', err);
        return { success: false, error: err };
      }
    },
    []
  );

  const markAllNotificationsRead = useCallback(async (): Promise<{ success: boolean; error?: any }> => {
    // Optimistic local update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadNotificationsCount(0);

    if (!user?.id) {
      return { success: true };
    }

    try {
      const res = await apiMarkAllNotificationsAsRead(user.id);
      return res;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return { success: false, error: err };
    }
  }, [user?.id]);

  const deleteNotification = useCallback(
    async (id: string): Promise<{ success: boolean; error?: any }> => {
      // Optimistic removal
      setNotifications((prev) => {
        const target = prev.find((n) => n.id === id);
        if (target && !target.is_read) {
          setUnreadNotificationsCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });

      if (id.startsWith('demo-')) {
        return { success: true };
      }

      try {
        const res = await apiDeleteNotification(id);
        return res;
      } catch (err) {
        console.error('Error deleting notification:', err);
        return { success: false, error: err };
      }
    },
    []
  );

  const clearAllNotifications = useCallback(async (): Promise<{ success: boolean; error?: any }> => {
    setNotifications([]);
    setUnreadNotificationsCount(0);
    setHasClearedDemo(true);

    if (!user?.id) {
      return { success: true };
    }

    try {
      const res = await apiClearAllNotifications(user.id);
      return res;
    } catch (err) {
      console.error('Error clearing all notifications:', err);
      return { success: false, error: err };
    }
  }, [user?.id]);

  const restoreDemoNotifications = useCallback(() => {
    setHasClearedDemo(false);
    const demo = getDemoLuxuryNotifications();
    setNotifications(demo);
    setUnreadNotificationsCount(demo.filter((n) => !n.is_read).length);
  }, []);

  const dismissBanner = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setBannerVisible(false);
  }, []);

  const showInAppBanner = useCallback((params: BannerParams) => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    setBannerData(params);
    setBannerVisible(true);

    dismissTimerRef.current = setTimeout(() => {
      setBannerVisible(false);
    }, 4000);
  }, []);

  useEffect(() => {
    refreshCounts();
    refreshNotifications();

    if (!user?.id) {
      return;
    }

    registerForPushNotifications(user.id);

    const unsubConversations = subscribeToUserConversations(user.id, () => {
      refreshCounts();
    });

    const unsubMessages = subscribeToUserUnreadMessages(user.id, async (payload) => {
      await refreshCounts();

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
          badgeText: 'Reply',
          onPress: () => {
            router.push('/(tabs)/messages');
          },
        });
      }
    });

    const unsubNotifications = subscribeToUserNotifications(user.id, async (notification: AppNotification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadNotificationsCount((prev) => prev + 1);

      let propertyTitle: string | undefined =
        notification.property?.title ||
        notification.data?.property_title ||
        notification.data?.propertyTitle;

      if (!propertyTitle && notification.property_id) {
        try {
          const { data: prop } = await supabase
            .from('properties')
            .select('title')
            .eq('id', notification.property_id)
            .maybeSingle();
          if (prop?.title) {
            propertyTitle = prop.title;
          }
        } catch (err) {
          // Ignore lookup error
        }
      }

      let iconName = 'notifications';
      let iconColor = '#0284c7';
      let iconBg = '#f0f9ff';
      let badgeText = 'Notice';

      switch (notification.type) {
        case 'NEW_MATCH':
          iconName = 'sparkles';
          iconColor = '#059669';
          iconBg = '#ecfdf5';
          badgeText = 'Match';
          break;
        case 'PRICE_DROP':
          iconName = 'trending-down';
          iconColor = '#e11d48';
          iconBg = '#fff1f2';
          badgeText = 'Price Drop';
          break;
        case 'TOUR_REQUEST':
          iconName = 'calendar';
          iconColor = '#d97706';
          iconBg = '#fef3c7';
          badgeText = 'Tour';
          break;
        case 'MESSAGE':
          iconName = 'chatbubble-ellipses';
          iconColor = '#2563eb';
          iconBg = '#eff6ff';
          badgeText = 'Message';
          break;
        case 'SYSTEM':
        default:
          iconName = 'notifications';
          iconColor = '#475569';
          iconBg = '#f1f5f9';
          badgeText = 'Notice';
          break;
      }

      const handlePress = () => {
        if (notification.property_id) {
          router.push(`/property/${notification.property_id}` as any);
        } else if (notification.type === 'MESSAGE') {
          router.push('/(tabs)/messages' as any);
        } else if (notification.type === 'TOUR_REQUEST') {
          router.push('/(tabs)/enquiries' as any);
        } else if (notification.saved_search_id) {
          router.push('/(tabs)/saved' as any);
        } else {
          router.push('/(tabs)' as any);
        }
      };

      showInAppBanner({
        title: notification.title || 'New Notification',
        body: notification.body || '',
        propertyTitle,
        iconName,
        iconColor,
        iconBg,
        badgeText,
        onPress: handlePress,
      });
    });

    return () => {
      unsubConversations();
      unsubMessages();
      unsubNotifications();
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [user?.id, refreshCounts, refreshNotifications, showInAppBanner, router]);

  return (
    <NotificationContext.Provider
      value={{
        unreadMessagesCount,
        unreadNotificationsCount,
        totalUnreadCount,
        notifications,
        isLoadingNotifications,
        refreshCounts,
        refreshNotifications,
        showInAppBanner,
        bannerData,
        bannerVisible,
        dismissBanner,
        markNotificationRead,
        markNotificationAsRead: markNotificationRead,
        markAllNotificationsRead,
        markAllNotificationsAsRead: markAllNotificationsRead,
        deleteNotification,
        clearAllNotifications,
        restoreDemoNotifications,
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
