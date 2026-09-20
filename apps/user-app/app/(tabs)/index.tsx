import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  StatusBar,
  Platform,
  Animated as RNAnimated,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileMapboxView, MobileMapboxViewRef } from '../../components/MobileMapboxView';
import {
  clusterPropertiesByBuilding,
  calculateThumbnailCollision,
  MultiUnitBuildingMarker,
} from '../../utils/markerClustering';
import { MobileBuildingDrawer } from '../../components/MobileBuildingDrawer';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  searchProperties,
  getPublishedProperties,
  useAuth,
  toggleSavedProperty,
  getSavedProperties,
  SearchBounds,
  SearchPropertiesParams,
} from '@repo/api';

import { MobileFilterModal, MobileFilterState } from '../../components/MobileFilterModal';
import { MobileSaveSearchModal } from '../../components/MobileSaveSearchModal';
import { savedSearchesStore, SavedSearchItem } from '../../services/savedSearchesStore';
import {
  MobilePropertyCardCarousel,
  CarouselProperty,
  formatPricePill,
} from '../../components/MobilePropertyCardCarousel';
import { MobileTouchDrawOverlay } from '../../components/MobileTouchDrawOverlay';
import {
  MobileTriStateBottomSheet,
  SheetSnapState,
} from '../../components/MobileTriStateBottomSheet';
import { ZillowFilterIcon } from '../../components/ZillowIcons';
import { MobileSearchModal } from '../../components/MobileSearchModal';
import { SearchRegion, SEARCH_REGIONS } from '../../data/searchRegions';
import {
  ALL_DEMO_PROPERTIES,
  adaptPropertyForListType,
  getPropertiesForMode,
} from '../../data/mockProperties';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface PropertyItem extends CarouselProperty {
  [key: string]: any;
}

type MapBounds = SearchBounds;

// Comprehensive Demo Real Estate Properties (Los Angeles: 26, New York: 25, Mumbai: 25)
const SEED_PROPERTIES: PropertyItem[] = ALL_DEMO_PROPERTIES as PropertyItem[];

function getFallbackProperties(
  queryText: string,
  bounds: MapBounds | null,
  listType: string = 'RENT',
  activeRegion?: SearchRegion | null
): PropertyItem[] {
  let list = SEED_PROPERTIES;
  const trimmed = (queryText || '').trim().toLowerCase();
  const matchedRegion = activeRegion || null;

  if (trimmed) {
    const hasLA =
      trimmed.includes('los angeles') ||
      trimmed.includes('ca home') ||
      trimmed.includes('santa monica') ||
      trimmed.includes('beverly hills') ||
      trimmed.includes('la home');
    const hasNY =
      trimmed.includes('new york') ||
      trimmed.includes('ny home') ||
      trimmed.includes('manhattan') ||
      trimmed.includes('brooklyn') ||
      trimmed.includes('nyc');
    const hasMumbai =
      trimmed.includes('mumbai') ||
      trimmed.includes('bandra') ||
      trimmed.includes('worli') ||
      trimmed.includes('juhu');
    const hasRanchi =
      trimmed.includes('ranchi') ||
      trimmed.includes('kanke') ||
      trimmed.includes('morabadi') ||
      trimmed.includes('harmu') ||
      trimmed.includes('doranda');

    const matched = SEED_PROPERTIES.filter((p) => {
      const city = (p.city || '').toLowerCase();
      if (hasLA) return city.includes('los angeles');
      if (hasNY) return city.includes('new york');
      if (hasMumbai) return city.includes('mumbai');
      if (hasRanchi) return city.includes('ranchi');

      const stopWords = new Set([
        'luxury', 'homes', 'home', 'house', 'for', 'rent', 'sale',
        'apartment', 'flat', 'residence', 'residences'
      ]);
      const words = trimmed
        .split(/[\s,]+/)
        .filter((w) => w.length > 2 && !stopWords.has(w));
      const address = (p.address || '').toLowerCase();
      const title = (p.title || '').toLowerCase();
      const state = (p.state || '').toLowerCase();
      const haystack = `${title} ${address} ${city} ${state}`.toLowerCase();
      if (haystack.includes(trimmed)) return true;

      return words.some((w) => city.includes(w) || address.includes(w) || title.includes(w));
    });

    if (matched.length > 0) {
      list = matched;
    }
  } else if (matchedRegion && matchedRegion.sampleProperties && matchedRegion.sampleProperties.length > 0) {
    list = matchedRegion.sampleProperties as PropertyItem[];
  }

  // If a city/region query matched or activeRegion is set, do NOT truncate by camera viewport bounds!
  // The user searched for that city/region, so all 20+ properties in that region must remain visible.
  const isCitySearch = Boolean(
    matchedRegion ||
    (trimmed && (
      trimmed.includes('los angeles') ||
      trimmed.includes('ca home') ||
      trimmed.includes('new york') ||
      trimmed.includes('ny home') ||
      trimmed.includes('mumbai') ||
      trimmed.includes('bangalore') ||
      trimmed.includes('delhi') ||
      trimmed.includes('goa') ||
      trimmed.includes('ranchi')
    ))
  );

  // Only apply camera viewport bounds during open map exploration (no active region / city query)
  if (!isCitySearch && bounds) {
    const { north, south, east, west } = bounds;
    const inBounds = list.filter(
      (p) =>
        p.latitude! >= south &&
        p.latitude! <= north &&
        p.longitude! >= west &&
        p.longitude! <= east
    );
    if (inBounds.length > 0) {
      list = inBounds;
    }
  }

  // Ensure all properties reflect the current viewing mode (RENT vs SALE) with calibrated pricing
  return list.map((p) => adaptPropertyForListType(p, listType) as PropertyItem);
}

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

// Point-in-Polygon Ray-Casting Algorithm
function isPointInPolygon(
  point: [number, number], // [lng, lat]
  polygon: [number, number][] // array of [lng, lat]
): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export default function UserAppHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // View Mode: 'map' (Fullscreen Map + Snapping Card) | 'list' (Vertical Feed)
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Properties State
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selection & Viewed State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<MultiUnitBuildingMarker | null>(null);
  const [isSearchSaved, setIsSearchSaved] = useState(false);
  const [viewedPropertyIds, setViewedPropertyIds] = useState<Set<string>>(new Set());
  const [savedPropertyIds, setSavedPropertyIds] = useState<Set<string>>(new Set());

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('Mumbai Luxury Homes');
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [activeRegion, setActiveRegion] = useState<SearchRegion | null>(() => {
    return SEARCH_REGIONS.find((r) => r.id === 'mumbai') || SEARCH_REGIONS[0] || null;
  });
  const [preferredMode, setPreferredMode] = useState<'DUAL' | 'PEEK'>('DUAL');
  const [activeQuickFilter, setActiveQuickFilter] = useState('rent');
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [modalFilters, setModalFilters] = useState<MobileFilterState>({});

  // Map Controls State
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [is3D, setIs3D] = useState(false);
  const [searchAsMove, setSearchAsMove] = useState(true);

  // Freehand Touch Drawing State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState<Array<{ latitude: number; longitude: number }> | null>(null);

  // Tri-State Bottom Sheet State (Starts in DUAL mode matching screenshot 1)
  const [sheetSnapState, setSheetSnapState] = useState<SheetSnapState>('DUAL');
  const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT - 60);

  // Save Search Modal / Toast State
  const [isSaveSearchModalVisible, setIsSaveSearchModalVisible] = useState(false);
  const [savedSearchToast, setSavedSearchToast] = useState<{
    name: string;
    frequency: string;
  } | null>(null);
  const toastAnim = useRef(new RNAnimated.Value(-120)).current;
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showSavedSearchToast = useCallback((name: string, frequency: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setSavedSearchToast({ name, frequency });
    RNAnimated.spring(toastAnim, {
      toValue: 0,
      damping: 18,
      stiffness: 240,
      useNativeDriver: true,
    }).start();

    toastTimeoutRef.current = setTimeout(() => {
      RNAnimated.timing(toastAnim, {
        toValue: -140,
        duration: 260,
        useNativeDriver: true,
      }).start(() => {
        setSavedSearchToast(null);
      });
    }, 3800);
  }, [toastAnim]);

  // Refs
  const mapboxRef = useRef<MobileMapboxViewRef | null>(null);
  const mapBoundsRef = useRef<MapBounds | null>(null);
  const debounceRegionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for "Run on Map" from Saved Searches tab
  useEffect(() => {
    const handleRunSearch = (search: SavedSearchItem) => {
      if (search) {
        if (search.query) {
          setSearchQuery(search.query);
        }
        if (search.filters) {
          setModalFilters(search.filters as MobileFilterState);
          if (search.filters.list_type) {
            setActiveQuickFilter(search.filters.list_type.toLowerCase() === 'rent' ? 'rent' : 'sale');
          }
        }
        if (search.polygon && search.polygon.length > 0) {
          setDrawnPolygon(search.polygon);
          setIsDrawingMode(false);
          const centerLat =
            search.polygon.reduce((acc: number, p: { latitude: number; longitude: number }) => acc + p.latitude, 0) /
            search.polygon.length;
          const centerLng =
            search.polygon.reduce((acc: number, p: { latitude: number; longitude: number }) => acc + p.longitude, 0) /
            search.polygon.length;
          mapboxRef.current?.flyToRegion([centerLng, centerLat], 13);
        } else {
          setDrawnPolygon(null);
          const matched = SEARCH_REGIONS.find((r) =>
            search.query &&
            (r.name.toLowerCase().includes(search.query.toLowerCase()) ||
              search.query.toLowerCase().includes(r.name.toLowerCase()))
          );
          if (matched?.center) {
            setActiveRegion(matched);
            mapboxRef.current?.flyToRegion(matched.center, matched.zoom || 12);
          }
        }
        setIsSearchSaved(true);
        const freqLabel =
          search.notification_frequency === 'DAILY'
            ? 'Daily digest active'
            : search.notification_frequency === 'NEVER'
            ? 'Alerts off'
            : 'Instant alerts active';
        showSavedSearchToast(search.name, freqLabel);
      }
    };

    const unsubscribe = savedSearchesStore.subscribeToRunOnMap(handleRunSearch);

    // Check if any search was already queued
    const pending = savedSearchesStore.popPendingSearchToRun();
    if (pending) {
      handleRunSearch(pending);
    }

    return () => {
      unsubscribe();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [showSavedSearchToast]);

  // Load Saved Properties for Authenticated User
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

  // Data Fetching with Query & Bounds
  const fetchHomes = useCallback(
    async (
      queryText = searchQuery,
      quickFilterId = activeQuickFilter,
      advancedFilters = modalFilters,
      bounds: MapBounds | null = mapBoundsRef.current
    ) => {
      try {
        const quick = QUICK_FILTERS.find((f) => f.id === quickFilterId);
        const params: SearchPropertiesParams = {};

        // Merge quick filters and advanced modal filters
        const listType = advancedFilters.list_type || quick?.list_type || (activeQuickFilter === 'rent' ? 'RENT' : 'SALE');
        if (listType) params.list_type = listType;

        const propType = advancedFilters.prop_type || quick?.prop_type;
        if (propType) params.prop_type = propType;

        const beds = advancedFilters.bedrooms || quick?.minBeds;
        if (beds) params.bedrooms = beds;

        if (advancedFilters.bathrooms) {
          params.bathrooms = advancedFilters.bathrooms;
        }

        // Price Presets
        if (advancedFilters.priceRange === 'under_50l') {
          params.maxPrice = 5000000;
        } else if (advancedFilters.priceRange === '50l_1cr') {
          params.minPrice = 5000000;
          params.maxPrice = 10000000;
        } else if (advancedFilters.priceRange === '1cr_3cr') {
          params.minPrice = 10000000;
          params.maxPrice = 30000000;
        } else if (advancedFilters.priceRange === 'above_3cr') {
          params.minPrice = 30000000;
        }

        if (queryText.trim()) {
          params.query = queryText.trim();
        }

        // If searching a known city/region, do NOT pass camera viewport bounds to API
        const isCityOrRegion = Boolean(
          activeRegion ||
          (queryText.trim() && (
            queryText.toLowerCase().includes('angeles') ||
            queryText.toLowerCase().includes('ca home') ||
            queryText.toLowerCase().includes('york') ||
            queryText.toLowerCase().includes('ny home') ||
            queryText.toLowerCase().includes('mumbai') ||
            queryText.toLowerCase().includes('bangalore') ||
            queryText.toLowerCase().includes('delhi') ||
            queryText.toLowerCase().includes('goa') ||
            queryText.toLowerCase().includes('ranchi')
          ))
        );

        if (bounds && !isCityOrRegion) {
          params.bounds = bounds;
        }

        let data = await searchProperties(params);

        if (!data || data.length === 0) {
          if (!bounds && !queryText.trim() && quickFilterId === 'all') {
            data = await getPublishedProperties();
          }
        }

        if (data && data.length > 0) {
          // Ensure every property has valid coordinates
          const withCoords = data.map((item: any, idx: number) => {
            let lat = item.latitude;
            let lng = item.longitude;
            if (!lat || !lng) {
              const seed = SEED_PROPERTIES[idx % SEED_PROPERTIES.length];
              lat = seed.latitude;
              lng = seed.longitude;
            }
            return {
              ...item,
              latitude: lat,
              longitude: lng,
            };
          });
          setProperties(withCoords as PropertyItem[]);
        } else {
          // Client-side fallback filtered by search query & calibrated to listType
          setProperties(getFallbackProperties(queryText, bounds, listType, activeRegion));
        }
      } catch (err) {
        console.warn('[UserApp] searchProperties fallback:', err);
        const fallbackListType = advancedFilters.list_type || (activeQuickFilter === 'rent' ? 'RENT' : 'SALE');
        setProperties(getFallbackProperties(queryText, bounds, fallbackListType, activeRegion));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchQuery, activeQuickFilter, modalFilters, activeRegion]
  );

  useEffect(() => {
    fetchHomes();
  }, [fetchHomes]);

  // Filter properties by drawn boundary polygon (if active)
  const displayedProperties = useMemo(() => {
    if (!drawnPolygon || drawnPolygon.length < 3) {
      return properties;
    }
    const polygonLngLats: [number, number][] = drawnPolygon.map((p) => [p.longitude, p.latitude]);
    return properties.filter((prop) => {
      if (!prop.latitude || !prop.longitude) return false;
      return isPointInPolygon([prop.longitude, prop.latitude], polygonLngLats);
    });
  }, [properties, drawnPolygon]);

  // Clustered Markers with Screen-Space Thumbnail Collision Detection
  const clusteredMarkers = useMemo(() => {
    const raw = clusterPropertiesByBuilding(displayedProperties);
    const activeId = selectedBuilding ? selectedBuilding.id : selectedPropertyId;
    return calculateThumbnailCollision(raw, activeId);
  }, [displayedProperties, selectedPropertyId, selectedBuilding]);

  // Currently selected index in the carousel
  const selectedIndex = useMemo(() => {
    if (!selectedPropertyId) return -1;
    return displayedProperties.findIndex((p) => p.id === selectedPropertyId);
  }, [selectedPropertyId, displayedProperties]);

  // Handle Marker / Property Selection
  const handleMarkerPress = useCallback((marker: any) => {
    if (!marker) {
      setSelectedPropertyId(null);
      setSelectedBuilding(null);
      return;
    }

    if (marker.type === 'multi') {
      setSelectedBuilding(marker as MultiUnitBuildingMarker);
      setSelectedPropertyId(null);
      setViewedPropertyIds((prev) => new Set(prev).add(marker.id));
    } else {
      setSelectedBuilding(null);
      const singleId = marker.rawProperty?.id || marker.id;
      setSelectedPropertyId(singleId);
      setViewedPropertyIds((prev) => new Set(prev).add(singleId));
      setSheetSnapState('MINI_PEEK');
    }
  }, []);

  // Handle Carousel Card Swipe
  const handleCarouselSnap = useCallback(
    (index: number) => {
      const prop = displayedProperties[index];
      if (prop) {
        setSelectedPropertyId(prop.id);
        setViewedPropertyIds((prev) => new Set(prev).add(prop.id));
        if (prop.latitude && prop.longitude) {
          mapboxRef.current?.flyToRegion([prop.longitude, prop.latitude], 15.5);
        }
      }
    },
    [displayedProperties]
  );

  // Toggle Favorite
  const handleToggleFavorite = async (propertyId: string) => {
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
        console.warn('[UserApp] toggleSavedProperty error:', err);
      }
    }
  };

  // Region change debounce for "Search as I move the map"
  const handleRegionChangeComplete = (bounds: { north: number; south: number; east: number; west: number }) => {
    if (!searchAsMove) return;

    mapBoundsRef.current = bounds;

    // When viewing an active city/region or focusing on a selected property,
    // camera movement within the city must NOT truncate or wipe out the listings.
    if (activeRegion || selectedPropertyId) {
      return;
    }

    if (debounceRegionTimerRef.current) {
      clearTimeout(debounceRegionTimerRef.current);
    }
    debounceRegionTimerRef.current = setTimeout(() => {
      fetchHomes(searchQuery, activeQuickFilter, modalFilters, bounds);
    }, 400);
  };

  // Toggle 3D Perspective Tilt
  const handleToggle3D = () => {
    setIs3D((prev) => !prev);
  };

  // Recenter Map
  const handleRecenter = () => {
    mapboxRef.current?.recenter();
  };

  // Freehand Touch Drawing Completion
  const handleFinishDraw = (screenPoints: Array<{ x: number; y: number }>) => {
    mapboxRef.current?.convertPointsToCoords(screenPoints);
    setIsDrawingMode(false);
  };

  const handlePolygonCreated = (coords: Array<{ latitude: number; longitude: number }>) => {
    if (coords && coords.length >= 3) {
      const closed = [...coords, coords[0]];
      setDrawnPolygon(closed);
      setSelectedPropertyId(null);
      setSelectedBuilding(null);
    }
  };

  const handleStartDraw = () => {
    // Level camera to 2D for accurate drawing
    if (is3D) {
      setIs3D(false);
    }
    setDrawnPolygon(null);
    setSelectedPropertyId(null);
    setSelectedBuilding(null);
    setIsDrawingMode(true);
  };

  // Dynamic Theme Color (Solid Brand Rose for SALE, Zillow Signature Deep Violet for RENT)
  const isRent = activeQuickFilter === 'rent' || modalFilters.list_type === 'RENT';
  const themeColor = isRent ? '#7B1FA2' : '#e11d48';

  // Active filter count for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (modalFilters.list_type) count++;
    if (modalFilters.prop_type) count++;
    if (modalFilters.bedrooms) count++;
    if (modalFilters.bathrooms) count++;
    if (modalFilters.priceRange) count++;
    if (modalFilters.isVerified) count++;
    return count;
  }, [modalFilters]);

  // Status Bar and Safe Area Insets for Stationary Header
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : insets.top;
  const headerPaddingTop = statusBarHeight + 8;
  const searchRowTotalHeight = headerPaddingTop + 56;

  // Shared translateYAnim between index.tsx and MobileTriStateBottomSheet
  const fullHeight = containerHeight || (SCREEN_HEIGHT - 60);
  const bottomInset = insets.bottom || (Platform.OS === 'android' ? 12 : 0);
  const MINI_PEEK_HEIGHT = 28;
  const PEEK_HEIGHT = 68;
  const DUAL_HEIGHT = Math.round(fullHeight * 0.44);
  const fullY = searchRowTotalHeight;
  const dualY = fullHeight - DUAL_HEIGHT;
  const peekY = fullHeight - PEEK_HEIGHT;
  const miniPeekY = fullHeight - MINI_PEEK_HEIGHT;

  const getSnapTranslateY = (state: SheetSnapState) => {
    switch (state) {
      case 'FULL': return fullY;
      case 'DUAL': return dualY;
      case 'PEEK': return peekY;
      case 'MINI_PEEK': return miniPeekY;
    }
  };
  const animatedPosition = useSharedValue(getSnapTranslateY(sheetSnapState));

  const floating3DStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        animatedPosition.value,
        [fullY, fullY + 60, dualY],
        [0, 0.4, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const topBarBgStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        animatedPosition.value,
        [fullY, fullY + 40, dualY],
        [1, 0, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  // Property Card Gesture (Swipe down to dismiss)
  const cardDismissGesture = useMemo(() => {
    return Gesture.Pan()
      .runOnJS(true)
      .activeOffsetY(15) // Active on downward drag
      .failOffsetY(-15) // Fail on upward drag
      .failOffsetX([-25, 25]) // Fail on horizontal drag (let FlatList scroll)
      .onEnd((e) => {
        if (e.translationY > 40 || e.velocityY > 400) {
          setSelectedPropertyId(null);
          setSelectedBuilding(null);
          if (sheetSnapState === 'MINI_PEEK') {
            setSheetSnapState(preferredMode);
          }
        }
      });
  }, [sheetSnapState, preferredMode]);

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 100 && h !== containerHeight) {
          setContainerHeight(h);
        }
      }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* 1. Mapbox Standard 3D View (Full Screen) */}
      <MobileMapboxView
        ref={mapboxRef}
        markers={clusteredMarkers}
        selectedId={selectedBuilding ? selectedBuilding.id : selectedPropertyId}
        viewedIds={viewedPropertyIds}
        mapType={mapType}
        is3D={is3D}
        listType={isRent ? 'RENT' : 'SALE'}
        drawnPolygon={drawnPolygon}
        regionBoundary={activeRegion?.boundaryPolygon || null}
        onSelectMarker={handleMarkerPress}
        onRegionChange={handleRegionChangeComplete}
        onPolygonCreated={handlePolygonCreated}
        onMapTouch={() => {
          if (selectedPropertyId || selectedBuilding) {
            setSelectedPropertyId(null);
            setSelectedBuilding(null);
          }
          if (sheetSnapState !== 'PEEK') {
            setSheetSnapState('PEEK');
          }
        }}
      />

      {/* 2. Touchscreen Freehand Lasso Drawing Overlay */}
      <MobileTouchDrawOverlay
        isDrawing={isDrawingMode}
        onFinishDraw={handleFinishDraw}
        onCancelDraw={() => setIsDrawingMode(false)}
      />

      {/* 3. Stationary Top Search & Filter Bar (Option 1: Unified Single-Surface Fusion) */}
      <View style={styles.stationaryTopHeaderWrapper} pointerEvents="box-none">
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: '#ffffff' },
            topBarBgStyle,
          ]}
          pointerEvents="none"
        />
        {/* Fixed Search Row - NEVER moves */}
        <View style={[styles.topFloatingBarContainer, { paddingTop: statusBarHeight + 8 }]}>
          {/* Search Pill */}
          <TouchableOpacity
            style={styles.searchPill}
            activeOpacity={0.88}
            onPress={() => setIsSearchModalVisible(true)}
          >
            <Ionicons name="search" size={19} color="#0f172a" style={{ marginRight: 8 }} />
            <Text
              style={[styles.searchInputText, !searchQuery && styles.searchPlaceholderText]}
              numberOfLines={1}
            >
              {searchQuery || activeRegion?.name || (isRent ? 'Los Angeles CA rentals' : 'Home features, school, location')}
            </Text>
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                  setActiveRegion(null);
                  fetchHomes('');
                }}
                style={styles.clearSearchBtn}
              >
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ) : (
              <Ionicons name="mic-outline" size={19} color="#94a3b8" />
            )}
          </TouchableOpacity>

          {/* Circular Filter Button */}
          <TouchableOpacity
            style={[
              styles.filterCircleButton,
              activeFilterCount > 0 && styles.filterCircleButtonActive,
            ]}
            onPress={() => setIsFilterModalVisible(true)}
            activeOpacity={0.85}
          >
            <ZillowFilterIcon
              size={20}
              color={activeFilterCount > 0 ? '#ffffff' : '#0f172a'}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Drawn Shape Clear Banner */}
      {sheetSnapState !== 'FULL' && drawnPolygon && drawnPolygon.length >= 3 && (
        <View style={[styles.drawnShapeBannerContainer, { top: searchRowTotalHeight + 8 }]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.clearBoundaryPill}
            onPress={() => setDrawnPolygon(null)}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle" size={14} color="#e11d48" style={{ marginRight: 4 }} />
            <Text style={styles.clearBoundaryText}>Clear Drawn Area ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. Floating 3D Perspective Tilt Button (Visible in PEEK & DUAL modes over the map, smoothly fades out in FULL mode) */}
      <Animated.View
        pointerEvents={sheetSnapState === 'FULL' ? 'none' : 'auto'}
        style={[
          styles.floating3DWrap,
          { top: searchRowTotalHeight + 8 },
          floating3DStyle,
        ]}
      >
        <TouchableOpacity
          style={[styles.floating3DCircle, is3D && styles.floating3DCircleActive]}
          onPress={handleToggle3D}
          activeOpacity={0.85}
        >
          <Text style={[styles.floating3DText, is3D && styles.floating3DTextActive]}>3D</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 5. Map View Bottom Controls & Sheets (When in Map Mode) */}
      {viewMode === 'map' && (
        <>
          {/* Zillow Tri-State Bottom Sheet with Anchored HUD (PEEK, DUAL, FULL, MINI_PEEK) */}
          {!selectedBuilding && (
            <MobileTriStateBottomSheet
              availableHeight={containerHeight}
              searchRowTotalHeight={searchRowTotalHeight}
              snapState={sheetSnapState}
              translateYAnim={animatedPosition}
              onSnapChange={(newState) => {
                setSheetSnapState(newState);
                if (newState === 'DUAL' || newState === 'FULL') {
                  setPreferredMode('DUAL');
                  if (selectedPropertyId) {
                    setSelectedPropertyId(null);
                  }
                } else if (newState === 'PEEK') {
                  setPreferredMode('PEEK');
                  if (selectedPropertyId) {
                    setSelectedPropertyId(null);
                  }
                }
              }}
              properties={displayedProperties}
              selectedPropertyId={selectedPropertyId}
              onSelectProperty={(prop) => {
                if (!prop) {
                  setSelectedPropertyId(null);
                  return;
                }
                setSelectedPropertyId(prop.id);
                if (prop.latitude && prop.longitude) {
                  mapboxRef.current?.flyToRegion([prop.longitude, prop.latitude], 15.5);
                }
              }}
              onToggleFavorite={handleToggleFavorite}
              isSaved={(id) => savedPropertyIds.has(id)}
              listType={isRent ? 'RENT' : 'SALE'}
              onOpenFilters={() => setIsFilterModalVisible(true)}
              activeFilterCount={activeFilterCount}
              mapType={mapType}
              onToggleMapType={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
              isDrawingMode={isDrawingMode}
              onStartDraw={handleStartDraw}
              onRecenter={handleRecenter}
              isSearchSaved={isSearchSaved}
              onToggleSaveSearch={() => setIsSaveSearchModalVisible(true)}
              searchQuery={searchQuery}
              onOpenSearchModal={() => setIsSearchModalVisible(true)}
              onClearSearch={() => {
                setSearchQuery('');
                setActiveRegion(null);
                fetchHomes('');
              }}
              regionName={activeRegion?.name}
            />
          )}

          {/* Single Property Floating Card Carousel */}
          {!selectedBuilding && selectedPropertyId && (
            <GestureDetector gesture={cardDismissGesture}>
              <View style={[styles.carouselAbsoluteWrap, { bottom: MINI_PEEK_HEIGHT + 10 }]}>
                <MobilePropertyCardCarousel
                  properties={displayedProperties}
                  selectedIndex={selectedIndex}
                  onSnapToIndex={handleCarouselSnap}
                  onToggleSaved={handleToggleFavorite}
                  isPropertySaved={(id) => savedPropertyIds.has(id)}
                  onClosePreview={() => {
                    setSelectedPropertyId(null);
                    setSheetSnapState(preferredMode);
                  }}
                />
              </View>
            </GestureDetector>
          )}
        </>
      )}

      {/* 6. Multi-Unit Building Drawer (Zillow Style Bottom Sheet) */}
      <MobileBuildingDrawer
        visible={!!selectedBuilding}
        building={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
        onSelectUnit={(unit) => router.push(`/property/${unit.id}`)}
        onToggleSaved={handleToggleFavorite}
        isSaved={(id) => savedPropertyIds.has(id)}
      />

      {/* 7. Full-Screen Zillow Search Modal */}
      <MobileSearchModal
        visible={isSearchModalVisible}
        initialQuery={searchQuery}
        initialListType={isRent ? 'RENT' : 'SALE'}
        onClose={() => setIsSearchModalVisible(false)}
        onSelectRegion={(region, listType) => {
          setActiveRegion(region);
          setSearchQuery(region.name);
          const effectiveMode = listType === 'RENT' ? 'RENT' : 'SALE';
          if (listType === 'RENT') {
            setActiveQuickFilter('rent');
          } else if (listType === 'SALE') {
            setActiveQuickFilter('sale');
          }
          if (region.center) {
            mapboxRef.current?.flyToRegion(region.center, region.zoom || 11);
          }
          if (region.sampleProperties && region.sampleProperties.length > 0) {
            const adapted = getPropertiesForMode(region.sampleProperties, effectiveMode) as PropertyItem[];
            setProperties(adapted);
          } else {
            fetchHomes(region.name, effectiveMode === 'RENT' ? 'rent' : 'sale');
          }
          // Apply remembered mode (DUAL or PEEK)
          setSheetSnapState(preferredMode);
        }}
        onSelectQuery={(queryText, listType) => {
          const matched = SEARCH_REGIONS.find(
            (r) => r.name.toLowerCase() === queryText.toLowerCase() || r.city.toLowerCase() === queryText.toLowerCase()
          ) || null;
          setActiveRegion(matched);
          setSearchQuery(queryText);
          const filterId = listType === 'RENT' ? 'rent' : 'sale';
          if (listType === 'RENT') {
            setActiveQuickFilter('rent');
          } else if (listType === 'SALE') {
            setActiveQuickFilter('sale');
          }
          fetchHomes(queryText, filterId);
          setSheetSnapState(preferredMode);
        }}
        onListTypeChange={(listType) => {
          if (listType === 'RENT') {
            setActiveQuickFilter('rent');
          } else {
            setActiveQuickFilter('sale');
          }
        }}
      />

      {/* 6. Fullscreen List Feed (When in 'list' View Mode) */}
      {viewMode === 'list' && (
        <View style={styles.listContainer}>
          <FlatList
            data={displayedProperties}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.verticalListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchHomes();
                }}
                colors={[themeColor]}
              />
            }
            renderItem={({ item }) => {
              const photoUrl =
                item.property_media?.[0]?.url ||
                'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80';
              const isSaved = savedPropertyIds.has(item.id);

              return (
                <TouchableOpacity
                  style={styles.vertCard}
                  activeOpacity={0.92}
                  onPress={() => router.push(`/property/${item.id}`)}
                >
                  <View style={styles.vertImageContainer}>
                    <Image source={{ uri: photoUrl }} style={styles.vertImage} resizeMode="cover" />
                    <View style={[styles.vertPriceTag, { backgroundColor: themeColor }]}>
                      <Text style={styles.vertPriceText}>{formatPricePill(item.price)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.vertHeartBtn}
                      onPress={() => handleToggleFavorite(item.id)}
                    >
                      <Ionicons
                        name={isSaved ? 'heart' : 'heart-outline'}
                        size={18}
                        color={isSaved ? themeColor : '#ffffff'}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.vertDetails}>
                    <Text style={styles.vertTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.vertAddress} numberOfLines={1}>
                      {item.address || 'Prime Location'}
                    </Text>
                    <View style={styles.vertSpecsRow}>
                      {item.bedrooms !== undefined && item.bedrooms !== null ? (
                        <Text style={styles.vertSpecText}>{item.bedrooms} bd · </Text>
                      ) : null}
                      {item.bathrooms !== undefined && item.bathrooms !== null ? (
                        <Text style={styles.vertSpecText}>{item.bathrooms} ba · </Text>
                      ) : null}
                      {item.area_sqft ? (
                        <Text style={styles.vertSpecText}>{item.area_sqft} sqft</Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {/* Floating Bottom-Center "Map" Toggle Pill */}
          <View style={styles.bottomPillWrap} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.viewTogglePill}
              onPress={() => setViewMode('map')}
              activeOpacity={0.88}
            >
              <Ionicons name="map" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.viewToggleText}>Map</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 7. Comprehensive Filter Modal Bottom Sheet */}
      <MobileFilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filters={modalFilters}
        totalMatches={displayedProperties.length}
        onApply={(newFilters) => {
          setModalFilters(newFilters);
          fetchHomes(searchQuery, activeQuickFilter, newFilters);
        }}
        onReset={() => {
          setModalFilters({});
          fetchHomes(searchQuery, activeQuickFilter, {});
        }}
      />

      {/* 8. Save Search & Boundary Alert Modal */}
      <MobileSaveSearchModal
        visible={isSaveSearchModalVisible}
        onClose={() => setIsSaveSearchModalVisible(false)}
        searchQuery={searchQuery}
        regionName={activeRegion?.name}
        modalFilters={modalFilters}
        activeQuickFilter={activeQuickFilter}
        drawnPolygon={drawnPolygon}
        onSaved={(savedItem) => {
          setIsSearchSaved(true);
          const freqLabel =
            savedItem.notification_frequency === 'DAILY'
              ? 'Daily digest active'
              : savedItem.notification_frequency === 'NEVER'
              ? 'Alerts off'
              : 'Instant alerts active';
          showSavedSearchToast(savedItem.name, freqLabel);
        }}
        onDeleted={() => {
          setIsSearchSaved(false);
        }}
      />

      {/* 9. iOS-style Top Floating Toast Banner */}
      {savedSearchToast && (
        <RNAnimated.View
          style={[
            styles.toastBanner,
            {
              top: insets.top + 8,
              transform: [{ translateY: toastAnim }],
            },
          ]}
        >
          <View style={styles.toastIconWrap}>
            <Ionicons name="bookmark" size={17} color="#ffffff" />
          </View>
          <View style={styles.toastTextWrap}>
            <Text style={styles.toastTitle} numberOfLines={1}>
              Saved "{savedSearchToast.name}"
            </Text>
            <Text style={styles.toastSubtitle} numberOfLines={1}>
              {savedSearchToast.frequency} • Saved to profile
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/saved')}
            style={styles.toastActionPill}
            activeOpacity={0.8}
          >
            <Text style={styles.toastActionText}>View</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
  },
  map: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Price Pill Markers
  markerAnchor: {
    alignItems: 'center',
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 4,
  },
  pricePillDefault: {
    backgroundColor: '#e11d48',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  pricePillSelected: {
    backgroundColor: '#be123c',
    borderWidth: 2,
    borderColor: '#ffffff',
    transform: [{ scale: 1.15 }],
  },
  pricePillViewed: {
    backgroundColor: '#fff1f2',
    borderWidth: 1.5,
    borderColor: '#fecdd3',
  },
  pricePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pricePillTextDefault: {
    color: '#ffffff',
  },
  pricePillTextSelected: {
    color: '#ffffff',
    fontWeight: '900',
  },
  pricePillTextViewed: {
    color: '#9f1239',
  },
  markerCaret: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  markerCaretDefault: {
    borderTopColor: '#e11d48',
  },
  markerCaretSelected: {
    borderTopColor: '#be123c',
  },
  markerCaretViewed: {
    borderTopColor: '#fff1f2',
  },

  // Top Stationary Header
  stationaryTopHeaderWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'transparent',
  },
  topFloatingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
    zIndex: 2,
  },
  searchPill: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInputText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  searchPlaceholderText: {
    color: '#64748b',
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterCircleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  filterCircleButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#2563eb',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 9.5,
    fontWeight: '800',
  },
  drawnShapeBannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 64 : 68,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 34,
  },
  // Floating 3D Perspective Tilt Button (Positioned cleanly on top-right below the circular filter button)
  floating3DWrap: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 66 : 70,
    right: 16,
    zIndex: 35,
  },
  floating3DCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  floating3DCircleActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  floating3DText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  floating3DTextActive: {
    color: '#ffffff',
  },
  quickFilterList: {
    paddingTop: 8,
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  quickChipActive: {
    backgroundColor: '#0f172a',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  quickChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Sub Bar (Draw, Search as move, Clear)
  subBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subPillActive: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  subPillMoveActive: {
    borderColor: '#cbd5e1',
  },
  subPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  subPillTextActive: {
    color: '#ffffff',
  },
  microDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    marginRight: 6,
  },
  microDotActive: {
    backgroundColor: '#059669',
  },
  clearBoundaryPill: {
    backgroundColor: '#fff1f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  clearBoundaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e11d48',
  },

  // Bottom Summary Sheet Card (Zillow Style)
  bottomSummaryCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 32 : 18,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    zIndex: 30,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
  },
  carouselAbsoluteWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 50,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },



  // Fullscreen Vertical List View
  listContainer: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8fafc',
    zIndex: 35,
  },
  verticalListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 90,
    gap: 16,
  },
  vertCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  vertImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  vertImage: {
    width: '100%',
    height: '100%',
  },
  vertPriceTag: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#e11d48',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  vertPriceText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  vertHeartBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vertDetails: {
    padding: 14,
  },
  vertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  vertAddress: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  vertSpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  vertSpecText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },

  // Floating Bottom "List / Map" Toggle Pill
  bottomPillWrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  viewTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  viewToggleText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },

  // iOS Top Floating Toast Banner
  toastBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toastIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  toastSubtitle: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
    marginTop: 2,
  },
  toastActionPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  toastActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
