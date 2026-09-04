import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, MapType } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  searchProperties,
  getPublishedProperties,
  useAuth,
  toggleSavedProperty,
} from '@repo/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Bottom sheet snap heights
const SNAP_COLLAPSED = 100;
const SNAP_HALF = SCREEN_HEIGHT * 0.45;
const SNAP_EXPANDED = SCREEN_HEIGHT * 0.82;

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
  latitude?: number | null;
  longitude?: number | null;
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
    address: '1420 Ocean Avenue, Miami Beach, FL',
    latitude: 25.7867,
    longitude: -80.1301,
    property_media: [{ url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750' }],
  },
  {
    id: '2',
    title: 'Minimalist Contemporary Bay Villa',
    price: 1250000,
    prop_type: 'VILLA',
    list_type: 'SALE',
    bedrooms: 4,
    bathrooms: 4,
    area_sqft: 3800,
    address: '742 Biscayne Bay Way, Miami, FL',
    latitude: 25.7617,
    longitude: -80.1918,
    property_media: [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9' }],
  },
  {
    id: '3',
    title: 'Charming Coastal Loft near Beach',
    price: 3400,
    prop_type: 'APARTMENT',
    list_type: 'RENT',
    bedrooms: 2,
    bathrooms: 1,
    area_sqft: 1100,
    address: '88 Collins Avenue, Miami Beach, FL',
    latitude: 25.7725,
    longitude: -80.1325,
    property_media: [{ url: 'https://images.unsplash.com/photo-1502672260266-1c1cd2cb3668' }],
  },
  {
    id: '4',
    title: 'Spacious Brickell Family House',
    price: 675000,
    prop_type: 'HOUSE',
    list_type: 'SALE',
    bedrooms: 4,
    bathrooms: 3,
    area_sqft: 2850,
    address: '124 Brickell Ave, Miami, FL',
    latitude: 25.7580,
    longitude: -80.1930,
    property_media: [{ url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994' }],
  },
  {
    id: '5',
    title: 'Sunny South Beach Studio Apartment',
    price: 2200,
    prop_type: 'APARTMENT',
    list_type: 'RENT',
    bedrooms: 1,
    bathrooms: 1,
    area_sqft: 650,
    address: '420 Lincoln Road, Miami Beach, FL',
    latitude: 25.7905,
    longitude: -80.1380,
    property_media: [{ url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267' }],
  },
  {
    id: '6',
    title: 'Waterfront Sunset Villa & Yacht Dock',
    price: 2850000,
    prop_type: 'VILLA',
    list_type: 'SALE',
    bedrooms: 5,
    bathrooms: 5,
    area_sqft: 5200,
    address: '12 Star Island Dr, Miami Beach, FL',
    latitude: 25.7781,
    longitude: -80.1520,
    property_media: [{ url: 'https://images.unsplash.com/photo-1613490908836-e05e54d6d654' }],
  },
];

interface QuickFilter {
  id: string;
  label: string;
  prop_type?: string;
  list_type?: string;
  minBeds?: number;
}

const QUICK_FILTERS: QuickFilter[] = [
  { id: 'all', label: 'All' },
  { id: 'sale', label: 'For Sale', list_type: 'SALE' },
  { id: 'rent', label: 'For Rent', list_type: 'RENT' },
  { id: '1bed', label: '1+ Bed', minBeds: 1 },
  { id: '2bed', label: '2+ Bed', minBeds: 2 },
  { id: 'villa', label: 'Villa', prop_type: 'VILLA' },
  { id: 'apt', label: 'Apartment', prop_type: 'APARTMENT' },
];

const INITIAL_REGION = {
  latitude: 25.775,
  longitude: -80.16,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function formatPricePill(price: number, isRent: boolean): string {
  if (isRent) {
    if (price >= 1000) {
      const k = (price / 1000).toFixed(price % 1000 === 0 ? 0 : 1);
      return '$' + k + 'k/mo';
    }
    return '$' + price + '/mo';
  }
  if (price >= 1000000) {
    const m = (price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1);
    return '$' + m + 'M';
  }
  if (price >= 1000) {
    const k = (price / 1000).toFixed(price % 1000 === 0 ? 0 : 1);
    return '$' + k + 'k';
  }
  return '$' + price;
}

export default function ExploreScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterId, setActiveFilterId] = useState('all');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(['1', '3']));
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [mapType, setMapType] = useState<MapType>('standard');

  const mapRef = useRef<MapView | null>(null);
  const flatListRef = useRef<FlatList | null>(null);

  const sheetHeight = useRef(new Animated.Value(SNAP_HALF)).current;
  const currentSheetHeight = useRef(SNAP_HALF);

  const snapTo = useCallback((targetHeight: number) => {
    Animated.spring(sheetHeight, {
      toValue: targetHeight,
      useNativeDriver: false,
      friction: 8,
      tension: 65,
    }).start(() => {
      currentSheetHeight.current = targetHeight;
    });
  }, [sheetHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const newHeight = currentSheetHeight.current - gestureState.dy;
        if (newHeight >= SNAP_COLLAPSED && newHeight <= SNAP_EXPANDED) {
          sheetHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY = currentSheetHeight.current - gestureState.dy;
        let targetSnap = SNAP_HALF;
        if (gestureState.vy < -0.5 || currentY > (SNAP_HALF + SNAP_EXPANDED) / 2) {
          targetSnap = SNAP_EXPANDED;
        } else if (gestureState.vy > 0.5 || currentY < (SNAP_COLLAPSED + SNAP_HALF) / 2) {
          targetSnap = SNAP_COLLAPSED;
        } else {
          targetSnap = SNAP_HALF;
        }
        snapTo(targetSnap);
      },
    })
  ).current;

  const loadProperties = useCallback(async (filterId = activeFilterId, query = searchQuery) => {
    try {
      const activeFilter = QUICK_FILTERS.find((f) => f.id === filterId);
      const searchParams: any = {};

      if (activeFilter?.list_type) {
        searchParams.list_type = activeFilter.list_type;
      }
      if (activeFilter?.prop_type) {
        searchParams.prop_type = activeFilter.prop_type;
      }
      if (activeFilter?.minBeds) {
        searchParams.bedrooms = activeFilter.minBeds;
      }
      if (query.trim()) {
        searchParams.query = query.trim();
      }

      let data = await searchProperties(searchParams);

      if (!data || data.length === 0) {
        data = await getPublishedProperties();
      }

      if (data && data.length > 0) {
        const withCoords = data.map((item: any, idx: number) => {
          let lat = item.latitude;
          let lng = item.longitude;
          if (!lat || !lng) {
            const fallbackItem = FALLBACK_PROPERTIES[idx % FALLBACK_PROPERTIES.length];
            lat = fallbackItem.latitude;
            lng = fallbackItem.longitude;
          }
          return {
            ...item,
            latitude: lat,
            longitude: lng,
          };
        });
        setProperties(withCoords as PropertyItem[]);
      } else {
        setProperties(FALLBACK_PROPERTIES);
      }
    } catch (err) {
      console.error('Error loading properties with search/fallback:', err);
      setProperties(FALLBACK_PROPERTIES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilterId, searchQuery]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProperties();
  };

  const handleFilterSelect = (filter: QuickFilter) => {
    setActiveFilterId(filter.id);
    setLoading(true);
    loadProperties(filter.id, searchQuery);
  };

  const handleSearchSubmit = () => {
    setLoading(true);
    loadProperties(activeFilterId, searchQuery);
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

  const activeFilter = QUICK_FILTERS.find((f) => f.id === activeFilterId);
  const displayedProperties = properties.filter((prop) => {
    const matchesSearch =
      !searchQuery.trim() ||
      prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prop.address && prop.address.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeFilter?.list_type && prop.list_type !== activeFilter.list_type) return false;
    if (activeFilter?.prop_type && prop.prop_type !== activeFilter.prop_type) return false;
    if (activeFilter?.minBeds && (prop.bedrooms || 0) < activeFilter.minBeds) return false;

    return true;
  });

  const handleMarkerPress = (property: PropertyItem) => {
    setSelectedPropertyId(property.id);

    if (property.latitude && property.longitude && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: property.latitude - 0.008,
          longitude: property.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        },
        400
      );
    }

    if (currentSheetHeight.current <= SNAP_COLLAPSED) {
      snapTo(SNAP_HALF);
    }

    const index = displayedProperties.findIndex((p) => p.id === property.id);
    if (index >= 0 && flatListRef.current) {
      try {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.2,
        });
      } catch {
        // Ignored
      }
    }
  };

  const handleRecenterMap = () => {
    if (displayedProperties.length > 0 && mapRef.current) {
      const validCoords = displayedProperties.filter((p) => p.latitude && p.longitude);
      if (validCoords.length > 0) {
        const lats = validCoords.map((p) => p.latitude as number);
        const lngs = validCoords.map((p) => p.longitude as number);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        mapRef.current.animateToRegion(
          {
            latitude: (minLat + maxLat) / 2,
            longitude: (minLng + maxLng) / 2,
            latitudeDelta: Math.max(0.06, (maxLat - minLat) * 1.5),
            longitudeDelta: Math.max(0.06, (maxLng - minLng) * 1.5),
          },
          500
        );
      } else {
        mapRef.current.animateToRegion(INITIAL_REGION, 500);
      }
    }
  };

  const toggleMapType = () => {
    setMapType((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
  };

  const renderPropertyCard = ({ item }: { item: PropertyItem }) => {
    const isSaved = savedIds.has(item.id);
    const isSelected = selectedPropertyId === item.id;
    const imageUrl =
      item.property_media?.[0]?.url ||
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267';
    const isRent = item.list_type === 'RENT';
    const priceFormatted = isRent
      ? '$' + (item.price?.toLocaleString() || '0') + '/mo'
      : '$' + (item.price?.toLocaleString() || '0');

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        activeOpacity={0.9}
        onPress={() => {
          setSelectedPropertyId(item.id);
          router.push('/property/' + item.id);
        }}
      >
        <View style={styles.cardImageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
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
            activeOpacity={0.7}
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={20}
              color={isSaved ? '#e11d48' : '#0f172a'}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{priceFormatted}</Text>
            {isSelected && (
              <View style={styles.activePillTag}>
                <Ionicons name="location" size={12} color="#e11d48" />
                <Text style={styles.activePillTagText}>Selected</Text>
              </View>
            )}
          </View>

          <Text style={styles.titleText} numberOfLines={1}>
            {item.title}
          </Text>

          {item.address && (
            <View style={styles.addressRow}>
              <Ionicons
                name="location-outline"
                size={13}
                color="#64748b"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}

          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Ionicons
                name="bed-outline"
                size={14}
                color="#475569"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.specText}>{item.bedrooms || 0} Beds</Text>
            </View>
            <View style={styles.specItem}>
              <Ionicons
                name="water-outline"
                size={14}
                color="#475569"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.specText}>{item.bathrooms || 0} Baths</Text>
            </View>
            {item.area_sqft ? (
              <View style={styles.specItem}>
                <Ionicons
                  name="scan-outline"
                  size={14}
                  color="#475569"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.specText}>{item.area_sqft.toLocaleString()} sqft</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={mapType === 'satellite' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Full Screen Google Map */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
      >
        {displayedProperties.map((property) => {
          if (!property.latitude || !property.longitude) return null;
          const isSelected = selectedPropertyId === property.id;
          const isRent = property.list_type === 'RENT';
          const priceLabel = formatPricePill(property.price, isRent);

          return (
            <Marker
              key={property.id}
              coordinate={{
                latitude: property.latitude,
                longitude: property.longitude,
              }}
              onPress={() => handleMarkerPress(property)}
              zIndex={isSelected ? 999 : 1}
              tracksViewChanges={false}
            >
              {/* Custom Price Pill Marker */}
              <View style={styles.markerWrapper}>
                <View
                  style={[
                    styles.pricePill,
                    isSelected ? styles.pricePillActive : styles.pricePillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pricePillText,
                      isSelected ? styles.pricePillTextActive : styles.pricePillTextInactive,
                    ]}
                  >
                    {priceLabel}
                  </Text>
                </View>
                {/* Arrow Pointer Notch */}
                <View
                  style={[
                    styles.markerArrow,
                    isSelected ? styles.markerArrowActive : styles.markerArrowInactive,
                  ]}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Top Floating Search and Filter Bar */}
      <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.headerFloatingCard}>
          {/* Search Box */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#e11d48" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city, neighborhood, address..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  loadProperties(activeFilterId, '');
                }}
              >
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Filter Chips */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={QUICK_FILTERS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = activeFilterId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.filterChip, isSelected && styles.filterChipActive]}
                  onPress={() => handleFilterSelect(item)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.filterList}
          />
        </View>
      </SafeAreaView>

      {/* Map Control Floating Action Buttons */}
      <View style={styles.mapControls}>
        {/* Satellite Toggle */}
        <TouchableOpacity
          style={[styles.mapControlButton, mapType === 'satellite' && styles.mapControlButtonActive]}
          onPress={toggleMapType}
          activeOpacity={0.85}
        >
          <Ionicons
            name={mapType === 'satellite' ? 'earth' : 'earth-outline'}
            size={22}
            color={mapType === 'satellite' ? '#ffffff' : '#0f172a'}
          />
        </TouchableOpacity>

        {/* Recenter Button */}
        <TouchableOpacity
          style={styles.mapControlButton}
          onPress={handleRecenterMap}
          activeOpacity={0.85}
        >
          <Ionicons name="locate" size={22} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Gesture-Driven Expandable Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        {/* Drag Handle Bar */}
        <View style={styles.sheetHandleArea} {...panResponder.panHandlers}>
          <View style={styles.sheetHandleBar} />
          <View style={styles.sheetHeaderRow}>
            <View style={styles.sheetHeaderLeft}>
              <Text style={styles.sheetCountTitle}>
                {displayedProperties.length} {displayedProperties.length === 1 ? 'Home' : 'Homes'} available
              </Text>
              <Text style={styles.sheetSubTitle}>
                {activeFilter?.label === 'All' ? 'Miami & surrounding areas' : 'Filtered: ' + activeFilter?.label}
              </Text>
            </View>

            {/* Quick snap toggle button */}
            <TouchableOpacity
              style={styles.sheetExpandButton}
              onPress={() => {
                if (currentSheetHeight.current >= SNAP_HALF) {
                  snapTo(SNAP_COLLAPSED);
                } else {
                  snapTo(SNAP_HALF);
                }
              }}
            >
              <Ionicons
                name={currentSheetHeight.current >= SNAP_HALF ? 'chevron-down' : 'chevron-up'}
                size={20}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Area */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e11d48" />
            <Text style={styles.loadingText}>Searching homes...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayedProperties}
            keyExtractor={(item) => item.id}
            renderItem={renderPropertyCard}
            contentContainerStyle={styles.sheetListContent}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => {}}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#e11d48']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="home-outline" size={44} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Homes Found</Text>
                <Text style={styles.emptySubtitle}>
                  Try selecting a different filter chip or expanding your search query.
                </Text>
              </View>
            }
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 30 : 10,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerFloatingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 16,
    borderRadius: 20,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 4,
  },
  filterList: {
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },

  // Map Controls
  mapControls: {
    position: 'absolute',
    right: 16,
    top: Platform.OS === 'android' ? 170 : 160,
    zIndex: 90,
    gap: 10,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mapControlButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },

  // Custom Price Pill Marker
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  pricePillInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
  },
  pricePillActive: {
    backgroundColor: '#e11d48',
    borderColor: '#ffffff',
    transform: [{ scale: 1.1 }],
  },
  pricePillText: {
    fontWeight: '800',
    fontSize: 12,
  },
  pricePillTextInactive: {
    color: '#0f172a',
  },
  pricePillTextActive: {
    color: '#ffffff',
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  markerArrowInactive: {
    borderTopColor: '#ffffff',
  },
  markerArrowActive: {
    borderTopColor: '#e11d48',
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
    zIndex: 100,
    overflow: 'hidden',
  },
  sheetHandleArea: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetHandleBar: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetHeaderLeft: {
    flex: 1,
  },
  sheetCountTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetSubTitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sheetExpandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetListContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  // Property Card inside bottom sheet
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: '#e11d48',
    backgroundColor: '#fffbfa',
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
  },
  badgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
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
    top: 10,
    right: 10,
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
  cardContent: {
    padding: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  activePillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffe4e6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  activePillTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e11d48',
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addressText: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  specsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    gap: 14,
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
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
