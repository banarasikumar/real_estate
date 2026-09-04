import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getUserEnquiries } from '@repo/api';

interface EnquiryItem {
  id: string;
  property_id: string;
  user_id?: string;
  owner_id?: string;
  message: string;
  status: 'NEW' | 'READ' | 'RESPONDED' | 'CLOSED';
  created_at: string;
  properties?: {
    id: string;
    title: string;
    price: number;
    address?: string | null;
    property_media?: { url: string }[];
  } | null;
}

const MOCK_ENQUIRIES: EnquiryItem[] = [
  {
    id: 'enq-1',
    property_id: '1',
    message: 'Hello, I am interested in scheduling a private tour this Saturday afternoon around 2 PM. Is the property still available?',
    status: 'RESPONDED',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    properties: {
      id: '1',
      title: 'Modern Luxury Penthouse with City Views',
      price: 850000,
      address: '1420 Ocean Avenue, Miami, FL',
      property_media: [{ url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750' }],
    },
  },
  {
    id: 'enq-2',
    property_id: '2',
    message: 'Can you provide the floor plan and details on HOA fees? Also, is covered parking included?',
    status: 'READ',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    properties: {
      id: '2',
      title: 'Minimalist Contemporary Villa',
      price: 1250000,
      address: '742 Evergreen Terrace, Austin, TX',
      property_media: [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9' }],
    },
  },
  {
    id: 'enq-3',
    property_id: '3',
    message: 'Looking for a 12-month lease starting next month. Would you consider pets (small dog)?',
    status: 'NEW',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    properties: {
      id: '3',
      title: 'Charming Victorian Loft',
      price: 3400,
      address: '88 Franklin St, New York, NY',
      property_media: [{ url: 'https://images.unsplash.com/photo-1502672260266-1c1cd2cb3668' }],
    },
  },
  {
    id: 'enq-4',
    property_id: '4',
    message: 'Thank you for the quick tour! We are preparing our official offer with our broker.',
    status: 'CLOSED',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    properties: {
      id: '4',
      title: 'Scandinavian Studio in Downtown',
      price: 495000,
      address: '310 Pine St, Seattle, WA',
      property_media: [{ url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267' }],
    },
  },
];

type FilterTab = 'ALL' | 'NEW' | 'READ' | 'RESPONDED' | 'CLOSED';

export default function EnquiriesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterTab>('ALL');

  const fetchEnquiries = useCallback(async () => {
    try {
      if (user?.email || user?.id) {
        const res = await getUserEnquiries(user.email || user.id);
        const data = Array.isArray(res) ? res : res?.data;
        if (data && data.length > 0) {
          setEnquiries(data as EnquiryItem[]);
          return;
        }
      }
      setEnquiries(MOCK_ENQUIRIES);
    } catch (error) {
      setEnquiries(MOCK_ENQUIRIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEnquiries();
  };

  const getStatusBadge = (status: EnquiryItem['status']) => {
    switch (status) {
      case 'NEW':
        return {
          label: 'Submitted',
          bg: '#eff6ff',
          text: '#2563eb',
          border: '#bfdbfe',
          icon: 'paper-plane-outline' as const,
        };
      case 'READ':
        return {
          label: 'Agent Viewed',
          bg: '#fefce8',
          text: '#ca8a04',
          border: '#fef08a',
          icon: 'eye-outline' as const,
        };
      case 'RESPONDED':
        return {
          label: 'Responded',
          bg: '#ecfdf5',
          text: '#059669',
          border: '#a7f3d0',
          icon: 'checkmark-circle-outline' as const,
        };
      case 'CLOSED':
        return {
          label: 'Completed',
          bg: '#f1f5f9',
          text: '#64748b',
          border: '#e2e8f0',
          icon: 'archive-outline' as const,
        };
      default:
        return {
          label: status,
          bg: '#f1f5f9',
          text: '#64748b',
          border: '#e2e8f0',
          icon: 'information-circle-outline' as const,
        };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const filteredEnquiries = enquiries.filter((item) => {
    if (selectedFilter === 'ALL') return true;
    return item.status === selectedFilter;
  });

  const filterCounts = {
    ALL: enquiries.length,
    NEW: enquiries.filter((e) => e.status === 'NEW').length,
    READ: enquiries.filter((e) => e.status === 'READ').length,
    RESPONDED: enquiries.filter((e) => e.status === 'RESPONDED').length,
    CLOSED: enquiries.filter((e) => e.status === 'CLOSED').length,
  };

  const renderEnquiryCard = ({ item }: { item: EnquiryItem }) => {
    const badge = getStatusBadge(item.status);
    const propertyTitle = item.properties?.title || 'Selected Property';
    const propertyAddress = item.properties?.address || 'Location on request';
    const propertyPrice = item.properties?.price
      ? `$${item.properties.price.toLocaleString()}`
      : 'Price on request';
    const imageUrl =
      item.properties?.property_media?.[0]?.url ||
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.propertyHeader}
          activeOpacity={0.7}
          onPress={() => router.push(`/property/${item.property_id}`)}
        >
          <Image source={{ uri: imageUrl }} style={styles.propertyThumb} />
          <View style={styles.propertyHeaderInfo}>
            <Text style={styles.propertyTitle} numberOfLines={1}>
              {propertyTitle}
            </Text>
            <Text style={styles.propertyAddress} numberOfLines={1}>
              {propertyAddress}
            </Text>
            <Text style={styles.propertyPrice}>{propertyPrice}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        <View style={styles.cardDivider} />

        <View style={styles.messageSection}>
          <View style={styles.messageHeaderRow}>
            <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Ionicons name={badge.icon} size={13} color={badge.text} style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>

          <View style={styles.quoteBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#94a3b8" style={styles.quoteIcon} />
            <Text style={styles.messageBody}>{item.message}</Text>
          </View>

          {item.status === 'RESPONDED' && (
            <View style={styles.responseNotice}>
              <Ionicons name="notifications-outline" size={15} color="#059669" style={{ marginRight: 6 }} />
              <Text style={styles.responseNoticeText}>Agent sent a reply in your Messages tab.</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.viewPropButton}
            onPress={() => router.push(`/property/${item.property_id}`)}
          >
            <Text style={styles.viewPropText}>View Property</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => router.push('/(tabs)/messages')}
          >
            <Ionicons name="chatbubble-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.chatButtonText}>Message Agent</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFilterChip = (key: FilterTab, label: string) => {
    const isSelected = selectedFilter === key;
    const count = filterCounts[key];
    return (
      <TouchableOpacity
        key={key}
        style={[styles.filterChip, isSelected && styles.filterChipActive]}
        onPress={() => setSelectedFilter(key)}
      >
        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.chipCountBadge, isSelected && styles.chipCountBadgeActive]}>
            <Text style={[styles.chipCountText, isSelected && styles.chipCountTextActive]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e11d48" />
        <Text style={styles.loadingText}>Loading your enquiries...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { key: 'ALL' as FilterTab, label: 'All' },
            { key: 'NEW' as FilterTab, label: 'Submitted' },
            { key: 'READ' as FilterTab, label: 'Viewed' },
            { key: 'RESPONDED' as FilterTab, label: 'Responded' },
            { key: 'CLOSED' as FilterTab, label: 'Completed' },
          ]}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => renderFilterChip(item.key, item.label)}
          contentContainerStyle={styles.filterListContent}
        />
      </View>

      <FlatList
        data={filteredEnquiries}
        keyExtractor={(item) => item.id}
        renderItem={renderEnquiryCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e11d48']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="home-outline" size={40} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No Enquiries Found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter === 'ALL'
                ? "You haven't submitted any property enquiries yet. Browse homes to connect with verified agents!"
                : `You don't have any enquiries with '${selectedFilter.toLowerCase()}' status.`}
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.browseButtonText}>Explore Homes</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  filterBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
  },
  filterListContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#e11d48',
  },
  chipCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  chipCountBadgeActive: {
    backgroundColor: '#e11d48',
  },
  chipCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  chipCountTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    overflow: 'hidden',
  },
  propertyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  propertyThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  propertyHeaderInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  propertyAddress: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e11d48',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  messageSection: {
    padding: 14,
  },
  messageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  quoteBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e11d48',
    flexDirection: 'row',
  },
  quoteIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  messageBody: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  responseNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  responseNoticeText: {
    fontSize: 12,
    color: '#047857',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    padding: 12,
    gap: 10,
    backgroundColor: '#fafbfc',
  },
  viewPropButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  viewPropText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  chatButton: {
    flex: 1.2,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e11d48',
  },
  chatButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
