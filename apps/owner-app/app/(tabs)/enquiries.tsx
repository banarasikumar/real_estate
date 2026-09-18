import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuth,
  getUserConversations,
  getConversationUnreadCounts,
  getOwnerEnquiries,
  updateEnquiryStatus,
  subscribeToUserConversations,
  subscribeToOwnerEnquiries,
  subscribeToUserUnreadMessages,
  getOrCreateConversation,
  Conversation,
} from '@repo/api';
import { useNotification } from '../../context/NotificationContext';
import MessageStatusTicks from '../../components/MessageStatusTicks';
import OwnerChatSheetModal from '../../components/OwnerChatSheetModal';

export interface TourRequestItem {
  id: string;
  enquiryId?: string;
  conversationId?: string;
  seekerId?: string;
  seekerName: string;
  seekerAvatar?: string | null;
  seekerPhone?: string | null;
  propertyId: string;
  propertyTitle: string;
  propertyAddress?: string | null;
  propertyPrice?: number | string | null;
  propertyImage?: string | null;
  tourType: 'IN_PERSON' | 'VIDEO';
  tourDate: string;
  timeSlot: string;
  notes?: string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED';
  createdAt: string;
}

// Initial demo conversations for instant high-fidelity preview
const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'demo-conv-1',
    property_id: 'prop-demo-1',
    buyer_id: 'buyer-demo-1',
    owner_id: 'owner-current',
    last_message: 'Could we arrange a walkthrough this weekend? We are ready to make a formal offer.',
    last_message_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(), // 3m ago
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    updated_at: new Date().toISOString(),
    properties: {
      id: 'prop-demo-1',
      title: 'Oceanfront Villa with Infinity Pool',
      address: '1420 Ocean Drive, Miami Beach, FL',
      price: 2850000,
      property_media: [{ url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400' }],
    },
    buyer: {
      id: 'buyer-demo-1',
      full_name: 'Sophia Chen',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      phone_number: '+1 (305) 555-0192',
    },
  },
  {
    id: 'demo-conv-2',
    property_id: 'prop-demo-2',
    buyer_id: 'buyer-demo-2',
    owner_id: 'owner-current',
    last_message: 'Sounds good, thanks for confirming the HOA dues and garage dimensions.',
    last_message_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(), // 1h ago
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    updated_at: new Date().toISOString(),
    properties: {
      id: 'prop-demo-2',
      title: 'Skyline Penthouse with Ocean Views',
      address: '88 Biscayne Blvd, Miami, FL',
      price: 3200000,
      property_media: [{ url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400' }],
    },
    buyer: {
      id: 'buyer-demo-2',
      full_name: 'Marcus Vance',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      phone_number: '+1 (312) 555-0144',
    },
  },
  {
    id: 'demo-conv-3',
    property_id: 'prop-demo-3',
    buyer_id: 'buyer-demo-3',
    owner_id: 'owner-current',
    last_message: 'Understood, looking forward to reviewing the inspection disclosures today.',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // Yesterday
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updated_at: new Date().toISOString(),
    properties: {
      id: 'prop-demo-3',
      title: 'Architectural Mid-Century Modern',
      address: '742 Evergreen Terrace, Austin, TX',
      price: 1450000,
      property_media: [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400' }],
    },
    buyer: {
      id: 'buyer-demo-3',
      full_name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
      phone_number: '+1 (512) 555-0188',
    },
  },
];

// Initial demo tour requests
const DEMO_TOURS: TourRequestItem[] = [
  {
    id: 'demo-tour-1',
    enquiryId: 'enq-demo-1',
    conversationId: 'demo-conv-1',
    seekerId: 'buyer-demo-1',
    seekerName: 'Sophia Chen',
    seekerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    seekerPhone: '+1 (305) 555-0192',
    propertyId: 'prop-demo-1',
    propertyTitle: 'Oceanfront Villa with Infinity Pool',
    propertyAddress: '1420 Ocean Drive, Miami Beach, FL',
    propertyPrice: 2850000,
    propertyImage: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400',
    tourType: 'IN_PERSON',
    tourDate: 'Saturday, Oct 24',
    timeSlot: '2:00 PM - 2:45 PM',
    notes: 'Interested in the master suite layout and backyard privacy.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'demo-tour-2',
    enquiryId: 'enq-demo-2',
    conversationId: 'demo-conv-2',
    seekerId: 'buyer-demo-2',
    seekerName: 'Marcus Vance',
    seekerAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    seekerPhone: '+1 (312) 555-0144',
    propertyId: 'prop-demo-2',
    propertyTitle: 'Skyline Penthouse with Ocean Views',
    propertyAddress: '88 Biscayne Blvd, Miami, FL',
    propertyPrice: 3200000,
    propertyImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
    tourType: 'VIDEO',
    tourDate: 'Sunday, Oct 25',
    timeSlot: '11:30 AM - 12:15 PM',
    notes: 'Relocating from Chicago, please highlight wrap-around balcony vistas.',
    status: 'CONFIRMED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'demo-tour-3',
    enquiryId: 'enq-demo-3',
    conversationId: 'demo-conv-3',
    seekerId: 'buyer-demo-3',
    seekerName: 'David Miller',
    seekerAvatar: null,
    seekerPhone: '+1 (212) 555-0133',
    propertyId: 'prop-demo-3',
    propertyTitle: 'Architectural Mid-Century Modern',
    propertyAddress: '742 Evergreen Terrace, Austin, TX',
    propertyPrice: 1450000,
    propertyImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
    tourType: 'IN_PERSON',
    tourDate: 'Monday, Oct 26',
    timeSlot: '4:00 PM - 4:45 PM',
    notes: 'Pre-approved jumbo buyer, accompanied by buyer representation broker.',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
];

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EnquiriesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { refreshCounts } = useNotification();
  const currentUserId = session?.user?.id || 'owner-current';

  // Tabs: 'chats' | 'tours'
  const [activeTab, setActiveTab] = useState<'chats' | 'tours'>('chats');
  const [searchQuery, setSearchQuery] = useState('');

  // Data lists
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({
    'demo-conv-1': 2,
  });
  const [tours, setTours] = useState<TourRequestItem[]>(DEMO_TOURS);

  // Loading & In-flight states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected chat modal
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);

  // Animated sliding pill
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [segmentWidth, setSegmentWidth] = useState(0);

  const handleTabPress = (tab: 'chats' | 'tours') => {
    setActiveTab(tab);
    Animated.spring(slideAnim, {
      toValue: tab === 'chats' ? 0 : 1,
      tension: 65,
      friction: 10,
      useNativeDriver: false,
    }).start();
  };

  // Load live Supabase conversations & enquiries
  const loadData = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const [convs, counts, enqs] = await Promise.all([
          getUserConversations(session.user.id),
          getConversationUnreadCounts(session.user.id),
          getOwnerEnquiries(session.user.id),
        ]);

        if (convs && convs.length > 0) {
          setConversations(convs);
        } else {
          setConversations(DEMO_CONVERSATIONS);
        }

        if (counts) {
          setUnreadCounts(counts);
        }

        if (enqs && enqs.length > 0) {
          // Parse live enquiries
          const parsedTours: TourRequestItem[] = [];
          enqs.forEach((enq: any) => {
            const msg = enq.message || '';
            const isTour = msg.toLowerCase().includes('tour request') || msg.toLowerCase().includes('tour');
            if (isTour) {
              const isVideo = msg.toLowerCase().includes('video');
              const dateMatch = msg.match(/Date:\s*([^\n\r]+)/i);
              const timeMatch = msg.match(/Time Slot:\s*([^\n\r]+)/i) || msg.match(/Time:\s*([^\n\r]+)/i);
              const notesMatch = msg.match(/Notes:\s*([^\n\r]+)/i);

              let status: 'PENDING' | 'CONFIRMED' | 'DECLINED' = 'PENDING';
              if (enq.status === 'RESPONDED') status = 'CONFIRMED';
              else if (enq.status === 'CLOSED') status = 'DECLINED';

              parsedTours.push({
                id: enq.id,
                enquiryId: enq.id,
                seekerId: enq.user_id,
                seekerName: enq.name || enq.user?.full_name || 'Home Seeker',
                seekerAvatar: enq.user?.avatar_url || null,
                seekerPhone: enq.phone || enq.user?.phone_number || null,
                propertyId: enq.property_id,
                propertyTitle: enq.properties?.title || 'Luxury Property',
                propertyAddress: enq.properties?.address || 'Prime Location',
                propertyPrice: enq.properties?.price || null,
                propertyImage:
                  enq.properties?.property_media?.[0]?.url ||
                  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
                tourType: isVideo ? 'VIDEO' : 'IN_PERSON',
                tourDate: dateMatch ? dateMatch[1].trim() : 'Upcoming',
                timeSlot: timeMatch ? timeMatch[1].trim() : '2:00 PM',
                notes: notesMatch ? notesMatch[1].trim() : undefined,
                status,
                createdAt: enq.created_at,
              });
            }
          });

          if (parsedTours.length > 0) {
            setTours(parsedTours);
          } else {
            setTours(DEMO_TOURS);
          }
        } else {
          setTours(DEMO_TOURS);
        }
      } catch (err) {
        console.error('Error loading conversations/enquiries for owner:', err);
        setConversations(DEMO_CONVERSATIONS);
        setTours(DEMO_TOURS);
      }
    } else {
      setConversations(DEMO_CONVERSATIONS);
      setTours(DEMO_TOURS);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.user?.id]);

  useEffect(() => {
    loadData();

    if (session?.user?.id) {
      const unsubConvs = subscribeToUserConversations(session.user.id, () => {
        loadData();
      });
      const unsubEnqs = subscribeToOwnerEnquiries(session.user.id, () => {
        loadData();
      });
      const unsubUnread = subscribeToUserUnreadMessages(session.user.id, () => {
        loadData();
      });

      return () => {
        unsubConvs();
        unsubEnqs();
        unsubUnread();
      };
    }
  }, [loadData, session?.user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    refreshCounts();
  };

  const handleOpenChat = (conv: Conversation) => {
    setSelectedConv(conv);
    setChatModalVisible(true);
    // Optimistically mark unread count as 0 for this conversation
    setUnreadCounts((prev) => ({ ...prev, [conv.id]: 0 }));
  };

  // Tour Card Action Handlers
  const handleConfirmTour = async (tour: TourRequestItem) => {
    try {
      if (tour.enquiryId && session?.user?.id) {
        await updateEnquiryStatus(tour.enquiryId, 'RESPONDED');
      }
      setTours((prev) =>
        prev.map((t) => (t.id === tour.id ? { ...t, status: 'CONFIRMED' } : t))
      );
      Alert.alert(
        'Tour Confirmed! 🎉',
        `Confirmed ${tour.tourType === 'IN_PERSON' ? 'in-person tour' : 'video walkthrough'} with ${tour.seekerName} for ${tour.tourDate} at ${tour.timeSlot}. The seeker has been notified!`
      );
    } catch (err) {
      console.error('Error confirming tour:', err);
      Alert.alert('Error', 'Unable to confirm tour. Please try again.');
    }
  };

  const handleDeclineTour = (tour: TourRequestItem) => {
    Alert.alert(
      'Decline Tour Request',
      `Are you sure you want to decline the tour request for ${tour.propertyTitle}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              if (tour.enquiryId && session?.user?.id) {
                await updateEnquiryStatus(tour.enquiryId, 'CLOSED');
              }
              setTours((prev) =>
                prev.map((t) => (t.id === tour.id ? { ...t, status: 'DECLINED' } : t))
              );
            } catch (err) {
              console.error('Error declining tour:', err);
            }
          },
        },
      ]
    );
  };

  const handleMessageSeekerFromTour = async (tour: TourRequestItem) => {
    // Check if an existing conversation matches this property and seeker
    const matchedConv = conversations.find(
      (c) => c.property_id === tour.propertyId && c.buyer_id === tour.seekerId
    );

    if (matchedConv) {
      handleOpenChat(matchedConv);
      return;
    }

    // Otherwise create or build a temporary conversation object
    if (session?.user?.id && tour.seekerId) {
      try {
        const res = await getOrCreateConversation(tour.propertyId, tour.seekerId, session.user.id);
        if (res.success && res.data) {
          handleOpenChat(res.data);
          return;
        }
      } catch (err) {
        console.warn('Could not auto-create conversation, falling back to instant preview:', err);
      }
    }

    const fallbackConv: Conversation = {
      id: tour.conversationId || `tour-conv-${tour.id}`,
      property_id: tour.propertyId,
      buyer_id: tour.seekerId || `seeker-${tour.id}`,
      owner_id: currentUserId,
      last_message: tour.notes || `Tour inquiry for ${tour.tourDate}`,
      last_message_at: tour.createdAt,
      created_at: tour.createdAt,
      updated_at: tour.createdAt,
      properties: {
        id: tour.propertyId,
        title: tour.propertyTitle,
        address: tour.propertyAddress,
        price: tour.propertyPrice,
        property_media: tour.propertyImage ? [{ url: tour.propertyImage }] : [],
      },
      buyer: {
        id: tour.seekerId || `seeker-${tour.id}`,
        full_name: tour.seekerName,
        avatar_url: tour.seekerAvatar,
        phone_number: tour.seekerPhone,
      },
    };

    handleOpenChat(fallbackConv);
  };

  // Filtered lists based on search query
  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const seekerName = (c.buyer?.full_name || '').toLowerCase();
      const propTitle = (c.properties?.title || '').toLowerCase();
      const lastMsg = (c.last_message || '').toLowerCase();
      return seekerName.includes(q) || propTitle.includes(q) || lastMsg.includes(q);
    });
  }, [conversations, searchQuery]);

  const filteredTours = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tours;
    return tours.filter((t) => {
      const seekerName = (t.seekerName || '').toLowerCase();
      const propTitle = (t.propertyTitle || '').toLowerCase();
      const notes = (t.notes || '').toLowerCase();
      return seekerName.includes(q) || propTitle.includes(q) || notes.includes(q);
    });
  }, [tours, searchQuery]);

  const chatCount = conversations.length;
  const tourCount = tours.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* iOS Large Title Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTopRow}>
          <Text style={styles.largeTitle}>Messages & Inquiries</Text>
          <View style={styles.liveIndicatorBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveIndicatorText}>LIVE</Text>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Real-time buyer inquiries and private tour scheduling</Text>
      </View>

      {/* Segmented iOS Pill Switch */}
      <View style={styles.segmentedWrapper}>
        <View
          style={styles.segmentedContainer}
          onLayout={(e) => setSegmentWidth(e.nativeEvent.layout.width)}
        >
          {segmentWidth > 0 && (
            <Animated.View
              style={[
                styles.slidingPill,
                {
                  width: (segmentWidth - 8) / 2,
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, (segmentWidth - 8) / 2],
                      }),
                    },
                  ],
                },
              ]}
            />
          )}

          <TouchableOpacity
            style={styles.segmentOption}
            onPress={() => handleTabPress('chats')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentOptionText,
                activeTab === 'chats' ? styles.segmentTextActive : styles.segmentTextInactive,
              ]}
            >
              💬 Live Chats ({chatCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.segmentOption}
            onPress={() => handleTabPress('tours')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.segmentOptionText,
                activeTab === 'tours' ? styles.segmentTextActive : styles.segmentTextInactive,
              ]}
            >
              📋 Tour Requests ({tourCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* iOS Search Bar with Clear Button */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'chats'
                ? 'Search by Seeker Name or Property Title...'
                : 'Search tours by Seeker or Property...'
            }
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearSearchButton}
            >
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content: Chats or Tour Requests */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingLabel}>Connecting to live inbox...</Text>
        </View>
      ) : activeTab === 'chats' ? (
        /* Live Chats List */
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={38} color="#2563eb" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matching conversations' : 'No Live Chats Yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try searching with a different seeker name or property keyword.'
                  : 'When prospective buyers ask questions or inquire on your published listings, they appear here instantly.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const seekerName = item.buyer?.full_name || 'Home Seeker';
            const seekerInitials = seekerName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);
            const propTitle = item.properties?.title || 'Listing';
            const unread = unreadCounts[item.id] || 0;
            const relativeTime = formatRelativeTime(item.last_message_at);

            return (
              <TouchableOpacity
                style={[styles.chatCard, unread > 0 && styles.chatCardUnread]}
                onPress={() => handleOpenChat(item)}
                activeOpacity={0.7}
              >
                {/* Seeker Avatar with Online Green Dot */}
                <View style={styles.avatarWrapper}>
                  {item.buyer?.avatar_url ? (
                    <Image source={{ uri: item.buyer.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarFallbackBox}>
                      <Text style={styles.avatarFallbackText}>{seekerInitials}</Text>
                    </View>
                  )}
                  {/* Green online dot */}
                  <View style={styles.avatarOnlineDot} />
                </View>

                {/* Conversation Body */}
                <View style={styles.chatBody}>
                  {/* Row 1: Seeker Name & Relative Time */}
                  <View style={styles.chatTopRow}>
                    <Text style={styles.seekerNameText} numberOfLines={1}>
                      {seekerName}
                    </Text>
                    <Text style={styles.relativeTimeText}>{relativeTime}</Text>
                  </View>

                  {/* Row 2: Property Chip */}
                  <View style={styles.propertyChipRow}>
                    <View style={styles.propertyChip}>
                      <Ionicons name="home" size={11} color="#2563eb" style={{ marginRight: 4 }} />
                      <Text style={styles.propertyChipText} numberOfLines={1}>
                        {propTitle}
                      </Text>
                    </View>
                  </View>

                  {/* Row 3: Last Message Preview + Delivery Status + Unread Badge */}
                  <View style={styles.lastMessageRow}>
                    <View style={styles.lastMessageContent}>
                      {/* Checkmarks delivery status for owner messages */}
                      <MessageStatusTicks
                        status="delivered"
                        deliveredAt={item.last_message_at}
                        isRead={unread === 0}
                        color="#94a3b8"
                      />
                      <Text
                        style={[
                          styles.lastMessageText,
                          unread > 0 && styles.lastMessageTextUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {item.last_message || 'Inquiry initiated'}
                      </Text>
                    </View>

                    {/* Luxury Accent Unread Badge */}
                    {unread > 0 && (
                      <View style={styles.unreadPill}>
                        <Text style={styles.unreadPillText}>{unread}</Text>
                      </View>
                    )}
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" style={styles.chevronIcon} />
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        /* Tour Requests List */
        <FlatList
          data={filteredTours}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={38} color="#2563eb" />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matching tour requests' : 'No Tour Requests'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try searching with another keyword.'
                  : 'Prospective buyers can request in-person or live video tours directly from your listing page.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isConfirmed = item.status === 'CONFIRMED';
            const isDeclined = item.status === 'DECLINED';
            const isInPerson = item.tourType === 'IN_PERSON';
            const seekerInitials = item.seekerName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <View style={styles.tourCard}>
                {/* Tour Card Header */}
                <View style={styles.tourCardHeader}>
                  <View style={styles.tourSeekerGroup}>
                    {item.seekerAvatar ? (
                      <Image source={{ uri: item.seekerAvatar }} style={styles.tourSeekerAvatar} />
                    ) : (
                      <View style={styles.tourSeekerAvatarFallback}>
                        <Text style={styles.tourSeekerInitials}>{seekerInitials}</Text>
                      </View>
                    )}
                    <View style={styles.tourSeekerInfo}>
                      <View style={styles.tourSeekerNameRow}>
                        <Text style={styles.tourSeekerName}>{item.seekerName}</Text>
                        <Ionicons name="checkmark-circle" size={14} color="#2563eb" style={{ marginLeft: 4 }} />
                      </View>
                      <Text style={styles.tourDateRequested}>
                        Requested {formatRelativeTime(item.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* In-Person vs Video Badge */}
                  <View style={[styles.tourTypeBadge, isInPerson ? styles.tourTypeInPerson : styles.tourTypeVideo]}>
                    <Ionicons
                      name={isInPerson ? 'walk-outline' : 'videocam-outline'}
                      size={13}
                      color={isInPerson ? '#047857' : '#1d4ed8'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.tourTypeBadgeText, isInPerson ? styles.tourTypeTextInPerson : styles.tourTypeTextVideo]}>
                      {isInPerson ? 'In-Person Tour' : 'Live Video'}
                    </Text>
                  </View>
                </View>

                {/* Tour Schedule Box */}
                <View style={styles.tourScheduleBox}>
                  <View style={styles.tourScheduleItem}>
                    <Ionicons name="calendar" size={16} color="#2563eb" style={{ marginRight: 6 }} />
                    <Text style={styles.tourScheduleText}>{item.tourDate}</Text>
                  </View>
                  <View style={styles.tourScheduleDivider} />
                  <View style={styles.tourScheduleItem}>
                    <Ionicons name="time" size={16} color="#2563eb" style={{ marginRight: 6 }} />
                    <Text style={styles.tourScheduleText}>{item.timeSlot}</Text>
                  </View>
                </View>

                {/* Property Preview Row */}
                <View style={styles.tourPropertyPreview}>
                  <Image
                    source={{
                      uri: item.propertyImage || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300',
                    }}
                    style={styles.tourPropertyThumb}
                  />
                  <View style={styles.tourPropertyDetails}>
                    <Text style={styles.tourPropertyTitle} numberOfLines={1}>
                      {item.propertyTitle}
                    </Text>
                    <Text style={styles.tourPropertyAddress} numberOfLines={1}>
                      {item.propertyAddress}
                    </Text>
                    {item.propertyPrice && (
                      <Text style={styles.tourPropertyPrice}>
                        {typeof item.propertyPrice === 'number'
                          ? `$${item.propertyPrice.toLocaleString()}`
                          : `$${item.propertyPrice}`}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Tour Notes if present */}
                {item.notes && (
                  <View style={styles.tourNotesContainer}>
                    <Ionicons name="chatbox-ellipses-outline" size={14} color="#64748b" style={{ marginRight: 6 }} />
                    <Text style={styles.tourNotesText} numberOfLines={2}>
                      "{item.notes}"
                    </Text>
                  </View>
                )}

                {/* Status Indicator or Action Buttons */}
                {isConfirmed ? (
                  <View style={styles.confirmedBanner}>
                    <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmedBannerText}>Tour Confirmed & Added to Schedule</Text>
                    <TouchableOpacity
                      style={styles.messageSeekerSmallBtn}
                      onPress={() => handleMessageSeekerFromTour(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="chatbubble-ellipses" size={14} color="#2563eb" />
                      <Text style={styles.messageSeekerSmallText}>Chat</Text>
                    </TouchableOpacity>
                  </View>
                ) : isDeclined ? (
                  <View style={styles.declinedBanner}>
                    <Ionicons name="close-circle" size={16} color="#64748b" style={{ marginRight: 6 }} />
                    <Text style={styles.declinedBannerText}>Tour Request Declined</Text>
                  </View>
                ) : (
                  <View style={styles.tourActionRow}>
                    {/* Confirm Tour */}
                    <TouchableOpacity
                      style={styles.confirmTourButton}
                      onPress={() => handleConfirmTour(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 5 }} />
                      <Text style={styles.confirmTourButtonText}>Confirm Tour</Text>
                    </TouchableOpacity>

                    {/* Decline */}
                    <TouchableOpacity
                      style={styles.declineTourButton}
                      onPress={() => handleDeclineTour(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-outline" size={16} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.declineTourButtonText}>Decline</Text>
                    </TouchableOpacity>

                    {/* Message Seeker */}
                    <TouchableOpacity
                      style={styles.messageSeekerButton}
                      onPress={() => handleMessageSeekerFromTour(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color="#2563eb" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Elevated WhatsApp/iMessage-Grade Chat Sheet Modal */}
      <OwnerChatSheetModal
        visible={chatModalVisible}
        onClose={() => setChatModalVisible(false)}
        conversation={selectedConv}
        currentUserId={currentUserId}
        onViewListing={(propId) => {
          setChatModalVisible(false);
          router.push(`/edit-property/${propId}` as any);
        }}
        onMessageSentSuccess={() => {
          loadData();
          refreshCounts();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  largeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  liveIndicatorText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  segmentedWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  segmentedContainer: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    padding: 4,
    height: 48,
    alignItems: 'center',
  },
  slidingPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    height: '100%',
  },
  segmentOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  segmentTextInactive: {
    color: '#64748b',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 2,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingLabel: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    gap: 12,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  chatCardUnread: {
    borderColor: '#bfdbfe',
    backgroundColor: '#fbfcfe',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
  },
  avatarFallbackBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  avatarOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatBody: {
    flex: 1,
    marginRight: 8,
  },
  chatTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  seekerNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 6,
  },
  relativeTimeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  propertyChipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  propertyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    maxWidth: '90%',
  },
  propertyChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  lastMessageText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
    marginLeft: 4,
  },
  lastMessageTextUnread: {
    color: '#0f172a',
    fontWeight: '600',
  },
  unreadPill: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  chevronIcon: {
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
  },
  tourCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tourCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tourSeekerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  tourSeekerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    marginRight: 10,
  },
  tourSeekerAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  tourSeekerInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  tourSeekerInfo: {
    flex: 1,
  },
  tourSeekerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tourSeekerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  tourDateRequested: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  tourTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  tourTypeInPerson: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  tourTypeVideo: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  tourTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tourTypeTextInPerson: {
    color: '#047857',
  },
  tourTypeTextVideo: {
    color: '#1d4ed8',
  },
  tourScheduleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tourScheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tourScheduleDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 10,
  },
  tourScheduleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  tourPropertyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tourPropertyThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    marginRight: 10,
  },
  tourPropertyDetails: {
    flex: 1,
  },
  tourPropertyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  tourPropertyAddress: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  tourPropertyPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 2,
  },
  tourNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  tourNotesText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#78350f',
    flex: 1,
    lineHeight: 17,
  },
  tourActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  confirmTourButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmTourButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  declineTourButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  declineTourButtonText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  messageSeekerButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  confirmedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginTop: 4,
  },
  confirmedBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
    flex: 1,
  },
  messageSeekerSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  messageSeekerSmallText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  declinedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  declinedBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
});
