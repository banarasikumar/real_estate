import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import {
  useAuth,
  supabase,
  getUnreadMessageCount,
  getOwnerUnreadEnquiryCount,
  subscribeToUserConversations,
  subscribeToUserUnreadMessages,
  subscribeToOwnerEnquiries,
  updateUserPushToken,
} from '@repo/api';

export interface InAppBannerData {
  id: string;
  title: string;
  body: string;
  propertyTitle?: string;
  avatarUrl?: string;
  onPress?: () => void;
}

export interface ShowInAppBannerParams {
  title: string;
  body: string;
  propertyTitle?: string;
  avatarUrl?: string;
  onPress?: () => void;
}

export interface NotificationContextType {
  unreadEnquiriesCount: number;
  unreadMessagesCount: number;
  totalUnreadCount: number;
  refreshCounts: () => Promise<void>;
  showInAppBanner: (params: ShowInAppBannerParams) => void;
  currentBanner: InAppBannerData | null;
  dismissBanner: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();
  const ownerId = session?.user?.id;

  const [unreadEnquiriesCount, setUnreadEnquiriesCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [currentBanner, setCurrentBanner] = useState<InAppBannerData | null>(null);

  const ownerIdRef = useRef<string | undefined>(ownerId);
  ownerIdRef.current = ownerId;

  // Refresh counts from server
  const refreshCounts = useCallback(async () => {
    const currentId = ownerIdRef.current;
    if (!currentId) {
      setUnreadEnquiriesCount(0);
      setUnreadMessagesCount(0);
      return;
    }

    try {
      const [messagesCount, enquiriesCount] = await Promise.all([
        getUnreadMessageCount(currentId),
        getOwnerUnreadEnquiryCount(currentId),
      ]);

      setUnreadMessagesCount(messagesCount || 0);
      setUnreadEnquiriesCount(enquiriesCount || 0);
    } catch (err) {
      console.error('Error refreshing notification counts:', err);
    }
  }, []);

  const showInAppBanner = useCallback((params: ShowInAppBannerParams) => {
    setCurrentBanner({
      id: `banner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: params.title,
      body: params.body,
      propertyTitle: params.propertyTitle,
      avatarUrl: params.avatarUrl,
      onPress: params.onPress,
    });
  }, []);

  const dismissBanner = useCallback(() => {
    setCurrentBanner(null);
  }, []);

  // Graceful Push Token Registration (safe for web, simulator, or if expo-notifications is absent)
  useEffect(() => {
    if (!ownerId || Platform.OS === 'web') return;

    let isMounted = true;
    const registerPush = async () => {
      try {
        let Notifications: any = null;
        try {
          // Dynamic require so build succeeds even if package is optional
          Notifications = require('expo-notifications');
        } catch {
          // Package not installed
          return;
        }

        if (!Notifications || typeof Notifications.getPermissionsAsync !== 'function') {
          return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted' && typeof Notifications.requestPermissionsAsync === 'function') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          return;
        }

        if (typeof Notifications.getExpoPushTokenAsync === 'function') {
          const tokenData = await Notifications.getExpoPushTokenAsync();
          const token = tokenData?.data;
          if (token && isMounted && ownerId) {
            await updateUserPushToken(ownerId, token);
          }
        }
      } catch (e) {
        console.log('Push notification registration safely skipped:', e);
      }
    };

    registerPush();

    return () => {
      isMounted = false;
    };
  }, [ownerId]);

  // Realtime listeners for unread tracking and banners
  useEffect(() => {
    if (!ownerId) {
      setUnreadEnquiriesCount(0);
      setUnreadMessagesCount(0);
      setCurrentBanner(null);
      return;
    }

    refreshCounts();

    // 1. Subscribe to conversations changes
    const unsubConversations = subscribeToUserConversations(ownerId, () => {
      refreshCounts();
    });

    // 2. Subscribe to user unread messages
    const unsubMessages = subscribeToUserUnreadMessages(ownerId, async (payload: any) => {
      refreshCounts();

      const newMsg = payload?.new;
      // Only banner when a message is inserted from another user (not owner)
      if (newMsg && newMsg.sender_id && newMsg.sender_id !== ownerId) {
        let senderName = 'Prospective Buyer';
        let propertyTitle: string | undefined;
        let avatarUrl: string | undefined;

        if (newMsg.conversation_id) {
          try {
            const { data: conv } = await supabase
              .from('conversations')
              .select('properties(title), buyer:profiles!buyer_id(full_name, avatar_url)')
              .eq('id', newMsg.conversation_id)
              .maybeSingle();

            if (conv) {
              const buyer = conv.buyer as { full_name?: string; avatar_url?: string } | null;
              const prop = conv.properties as { title?: string } | null;
              if (buyer?.full_name) senderName = buyer.full_name;
              if (buyer?.avatar_url) avatarUrl = buyer.avatar_url;
              if (prop?.title) propertyTitle = prop.title;
            }
          } catch (e) {
            console.warn('Could not fetch message sender details for banner:', e);
          }
        }

        showInAppBanner({
          title: senderName,
          body: newMsg.text || 'Sent you a message',
          propertyTitle: propertyTitle ? `Lead for: ${propertyTitle}` : undefined,
          avatarUrl,
          onPress: () => {
            try {
              router.push('/(tabs)/enquiries' as any);
            } catch (err) {
              console.error('Error navigating to enquiries:', err);
            }
          },
        });
      }
    });

    // 3. Subscribe to owner enquiries
    const unsubEnquiries = subscribeToOwnerEnquiries(ownerId, (newEnquiry: any) => {
      refreshCounts();

      if (newEnquiry && newEnquiry.status === 'NEW') {
        const leadName = newEnquiry.name || 'New Property Lead';
        const snippet = newEnquiry.message || 'You received a new inquiry on your property';

        showInAppBanner({
          title: leadName,
          body: snippet,
          propertyTitle: 'Listing Inquiry',
          onPress: () => {
            try {
              router.push('/(tabs)/enquiries' as any);
            } catch (err) {
              console.error('Error navigating to enquiries:', err);
            }
          },
        });
      }
    });

    return () => {
      unsubConversations();
      unsubMessages();
      unsubEnquiries();
    };
  }, [ownerId, refreshCounts, showInAppBanner, router]);

  const totalUnreadCount = unreadEnquiriesCount + unreadMessagesCount;

  return (
    <NotificationContext.Provider
      value={{
        unreadEnquiriesCount,
        unreadMessagesCount,
        totalUnreadCount,
        refreshCounts,
        showInAppBanner,
        currentBanner,
        dismissBanner,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextType {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
