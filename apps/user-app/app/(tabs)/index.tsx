import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPublishedProperties, useAuth, toggleSavedProperty } from '@repo/api';

interface PropertyItem {
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

const FALLBACK_PROPERTIES: PropertyItem[] = [
  {
    id: '1',
    title: 'Modern Luxury Penthouse with City Views',
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
    title: 'Charming Victorian Loft near Park',
    price: 3400,
    prop_type: 'APARTMENT',
    list_type: 'RENT',
    bedrooms: 2,
    bathrooms: 1,
    area_sqft: 1100,
    address: '88 Franklin St, New York, NY',
    property_media: [{ url: 'https://images.unsplash.com/photo-1502672260266-1c1cd2cb3668' }],
  },
  {
    id: '4',
    title: 'Spacious Suburban Family House',
    price: 675000,
    prop_type: 'HOUSE',
    list_type: 'SALE',
    bedrooms: 4,
    bathrooms: 3,
    area_sqft: 2850,
    address: '124 Maple Drive, Denver, CO',
    property_media: [{ url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994' }],
  },
];

const CATEGORIES = ['All', 'Apartment', 'House', 'Villa', 'For Rent'];

export default function ExploreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(['1', '3']));

  const loadProperties = useCallback(async () => {
    try {
      const data = await getPublishedProperties();
      if (data && data.length > 0) {
        setProperties(data as PropertyItem[]);
      } else {
        setProperties(FALLBACK_PROPERTIES);
      }
    } catch (err) {
      console.error('Error fetching published properties:', err);
      setProperties(FALLBACK_PROPERTIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProperties();
  };

  const toggleHeart = async (id: string) => {
    const nextSaved = new Set(savedIds);
    if (nextSaved.has(id)) {
      nextSaved.delete(id);
    } else {
      nextSaved.add(id);
    }
    setSavedIds(nextSaved);

    if (user?.id) {
      try {
        await toggleSavedProperty(user.id, id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredProperties = properties.filter((prop) => {
    const matchesSearch =
      prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prop.address && prop.address.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'For Rent') return prop.list_type === 'RENT';
    if (selectedCategory === 'Apartment') return prop.prop_type === 'APARTMENT';
    if (selectedCategory === 'House') return prop.prop_type === 'HOUSE';
    if (selectedCategory === 'Villa') return prop.prop_type === 'VILLA';
    return true;
  });

  const renderPropertyItem = ({ item }: { item: PropertyItem }) => {
    const isSaved = savedIds.has(item.id);
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
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.image} />
          <View style={styles.badgeRow}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{isRent ? 'For Rent' : 'For Sale'}</Text>
            </View>
            {item.prop_type && (
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{item.prop_type}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.heartButton}
            onPress={() => toggleHeart(item.id)}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={22}
              color={isSaved ? '#e11d48' : '#0f172a'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{priceFormatted}</Text>
          </View>
          <Text style={styles.titleText} numberOfLines={1}>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Airbnb/Zillow Style Search Bar */}
      <View style={styles.headerContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#e11d48" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search city, neighborhood, or address..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills */}
        <View style={styles.categoriesContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item;
              return (
                <TouchableOpacity
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(item)}
                >
                  <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.categoryList}
          />
        </View>
      </View>

      {/* Property List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#e11d48" />
          <Text style={styles.loadingText}>Discovering premium homes...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          renderItem={renderPropertyItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e11d48']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Homes Found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or selecting a different category.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  categoriesContainer: {
    marginTop: 10,
  },
  categoryList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
  },
  badgeRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  heartButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ffffff',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardContent: {
    padding: 16,
  },
  priceRow: {
    marginBottom: 4,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  titleText: {
    fontSize: 16,
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
