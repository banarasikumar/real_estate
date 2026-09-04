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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getSavedProperties, toggleSavedProperty } from '@repo/api';

interface SavedPropertyItem {
  id: string;
  title: string;
  price: number;
  prop_type?: string;
  list_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  area_sqft?: number;
  address?: string;
  property_media?: { url: string }[];
}

const MOCK_SAVED_PROPERTIES: SavedPropertyItem[] = [
  {
    id: '1',
    title: 'Modern Luxury Penthouse with Ocean Views',
    price: 850000,
    prop_type: 'APARTMENT',
    list_type: 'SALE',
    bedrooms: 3,
    bathrooms: 2,
    area_sqft: 2200,
    address: '1420 Ocean Avenue, Miami, FL',
    property_media: [{ url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750' }],
  },
  {
    id: '2',
    title: 'Minimalist Contemporary Hilltop Villa',
    price: 1250000,
    prop_type: 'VILLA',
    list_type: 'SALE',
    bedrooms: 4,
    bathrooms: 4,
    area_sqft: 3800,
    address: '742 Evergreen Terrace, Austin, TX',
    property_media: [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9' }],
  },
  {
    id: '3',
    title: 'Charming Victorian Loft with High Ceilings',
    price: 3400,
    prop_type: 'APARTMENT',
    list_type: 'RENT',
    bedrooms: 2,
    bathrooms: 1,
    area_sqft: 1100,
    address: '88 Franklin St, New York, NY',
    property_media: [{ url: 'https://images.unsplash.com/photo-1502672260266-1c1cd2cb3668' }],
  },
];

type FilterType = 'ALL' | 'SALE' | 'RENT';

export default function SavedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [savedList, setSavedList] = useState<SavedPropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const fetchSaved = useCallback(async () => {
    try {
      if (user?.id) {
        const data = await getSavedProperties(user.id);
        if (data && data.length > 0) {
          setSavedList(data as SavedPropertyItem[]);
          return;
        }
      }
      setSavedList(MOCK_SAVED_PROPERTIES);
    } catch (error) {
      console.error('Error fetching saved properties:', error);
      setSavedList(MOCK_SAVED_PROPERTIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSaved();
  };

  const handleRemoveSaved = async (propertyId: string) => {
    Alert.alert('Remove Saved Property', 'Are you sure you want to remove this home from your favorites?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setSavedList((prev) => prev.filter((p) => p.id !== propertyId));
          if (user?.id) {
            try {
              await toggleSavedProperty(user.id, propertyId);
            } catch (err) {
              console.error(err);
            }
          }
        },
      },
    ]);
  };

  const filteredProperties = savedList.filter((prop) => {
    if (activeFilter === 'ALL') return true;
    return prop.list_type === activeFilter;
  });

  const renderPropertyCard = ({ item }: { item: SavedPropertyItem }) => {
    const imageUrl =
      item.property_media?.[0]?.url ||
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267';
    const isRent = item.list_type === 'RENT';
    const priceFormatted = isRent
      ? `$${item.price?.toLocaleString() || '0'}/mo`
      : `$${item.price?.toLocaleString() || '0'}`;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push(`/property/${item.id}`)}
      >
        {/* Image Container */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
          
          {/* Badge: For Sale / For Rent */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {isRent ? 'For Rent' : 'For Sale'}
            </Text>
          </View>

          {/* Heart Button */}
          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => handleRemoveSaved(item.id)}
          >
            <Ionicons name="heart" size={20} color="#e11d48" />
          </TouchableOpacity>
        </View>

        {/* Info Container */}
        <View style={styles.infoContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{priceFormatted}</Text>
            {item.prop_type && (
              <Text style={styles.propType}>{item.prop_type.replace('_', ' ')}</Text>
            )}
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>

          {item.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}

          {/* Specs / Features */}
          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Ionicons name="bed-outline" size={14} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.specText}>{item.bedrooms || 0} Beds</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons name="water-outline" size={14} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.specText}>{item.bathrooms || 0} Baths</Text>
            </View>
            {item.area_sqft ? (
              <View style={styles.specItem}>
                <Ionicons name="scan-outline" size={14} color="#475569" style={{ marginRight: 4 }} />
                <Text style={styles.specText}>{item.area_sqft.toLocaleString()} sqft</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e11d48" />
        <Text style={styles.loadingText}>Loading saved homes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Row */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
          onPress={() => setActiveFilter('ALL')}
        >
          <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>
            All Saved ({savedList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'SALE' && styles.filterChipActive]}
          onPress={() => setActiveFilter('SALE')}
        >
          <Text style={[styles.filterChipText, activeFilter === 'SALE' && styles.filterChipTextActive]}>
            For Sale
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'RENT' && styles.filterChipActive]}
          onPress={() => setActiveFilter('RENT')}
        >
          <Text style={[styles.filterChipText, activeFilter === 'RENT' && styles.filterChipTextActive]}>
            For Rent
          </Text>
        </TouchableOpacity>
      </View>

      {/* Property List */}
      <FlatList
        data={filteredProperties}
        keyExtractor={(item) => item.id}
        renderItem={renderPropertyCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e11d48']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="heart-outline" size={40} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No Saved Homes</Text>
            <Text style={styles.emptySubtitle}>
              Save homes that catch your eye by tapping the heart icon on any listing.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.browseButtonText}>Explore Available Homes</Text>
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#e11d48',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 210,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ffffff',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  infoContainer: {
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  propType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e11d48',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  specsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    gap: 16,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
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
