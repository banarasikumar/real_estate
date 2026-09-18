import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, getSavedProperties, toggleSavedProperty, searchProperties } from '@repo/api';
import {
  RecommendationEditorialCard,
} from '../../components/RecommendationEditorialCard';
import {
  ALL_DEMO_PROPERTIES,
  LOS_ANGELES_PROPERTIES,
  NEW_YORK_PROPERTIES,
  MUMBAI_PROPERTIES,
  DemoProperty,
} from '../../data/mockProperties';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CityFilter = 'all' | 'los-angeles' | 'new-york' | 'mumbai';

interface CityTabItem {
  id: CityFilter;
  label: string;
  cityName: string;
}

const CITY_TABS: CityTabItem[] = [
  { id: 'all', label: '🌟 All', cityName: 'Worldwide' },
  { id: 'los-angeles', label: '🌴 Los Angeles', cityName: 'Los Angeles' },
  { id: 'new-york', label: '🗽 New York', cityName: 'New York' },
  { id: 'mumbai', label: '🕌 Mumbai', cityName: 'Mumbai' },
];

interface CuratedProperty extends DemoProperty {
  matchScore?: number;
  matchReason?: string;
  velocityBadge?: string;
  architectureHighlight?: string;
}

// Pre-curated luxury architectural masterpieces for top picks
const TOP_PICKS_BY_CITY: Record<CityFilter, CuratedProperty> = {
  all: {
    id: 'hero-all-1',
    title: 'The Bellagio Promontory Organic Estate',
    price: 6450000,
    list_type: 'SALE',
    prop_type: 'VILLA',
    bedrooms: 6,
    bathrooms: 7,
    area_sqft: 7850,
    address: '10480 Bellagio Rd, Bel Air, Los Angeles, CA',
    city: 'Los Angeles',
    state: 'CA',
    latitude: 34.083,
    longitude: -118.445,
    isVerified: true,
    property_media: [
      { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85' },
    ],
    matchScore: 99,
    matchReason: 'Flagship organic modernist estate matching your luxury architectural preference',
  },
  'los-angeles': {
    id: 'hero-la-1',
    title: 'Modern Organic Architectural Estate',
    price: 4950000,
    list_type: 'SALE',
    prop_type: 'VILLA',
    bedrooms: 5,
    bathrooms: 5.5,
    area_sqft: 5400,
    address: '1240 Sunset Plaza Dr, Hollywood Hills, Los Angeles, CA',
    city: 'Los Angeles',
    state: 'CA',
    latitude: 34.095,
    longitude: -118.378,
    isVerified: true,
    property_media: [
      { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=85' },
    ],
    matchScore: 99,
    matchReason: 'Matches your luxury villa preference with panoramic city-to-ocean views',
  },
  'new-york': {
    id: 'hero-ny-1',
    title: 'The Glass Pavilion Sky Penthouse',
    price: 7800000,
    list_type: 'SALE',
    prop_type: 'PENTHOUSE',
    bedrooms: 4,
    bathrooms: 4.5,
    area_sqft: 4600,
    address: '56 Leonard St #PH52, TriBeCa, New York, NY',
    city: 'New York',
    state: 'NY',
    latitude: 40.717,
    longitude: -74.006,
    isVerified: true,
    property_media: [
      { url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=85' },
    ],
    matchScore: 99,
    matchReason: 'Matches your prime Manhattan skyline interest & private wrap-around terrace',
  },
  mumbai: {
    id: 'hero-mumbai-1',
    title: 'The Altamount Grand Sea-Facing Sky Villa',
    price: 385000000, // ₹38.5 Cr
    list_type: 'SALE',
    prop_type: 'PENTHOUSE',
    bedrooms: 5,
    bathrooms: 6,
    area_sqft: 6800,
    address: 'Altamount Road, Cumballa Hill, Mumbai',
    city: 'Mumbai',
    state: 'MH',
    latitude: 18.966,
    longitude: 72.809,
    isVerified: true,
    property_media: [
      { url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=85' },
    ],
    matchScore: 99,
    matchReason: 'Unobstructed Arabian Sea vistas matching your South Mumbai luxury lifestyle',
  },
};

export default function ForYouScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedCity, setSelectedCity] = useState<CityFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());

  // Dynamic Apple HIG Today formatted date (e.g. "SATURDAY, SEPTEMBER 19")
  const todayFormattedDate = useMemo(() => {
    return new Date()
      .toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
      .toUpperCase();
  }, []);

  // Load Saved Properties for current user
  useEffect(() => {
    if (user?.id) {
      getSavedProperties(user.id)
        .then((data) => {
          if (Array.isArray(data)) {
            setSavedPropertyIds(new Set(data.map((item: any) => item.property_id || item.id)));
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);

  // Handle Save / Favorite toggle
  const handleToggleSave = useCallback(
    async (propertyId: string) => {
      const isCurrentlySaved = savedPropertyIds.has(propertyId);
      setSavedPropertyIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlySaved) next.delete(propertyId);
        else next.add(propertyId);
        return next;
      });

      if (user?.id) {
        try {
          await toggleSavedProperty(user.id, propertyId);
        } catch (err) {
          console.warn('[ForYou] toggleSavedProperty error:', err);
        }
      }
    },
    [savedPropertyIds, user?.id]
  );

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (user?.id) {
      try {
        const data = await getSavedProperties(user.id);
        if (Array.isArray(data)) {
          setSavedPropertyIds(new Set(data.map((item: any) => item.property_id || item.id)));
        }
      } catch (err) {
        // silent catch
      }
    }
    // Simulate brief network refresh feedback
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, [user?.id]);

  // Top Pick based on selected city
  const topPick = useMemo(() => {
    return TOP_PICKS_BY_CITY[selectedCity] || TOP_PICKS_BY_CITY.all;
  }, [selectedCity]);

  // City-filtered pool of demo properties
  const cityPool = useMemo(() => {
    if (selectedCity === 'los-angeles') return LOS_ANGELES_PROPERTIES;
    if (selectedCity === 'new-york') return NEW_YORK_PROPERTIES;
    if (selectedCity === 'mumbai') return MUMBAI_PROPERTIES;
    return ALL_DEMO_PROPERTIES;
  }, [selectedCity]);

  // Section 2: AI Personalized For You
  const personalizedProperties = useMemo(() => {
    const reasons = [
      'Matches your preference for open floor plans & floor-to-ceiling glass',
      'Private infinity pool & panoramic skyline views',
      'Zero-carbon smart home technology with wellness suite',
      'Quiet secluded hillside cul-de-sac with 24/7 security',
      'Matches your preferred price band & high-end kitchen specs',
      'Direct private elevator access with European craftsmanship',
    ];

    return cityPool.slice(0, 8).map((prop, idx) => ({
      ...prop,
      matchScore: Math.max(92, 98 - (idx % 5)),
      matchReason: reasons[idx % reasons.length],
    }));
  }, [cityPool]);

  // Section 3: Trending in [Selected City] with velocity badges
  const trendingProperties = useMemo(() => {
    const velocityBadges = [
      '🔥 High Demand • 18 Tours Booked',
      '⚡ Fast Mover • 34 Saves Today',
      '📈 Price Cut -5% Yesterday',
      '🌟 Top 1% Most Viewed',
      '⚡ 12 Inquiries in 24h',
      '🔥 4 Active Offers',
    ];

    const startIndex = Math.min(4, Math.max(0, cityPool.length - 8));
    return cityPool.slice(startIndex, startIndex + 8).map((prop, idx) => ({
      ...prop,
      matchScore: Math.max(90, 96 - (idx % 6)),
      velocityBadge: velocityBadges[idx % velocityBadges.length],
      matchReason: `High buyer velocity in ${prop.city || 'this district'}`,
    }));
  }, [cityPool]);

  // Section 4: Architectural Highlights
  const architecturalProperties = useMemo(() => {
    const archReasons = [
      'Award-winning cantilevered design with floor-to-ceiling glass',
      'Mid-Century modern post-and-beam construction with Japanese garden',
      'Brutalist concrete formwork with biophilic internal courtyards',
      'Double-height 22ft cathedral ceilings with bespoke travertine stone',
      'Minimalist Bauhaus pavilion framing panoramic natural horizons',
      'Historic Spanish revival estate with authentic terracotta tiling',
    ];

    const offset = Math.min(8, Math.max(0, cityPool.length - 7));
    return cityPool.slice(offset, offset + 7).map((prop, idx) => ({
      ...prop,
      matchScore: Math.max(91, 97 - (idx % 4)),
      matchReason: archReasons[idx % archReasons.length],
    }));
  }, [cityPool]);

  const currentCityTab = useMemo(
    () => CITY_TABS.find((tab) => tab.id === selectedCity) || CITY_TABS[0],
    [selectedCity]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Main Scrollable Discovery Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
      >
        {/* iOS Large Title Navigation Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerSubtitle}>{todayFormattedDate}</Text>
            <Text style={styles.headerTitle}>Curated for You</Text>
          </View>

          {/* Right Action: Sparkles AI Engine Active Badge */}
          <View style={styles.aiBadgeContainer}>
            <View style={styles.aiBadge}>
              <View style={styles.pulseDot} />
              <Ionicons name="sparkles" size={13} color="#6366f1" style={{ marginRight: 4 }} />
              <Text style={styles.aiBadgeText}>AI Engine Active</Text>
            </View>
          </View>
        </View>

        {/* City Filter Pills Switcher */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterBarContent}
          >
            {CITY_TABS.map((tab) => {
              const isActive = selectedCity === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedCity(tab.id)}
                  style={[
                    styles.cityFilterPill,
                    isActive ? styles.cityFilterPillActive : styles.cityFilterPillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.cityFilterText,
                      isActive ? styles.cityFilterTextActive : styles.cityFilterTextInactive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* SECTION 1: Today's Top Pick (Massive Hero Card) */}
        <View style={styles.sectionContainer}>
          <View style={styles.heroSectionHeader}>
            <View style={styles.heroOverlineRow}>
              <Text style={styles.sectionOverline}>TODAY'S TOP PICK</Text>
              <View style={styles.editorsChoiceBadge}>
                <Ionicons name="star" size={10} color="#f59e0b" style={{ marginRight: 3 }} />
                <Text style={styles.editorsChoiceText}>Editor's Choice</Text>
              </View>
            </View>
            <Text style={styles.heroSectionTitle}>
              {selectedCity === 'all'
                ? 'Architectural Masterpiece'
                : `Premier ${currentCityTab.cityName} Residence`}
            </Text>
          </View>

          <View style={styles.heroCardWrapper}>
            <RecommendationEditorialCard
              item={topPick}
              isTopPick={true}
              matchScore={topPick.matchScore || 99}
              matchReason={topPick.matchReason}
              isSaved={savedPropertyIds.has(topPick.id)}
              onSaveToggle={() => handleToggleSave(topPick.id)}
              onPress={() => router.push(`/property/${topPick.id}` as any)}
            />
          </View>
        </View>

        {/* SECTION 2: AI Personalized For You (Horizontal Rail) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.sectionTitleWithIcon}>
                <Ionicons name="sparkles-sharp" size={17} color="#6366f1" style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>AI Personalized For You</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Matched from your lifestyle, spatial taste, and search behavior
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContentContainer}
          >
            {personalizedProperties.map((item) => (
              <RecommendationEditorialCard
                key={`personalized-${item.id}`}
                item={item}
                isTopPick={false}
                matchScore={item.matchScore}
                matchReason={item.matchReason}
                isSaved={savedPropertyIds.has(item.id)}
                onSaveToggle={() => handleToggleSave(item.id)}
                onPress={() => router.push(`/property/${item.id}` as any)}
                style={styles.railCardMargin}
              />
            ))}
          </ScrollView>
        </View>

        {/* SECTION 3: Trending in [Selected City] (Horizontal Rail with Velocity Badges) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.sectionTitleWithIcon}>
                <Ionicons name="flame" size={19} color="#e11d48" style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>
                  {selectedCity === 'all'
                    ? 'Trending Worldwide'
                    : `Trending in ${currentCityTab.cityName}`}
                </Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Exceptional buyer velocity, tour requests, and high save rates this week
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContentContainer}
          >
            {trendingProperties.map((item) => (
              <RecommendationEditorialCard
                key={`trending-${item.id}`}
                item={item}
                isTopPick={false}
                velocityBadge={item.velocityBadge}
                matchScore={item.matchScore}
                matchReason={item.matchReason}
                isSaved={savedPropertyIds.has(item.id)}
                onSaveToggle={() => handleToggleSave(item.id)}
                onPress={() => router.push(`/property/${item.id}` as any)}
                style={styles.railCardMargin}
              />
            ))}
          </ScrollView>
        </View>

        {/* SECTION 4: Architectural Highlights (Horizontal Rail) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.sectionTitleWithIcon}>
                <Ionicons name="cube-outline" size={18} color="#0284c7" style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Architectural Highlights</Text>
              </View>
              <Text style={styles.sectionSubtitle}>
                Iconic mid-century modern, brutalist villas, and glass sky mansions
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContentContainer}
          >
            {architecturalProperties.map((item) => (
              <RecommendationEditorialCard
                key={`arch-${item.id}`}
                item={item}
                isTopPick={false}
                matchScore={item.matchScore}
                matchReason={item.matchReason}
                isSaved={savedPropertyIds.has(item.id)}
                onSaveToggle={() => handleToggleSave(item.id)}
                onPress={() => router.push(`/property/${item.id}` as any)}
                style={styles.railCardMargin}
              />
            ))}
          </ScrollView>
        </View>

        {/* Bottom spacing for smooth tab navigation clearance */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // iOS Large Title Navigation Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.6,
  },
  aiBadgeContainer: {
    paddingTop: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },

  // City Filter Pills
  filterSection: {
    marginBottom: 20,
  },
  filterBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  cityFilterPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityFilterPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cityFilterPillInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  cityFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cityFilterTextActive: {
    color: '#ffffff',
  },
  cityFilterTextInactive: {
    color: '#475569',
  },

  // Section Styles
  sectionContainer: {
    marginBottom: 28,
  },
  heroSectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  heroOverlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 0.8,
  },
  editorsChoiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  editorsChoiceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400e',
  },
  heroSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  heroCardWrapper: {
    paddingHorizontal: 16,
  },

  // Rail Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 16,
  },
  railContentContainer: {
    paddingHorizontal: 16,
  },
  railCardMargin: {
    marginRight: 14,
  },

  bottomSpacer: {
    height: 40,
  },
});
