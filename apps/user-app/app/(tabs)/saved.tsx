import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon } from 'react-native-svg';
import { useAuth, getSavedProperties, toggleSavedProperty } from '@repo/api';
import { savedSearchesStore, SavedSearchItem } from '../../services/savedSearchesStore';
import { MobileSaveSearchModal } from '../../components/MobileSaveSearchModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  statusBadge?: {
    type: 'price_drop' | 'new' | 'contract';
    label: string;
    sublabel?: string;
  };
}

const LUXURY_SAVED_HOMES: SavedPropertyItem[] = [
  {
    id: '1',
    title: 'The Sky Penthouse at Biscayne Bay',
    price: 3450000,
    prop_type: 'APARTMENT',
    list_type: 'SALE',
    bedrooms: 3,
    bathrooms: 3.5,
    area_sqft: 3100,
    address: '1420 Brickell Ave, Miami, FL',
    property_media: [{ url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80' }],
    statusBadge: {
      type: 'price_drop',
      label: 'Price Reduced',
      sublabel: '-$75,000',
    },
  },
  {
    id: '2',
    title: 'Modern Organic Architectural Estate',
    price: 4950000,
    prop_type: 'VILLA',
    list_type: 'SALE',
    bedrooms: 5,
    bathrooms: 5.5,
    area_sqft: 5200,
    address: '10480 Bellagio Rd, Bel Air, Los Angeles, CA',
    property_media: [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80' }],
    statusBadge: {
      type: 'new',
      label: '✨ New to Market',
    },
  },
  {
    id: '3',
    title: 'Contemporary Waterfront Sanctuary with Private Dock',
    price: 9800,
    prop_type: 'HOUSE',
    list_type: 'RENT',
    bedrooms: 4,
    bathrooms: 3,
    area_sqft: 2800,
    address: '220 Harbor Island Way, Newport Beach, CA',
    property_media: [{ url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80' }],
    statusBadge: {
      type: 'contract',
      label: 'Under Contract',
    },
  },
];

type MainTab = 'homes' | 'searches';
type FilterType = 'ALL' | 'SALE' | 'RENT';

function formatSavedTime(dateStr?: string): string {
  if (!dateStr) return 'Saved recently';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Saved just now';
  if (diffHours < 24) return `Saved ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Saved yesterday';
  if (diffDays < 30) return `Saved ${diffDays}d ago`;
  return `Saved ${new Date(dateStr).toLocaleDateString()}`;
}

export default function SavedPortalScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  // Active Main Tab: 'homes' or 'searches'
  const [activeTab, setActiveTab] = useState<MainTab>('homes');
  const [homeSubFilter, setHomeSubFilter] = useState<FilterType>('ALL');

  // Saved Homes State
  const [savedHomes, setSavedHomes] = useState<SavedPropertyItem[]>(LUXURY_SAVED_HOMES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Undo Toast State
  const [undoToast, setUndoToast] = useState<{ property: SavedPropertyItem } | null>(null);
  const undoToastAnim = useRef(new Animated.Value(100)).current;
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Saved Searches State from Reactive Store
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>(() =>
    savedSearchesStore.getSearches()
  );

  // Edit Search Modal State
  const [editingSearchId, setEditingSearchId] = useState<string | null>(null);

  // Sliding pill animated position
  const tabSliderAnim = useRef(new Animated.Value(0)).current;

  // Sync saved searches from store
  useEffect(() => {
    const unsubscribe = savedSearchesStore.subscribe((searches) => {
      setSavedSearches(searches);
    });
    savedSearchesStore.syncWithRemote(user?.id);
    return () => unsubscribe();
  }, [user?.id]);

  // Tab switch animation
  const handleTabSwitch = (tab: MainTab) => {
    setActiveTab(tab);
    Animated.spring(tabSliderAnim, {
      toValue: tab === 'homes' ? 0 : 1,
      damping: 20,
      stiffness: 240,
      useNativeDriver: false,
    }).start();
  };

  // Fetch Saved Homes
  const fetchHomes = useCallback(async () => {
    try {
      if (user?.id) {
        const data = await getSavedProperties(user.id);
        if (data && data.length > 0) {
          // Merge with mock badges if available
          const enhanced = data.map((item: any, idx: number) => ({
            ...item,
            statusBadge:
              item.statusBadge ||
              (idx === 0
                ? { type: 'price_drop', label: 'Price Reduced', sublabel: '-$50,000' }
                : idx === 1
                ? { type: 'new', label: '✨ New' }
                : undefined),
          }));
          setSavedHomes(enhanced as SavedPropertyItem[]);
          return;
        }
      }
      setSavedHomes(LUXURY_SAVED_HOMES);
    } catch (error) {
      console.warn('Error fetching saved properties:', error);
      setSavedHomes(LUXURY_SAVED_HOMES);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHomes();
  }, [fetchHomes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomes();
    savedSearchesStore.syncWithRemote(user?.id);
  };

  // Remove saved property with instant feedback & Undo option
  const handleRemoveHome = (property: SavedPropertyItem) => {
    // Remove immediately from UI
    setSavedHomes((prev) => prev.filter((p) => p.id !== property.id));

    // Show Undo Toast
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setUndoToast({ property });

    Animated.spring(undoToastAnim, {
      toValue: 0,
      damping: 18,
      stiffness: 220,
      useNativeDriver: true,
    }).start();

    undoTimeoutRef.current = setTimeout(() => {
      Animated.timing(undoToastAnim, {
        toValue: 120,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setUndoToast(null));

      // Trigger API removal after undo window expires
      if (user?.id) {
        toggleSavedProperty(user.id, property.id).catch(console.warn);
      }
    }, 4500);
  };

  // Undo removal
  const handleUndoRemove = () => {
    if (!undoToast) return;
    const restored = undoToast.property;
    setSavedHomes((prev) => [restored, ...prev]);

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    Animated.timing(undoToastAnim, {
      toValue: 120,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setUndoToast(null));
  };

  // Quick Share Property
  const handleShareProperty = async (item: SavedPropertyItem) => {
    try {
      const priceStr =
        item.list_type === 'RENT'
          ? `$${item.price?.toLocaleString()}/mo`
          : `$${item.price?.toLocaleString()}`;
      await Share.share({
        title: item.title,
        message: `Check out this luxury property: ${item.title} (${priceStr}) at ${item.address || 'prime location'}.`,
        url: item.property_media?.[0]?.url,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  // Run Saved Search on Map CTA
  const handleRunSearchOnMap = (search: SavedSearchItem) => {
    savedSearchesStore.triggerRunOnMap(search);
    router.push('/(tabs)');
  };

  // Filtered properties
  const filteredHomes = savedHomes.filter((item) => {
    if (homeSubFilter === 'ALL') return true;
    return item.list_type === homeSubFilter;
  });

  // Calculate pill slider left interpolator
  const pillSliderLeft = tabSliderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '50%'],
  });

  // -------------------------------------------------------------
  // Render Tab 1: Saved Homes
  // -------------------------------------------------------------
  const renderHomeCard = ({ item }: { item: SavedPropertyItem }) => {
    const imageUrl =
      item.property_media?.[0]?.url ||
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80';
    const isRent = item.list_type === 'RENT';
    const priceFormatted = isRent
      ? `$${item.price?.toLocaleString() || '0'}/mo`
      : `$${item.price?.toLocaleString() || '0'}`;

    const pricePerSqft =
      item.area_sqft && item.price && !isRent
        ? `$${Math.round(item.price / item.area_sqft).toLocaleString()}/sqft`
        : null;

    return (
      <TouchableOpacity
        style={styles.luxuryCard}
        activeOpacity={0.92}
        onPress={() => router.push(`/property/${item.id}`)}
      >
        {/* Visual Hero Image Container */}
        <View style={styles.cardImageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />

          {/* Top Left Badges */}
          <View style={styles.cardTopLeftBadges}>
            {/* For Sale / For Rent Badge */}
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {isRent ? 'For Rent' : 'For Sale'}
              </Text>
            </View>

            {/* Price Drop / Status Badge */}
            {item.statusBadge && (
              <View
                style={[
                  styles.statusBadge,
                  item.statusBadge.type === 'price_drop'
                    ? styles.statusBadgePriceDrop
                    : item.statusBadge.type === 'new'
                    ? styles.statusBadgeNew
                    : styles.statusBadgeContract,
                ]}
              >
                <Ionicons
                  name={
                    item.statusBadge.type === 'price_drop'
                      ? 'trending-down'
                      : item.statusBadge.type === 'new'
                      ? 'sparkles'
                      : 'hourglass-outline'
                  }
                  size={12}
                  color="#ffffff"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.statusBadgeText}>
                  {item.statusBadge.label}
                  {item.statusBadge.sublabel ? ` ${item.statusBadge.sublabel}` : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Top Right Action Icons (Share & Heart) */}
          <View style={styles.cardTopRightActions}>
            <TouchableOpacity
              style={styles.cardActionCircle}
              onPress={() => handleShareProperty(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={18} color="#0f172a" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardActionCircle, styles.cardHeartActive]}
              onPress={() => handleRemoveHome(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="heart" size={19} color="#e11d48" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card Body Details */}
        <View style={styles.cardBody}>
          <View style={styles.priceRow}>
            <Text style={styles.priceMain}>{priceFormatted}</Text>
            {item.prop_type && (
              <View style={styles.propTypeBadge}>
                <Text style={styles.propTypeText}>
                  {item.prop_type.replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.propertyTitle} numberOfLines={1}>
            {item.title}
          </Text>

          {item.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-sharp" size={13} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          )}

          {/* Specs Chip Row */}
          <View style={styles.specsChipsRow}>
            {item.bedrooms ? (
              <View style={styles.specChip}>
                <Ionicons name="bed-outline" size={13} color="#334155" style={{ marginRight: 4 }} />
                <Text style={styles.specChipText}>{item.bedrooms} Beds</Text>
              </View>
            ) : null}

            {item.bathrooms ? (
              <View style={styles.specChip}>
                <Ionicons name="water-outline" size={13} color="#334155" style={{ marginRight: 4 }} />
                <Text style={styles.specChipText}>{item.bathrooms} Baths</Text>
              </View>
            ) : null}

            {item.area_sqft ? (
              <View style={styles.specChip}>
                <Ionicons name="scan-outline" size={13} color="#334155" style={{ marginRight: 4 }} />
                <Text style={styles.specChipText}>{item.area_sqft.toLocaleString()} sqft</Text>
              </View>
            ) : null}

            {pricePerSqft ? (
              <View style={styles.specChipMuted}>
                <Text style={styles.specChipTextMuted}>{pricePerSqft}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // -------------------------------------------------------------
  // Render Tab 2: Saved Searches
  // -------------------------------------------------------------
  const renderSearchCard = ({ item }: { item: SavedSearchItem }) => {
    const hasPolygon = item.polygon && item.polygon.length > 0;
    const filterObj = item.filters || {};
    const freq = item.notification_frequency || 'INSTANT';

    return (
      <View style={styles.searchCard}>
        {/* Search Header Row */}
        <View style={styles.searchCardHeader}>
          <View style={styles.searchIconWrap}>
            <Ionicons
              name={hasPolygon ? 'shapes-outline' : 'search'}
              size={18}
              color={hasPolygon ? '#2563eb' : '#0f172a'}
            />
          </View>
          <View style={styles.searchTitleWrap}>
            <Text style={styles.searchName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.searchDate}>{formatSavedTime(item.created_at)}</Text>
          </View>
          <TouchableOpacity
            style={styles.searchEditBtn}
            onPress={() => setEditingSearchId(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Criteria Summary Pills */}
        <View style={styles.searchPillsRow}>
          {hasPolygon && (
            <View style={styles.boundaryPill}>
              <Svg width={13} height={13} viewBox="0 0 24 24" style={{ marginRight: 4 }}>
                <Polygon
                  points="4,6 18,3 21,17 12,21 3,15"
                  fill="rgba(37, 99, 235, 0.2)"
                  stroke="#2563eb"
                  strokeWidth="2"
                />
              </Svg>
              <Text style={styles.boundaryPillText}>
                Drawn Boundary ({item.polygon!.length} pts)
              </Text>
            </View>
          )}

          {filterObj.list_type && (
            <View style={styles.criteriaPill}>
              <Ionicons name="pricetag-outline" size={12} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.criteriaPillText}>
                {filterObj.list_type === 'RENT' ? 'For Rent' : 'For Sale'}
              </Text>
            </View>
          )}

          {filterObj.prop_type && (
            <View style={styles.criteriaPill}>
              <Ionicons name="business-outline" size={12} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.criteriaPillText}>{filterObj.prop_type}</Text>
            </View>
          )}

          {filterObj.bedrooms && (
            <View style={styles.criteriaPill}>
              <Ionicons name="bed-outline" size={12} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.criteriaPillText}>{filterObj.bedrooms}+ Beds</Text>
            </View>
          )}

          {filterObj.priceRange && (
            <View style={styles.criteriaPill}>
              <Ionicons name="cash-outline" size={12} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.criteriaPillText}>Price Filtered</Text>
            </View>
          )}
        </View>

        {/* Notification Status & Matches Bar */}
        <View style={styles.searchStatusBar}>
          <View style={styles.statusLeftCol}>
            {/* New Matches Badge */}
            {item.match_count && item.match_count > 0 ? (
              <View style={styles.matchGlowBadge}>
                <Ionicons name="sparkles" size={12} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.matchGlowText}>{item.match_count} new listings</Text>
              </View>
            ) : null}

            {/* Notification Frequency Indicator */}
            <View style={styles.freqIndicator}>
              <Ionicons
                name={
                  freq === 'DAILY'
                    ? 'calendar-outline'
                    : freq === 'NEVER'
                    ? 'notifications-off-outline'
                    : 'flash'
                }
                size={12}
                color={freq === 'NEVER' ? '#94a3b8' : '#e11d48'}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.freqText}>
                {freq === 'DAILY'
                  ? 'Daily Digest'
                  : freq === 'NEVER'
                  ? 'Alerts Muted'
                  : 'Instant Alerts'}
              </Text>
            </View>
          </View>

          {/* CTA: Run on Map */}
          <TouchableOpacity
            style={styles.runMapButton}
            activeOpacity={0.85}
            onPress={() => handleRunSearchOnMap(item)}
          >
            <Ionicons name="map-outline" size={14} color="#ffffff" style={{ marginRight: 5 }} />
            <Text style={styles.runMapButtonText}>Run on Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      {/* iOS Luxury Large Title Header */}
      <View style={styles.headerSection}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.largeTitle}>Saved</Text>
            <Text style={styles.headerSubtitle}>
              {activeTab === 'homes'
                ? `${savedHomes.length} luxury residences favorited`
                : `${savedSearches.length} active boundary alerts`}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.headerExplorePill}
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.8}
          >
            <Ionicons name="map" size={14} color="#0f172a" style={{ marginRight: 5 }} />
            <Text style={styles.headerExploreText}>Map</Text>
          </TouchableOpacity>
        </View>

        {/* iOS Fluid Segmented Switcher */}
        <View style={styles.segmentedContainer}>
          <Animated.View
            style={[
              styles.segmentedSlider,
              {
                left: pillSliderLeft,
              },
            ]}
          />

          <TouchableOpacity
            style={styles.segmentedTab}
            activeOpacity={0.9}
            onPress={() => handleTabSwitch('homes')}
          >
            <View style={styles.tabContentInner}>
              <Ionicons
                name="home"
                size={14}
                color={activeTab === 'homes' ? '#0f172a' : '#64748b'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'homes' && styles.tabLabelActive,
                ]}
              >
                Saved Homes
              </Text>
              <View
                style={[
                  styles.countBadge,
                  activeTab === 'homes' && styles.countBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    activeTab === 'homes' && styles.countBadgeTextActive,
                  ]}
                >
                  {savedHomes.length}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.segmentedTab}
            activeOpacity={0.9}
            onPress={() => handleTabSwitch('searches')}
          >
            <View style={styles.tabContentInner}>
              <Ionicons
                name="search"
                size={14}
                color={activeTab === 'searches' ? '#0f172a' : '#64748b'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'searches' && styles.tabLabelActive,
                ]}
              >
                Saved Searches
              </Text>
              <View
                style={[
                  styles.countBadge,
                  activeTab === 'searches' && styles.countBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    activeTab === 'searches' && styles.countBadgeTextActive,
                  ]}
                >
                  {savedSearches.length}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-Filters Bar for Saved Homes */}
      {activeTab === 'homes' && (
        <View style={styles.subFilterBar}>
          {(
            [
              { id: 'ALL', label: `All (${savedHomes.length})` },
              { id: 'SALE', label: 'For Sale' },
              { id: 'RENT', label: 'For Rent' },
            ] as const
          ).map((filter) => {
            const isSelected = homeSubFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.subFilterPill, isSelected && styles.subFilterPillActive]}
                onPress={() => setHomeSubFilter(filter.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.subFilterPillText,
                    isSelected && styles.subFilterPillTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.loadingText}>Curating your portfolio...</Text>
        </View>
      ) : activeTab === 'homes' ? (
        <FlatList
          data={filteredHomes}
          keyExtractor={(item) => item.id}
          renderItem={renderHomeCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f172a']} />
          }
          ListEmptyComponent={
            <View style={styles.appleEmptyState}>
              <View style={styles.emptyIconBubble}>
                <Ionicons name="heart-dislike-outline" size={38} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No Saved Homes Yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the heart icon on any residence while exploring the map to track price
                reductions and availability.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => router.push('/(tabs)')}
                activeOpacity={0.88}
              >
                <Ionicons name="compass-outline" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionText}>Explore Homes on Map</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={savedSearches}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0f172a']} />
          }
          ListEmptyComponent={
            <View style={styles.appleEmptyState}>
              <View style={styles.emptyIconBubble}>
                <Ionicons name="notifications-off-outline" size={38} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No Saved Searches</Text>
              <Text style={styles.emptySubtitle}>
                Draw a freehand boundary or apply your price and bedroom preferences on the map,
                then tap "Save search" for instant alerts.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => router.push('/(tabs)')}
                activeOpacity={0.88}
              >
                <Ionicons name="shapes-outline" size={17} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyActionText}>Draw & Save on Map</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Floating iOS Undo Banner */}
      {undoToast && (
        <Animated.View
          style={[
            styles.undoBanner,
            {
              bottom: insets.bottom + 16,
              transform: [{ translateY: undoToastAnim }],
            },
          ]}
        >
          <View style={styles.undoTextWrap}>
            <Text style={styles.undoTitle} numberOfLines={1}>
              Removed "{undoToast.property.title}"
            </Text>
          </View>
          <TouchableOpacity
            style={styles.undoButton}
            onPress={handleUndoRemove}
            activeOpacity={0.8}
          >
            <Text style={styles.undoButtonText}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Edit Saved Search Modal */}
      {editingSearchId && (
        <MobileSaveSearchModal
          visible={!!editingSearchId}
          onClose={() => setEditingSearchId(null)}
          existingSearchId={editingSearchId}
          onSaved={() => {
            setEditingSearchId(null);
          }}
          onDeleted={() => {
            setEditingSearchId(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  largeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  headerExplorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerExploreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  segmentedContainer: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
    height: 42,
  },
  segmentedSlider: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '50%',
    backgroundColor: '#ffffff',
    borderRadius: 11,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  segmentedTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabContentInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  countBadgeActive: {
    backgroundColor: '#0f172a',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  countBadgeTextActive: {
    color: '#ffffff',
  },
  subFilterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  subFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subFilterPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  subFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  subFilterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    padding: 18,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // -------------------------------------------------------------
  // Luxury Home Card Styles
  // -------------------------------------------------------------
  luxuryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    backgroundColor: '#e2e8f0',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardTopLeftBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'column',
    gap: 6,
  },
  typeBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusBadgePriceDrop: {
    backgroundColor: '#e11d48',
  },
  statusBadgeNew: {
    backgroundColor: '#059669',
  },
  statusBadgeContract: {
    backgroundColor: '#475569',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  cardTopRightActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  cardActionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardHeartActive: {
    backgroundColor: '#ffffff',
  },
  cardBody: {
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceMain: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  propTypeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  propTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
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
  specsChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  specChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  specChipMuted: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#f1f5f9',
  },
  specChipTextMuted: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },

  // -------------------------------------------------------------
  // Saved Search Card Styles
  // -------------------------------------------------------------
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  searchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  searchTitleWrap: {
    flex: 1,
  },
  searchName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  searchDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 1,
  },
  searchEditBtn: {
    padding: 6,
  },
  searchPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  boundaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  boundaryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  criteriaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  criteriaPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  searchStatusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  statusLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
    paddingRight: 8,
  },
  matchGlowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  matchGlowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  freqIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freqText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  runMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  runMapButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  // -------------------------------------------------------------
  // Apple-Quality Empty States
  // -------------------------------------------------------------
  appleEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  emptyIconBubble: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  emptyActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // -------------------------------------------------------------
  // Undo Toast Banner
  // -------------------------------------------------------------
  undoBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 99,
  },
  undoTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  undoTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  undoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  undoButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
