import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  FlatList,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ZillowDrawIcon } from './ZillowIcons';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_INNER_WIDTH = CARD_WIDTH - 2;

export type SheetSnapState = 'PEEK' | 'DUAL' | 'FULL';

export interface MobileTriStateBottomSheetProps {
  availableHeight?: number;
  snapState: SheetSnapState;
  onSnapChange: (state: SheetSnapState) => void;
  properties: any[];
  selectedPropertyId: string | null;
  onSelectProperty: (property: any) => void;
  onToggleFavorite: (id: string) => void;
  isSaved: (id: string) => boolean;
  listType: 'SALE' | 'RENT' | string;
  onHeightChange?: (height: number) => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  mapType?: 'standard' | 'satellite';
  onToggleMapType?: () => void;
  isDrawingMode?: boolean;
  onStartDraw?: () => void;
  onRecenter?: () => void;
  isSearchSaved?: boolean;
  onToggleSaveSearch?: () => void;
  searchQuery?: string;
  onOpenSearchModal?: () => void;
  onClearSearch?: () => void;
  regionName?: string;
  translateYAnim?: Animated.Value;
  searchRowTotalHeight?: number;
}

// Fallback high-res luxury architectural photos for carousel preview
const FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
];

/**
 * Format property price supporting:
 * - US/Dollar: $2,500/mo
 * - INR: ₹45k/mo, ₹1.2 L/mo, ₹3.5 Cr
 */
export function formatPropertyPrice(price: number, listType?: string): string {
  if (!price && price !== 0) return '--';
  const isRent = listType === 'RENT';
  const suffix = isRent ? '/mo' : '';

  // USD style rent / price
  if (price > 0 && price <= 15000) {
    return `$${price.toLocaleString()}${suffix}`;
  }
  // INR Crores
  if (price >= 10000000) {
    const cr = price / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr${suffix}`;
  }
  // INR Lakhs
  if (price >= 100000) {
    const l = price / 100000;
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L${suffix}`;
  }
  // INR Thousands
  if (price >= 1000) {
    return `₹${(price / 1000).toFixed(0)}k${suffix}`;
  }
  return `₹${price.toLocaleString()}${suffix}`;
}

interface LuxuryPropertyCardProps {
  property: any;
  isSelected: boolean;
  isFavorite: boolean;
  listType: string;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onSwipeDown?: () => void;
  isAtTop?: () => boolean;
}

const LuxuryPropertyCard = React.memo<LuxuryPropertyCardProps>(({
  property,
  isSelected,
  isFavorite,
  listType,
  onSelect,
  onToggleFavorite,
  onSwipeDown,
  isAtTop,
}) => {
  const router = useRouter();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const cardTouchStartY = useRef(0);
  const cardTouchStartedAtTop = useRef(false);

  // Collect up to 5 images for carousel
  const photos = useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(property.property_media) && property.property_media.length > 0) {
      property.property_media.forEach((m: any) => {
        if (m?.url) list.push(m.url);
      });
    }
    if (Array.isArray(property.images)) {
      property.images.forEach((img: any) => {
        if (typeof img === 'string') list.push(img);
      });
    }
    if (Array.isArray(property.photos)) {
      property.photos.forEach((p: any) => {
        if (typeof p === 'string') list.push(p);
      });
    }
    if (property.thumbnailUrl) list.push(property.thumbnailUrl);
    if (property.imageUrl) list.push(property.imageUrl);

    // Complement with high-res photos to ensure 5 dots
    let i = 0;
    while (list.length < 5 && i < FALLBACK_PHOTOS.length) {
      if (!list.includes(FALLBACK_PHOTOS[i])) {
        list.push(FALLBACK_PHOTOS[i]);
      }
      i++;
    }
    return list.slice(0, 5);
  }, [property]);

  // Contextual badge (e.g. Cozy fireplace, 2 Months Free, Verified)
  const badge = useMemo(() => {
    if (property.badge) return { label: property.badge, icon: 'sparkles' };
    if (property.specialOffer) return { label: property.specialOffer, icon: 'pricetag' };
    if (property.isVerified) return { label: 'Verified', icon: 'shield-checkmark' };
    const id = String(property.id || '');
    if (id.endsWith('1') || id.endsWith('a')) {
      return { label: 'Cozy fireplace', icon: 'flame' };
    }
    if (id.endsWith('2') || id.endsWith('b')) {
      return { label: '2 Months Free', icon: 'gift' };
    }
    return { label: 'Verified', icon: 'shield-checkmark' };
  }, [property]);

  // Specs string (e.g. "1 bd | 1 ba | 756 sqft | Apartment for rent")
  const specsText = useMemo(() => {
    const parts: string[] = [];
    if (property.bedrooms !== undefined && property.bedrooms !== null) {
      parts.push(`${property.bedrooms} bd`);
    }
    if (property.bathrooms !== undefined && property.bathrooms !== null) {
      parts.push(`${property.bathrooms} ba`);
    }
    if (property.area_sqft) {
      parts.push(`${property.area_sqft.toLocaleString()} sqft`);
    }
    const rawType = property.prop_type || 'Apartment';
    const cleanType = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
    const action = listType === 'RENT' ? 'for rent' : 'for sale';
    parts.push(`${cleanType} ${action}`);
    return parts.join(' | ');
  }, [property, listType]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / CARD_INNER_WIDTH);
      if (index >= 0 && index < photos.length && index !== activePhotoIndex) {
        setActivePhotoIndex(index);
      }
    },
    [photos.length, activePhotoIndex]
  );

  const handleCardPress = () => {
    onSelect();
    if (property.id) {
      router.push(`/property/${property.id}`);
    }
  };

  const handleCallPress = () => {
    const phone = property.phone || '+1234567890';
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  return (
    <View
      onTouchStart={(e) => {
        cardTouchStartY.current = e.nativeEvent.pageY;
        cardTouchStartedAtTop.current = isAtTop ? isAtTop() : true;
      }}
      onTouchMove={(e) => {
        if (onSwipeDown && cardTouchStartedAtTop.current) {
          if (cardTouchStartY.current === 0) {
            cardTouchStartY.current = e.nativeEvent.pageY;
            return;
          }
          const dy = e.nativeEvent.pageY - cardTouchStartY.current;
          if (dy > 12) {
            onSwipeDown();
          }
        }
      }}
      onTouchEnd={() => {
        cardTouchStartY.current = 0;
        cardTouchStartedAtTop.current = false;
      }}
      onTouchCancel={() => {
        cardTouchStartY.current = 0;
        cardTouchStartedAtTop.current = false;
      }}
    >
      <TouchableOpacity
        style={styles.cardContainer}
        activeOpacity={0.96}
        onPress={handleCardPress}
      >
      {/* 1. Image Carousel Container */}
      <View style={styles.cardImageWrapper}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {photos.map((photoUrl, idx) => (
            <Image
              key={`photo-${idx}`}
              source={{ uri: photoUrl }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Top-Left Special Badge */}
        <View style={styles.badgeWrapper}>
          <Ionicons name={badge.icon as any} size={12} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>

        {/* Top-Right Favorite Heart */}
        <TouchableOpacity
          style={styles.cardHeartBtn}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorite ? '#ef4444' : '#ffffff'}
          />
        </TouchableOpacity>

        {/* Bottom Pagination Dots */}
        <View style={styles.dotsContainer} pointerEvents="none">
          {photos.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                activePhotoIndex === idx && styles.dotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* 2. Card Details */}
      <View style={styles.cardBody}>
        {/* Price & Total Monthly Price Badge */}
        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>
            {formatPropertyPrice(property.price, listType)}
          </Text>
          <View style={styles.totalMonthlyBadge}>
            <View style={styles.bulletDot} />
            <Text style={styles.totalMonthlyText}>Total monthly price</Text>
          </View>
        </View>

        {/* Specs: 1 bd | 1 ba | 756 sqft | Apartment for rent */}
        <Text style={styles.specsText} numberOfLines={1}>
          {specsText}
        </Text>

        {/* Address */}
        <Text style={styles.addressText} numberOfLines={1}>
          {property.address || '1530 N Poinsettia Pl #120, Los Angeles, CA'}
        </Text>

        {/* Actions Row: [ 📞 ] + [ Check availability ] */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.callButton}
            onPress={handleCallPress}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={18} color="#0f172a" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.availabilityButton}
            onPress={handleCardPress}
            activeOpacity={0.88}
          >
            <Text style={styles.availabilityButtonText}>Check availability</Text>
          </TouchableOpacity>
        </View>
      </View>
      </TouchableOpacity>
    </View>
  );
});

export const MobileTriStateBottomSheet: React.FC<MobileTriStateBottomSheetProps> = ({
  availableHeight,
  snapState,
  onSnapChange,
  properties,
  selectedPropertyId,
  onSelectProperty,
  onToggleFavorite,
  isSaved,
  listType,
  onHeightChange,
  onOpenFilters: _onOpenFilters,
  activeFilterCount: _activeFilterCount = 0,
  mapType,
  onToggleMapType,
  isDrawingMode = false,
  onStartDraw,
  onRecenter,
  isSearchSaved: isSearchSavedProp,
  onToggleSaveSearch,
  searchQuery: _searchQuery = '',
  onOpenSearchModal: _onOpenSearchModal,
  onClearSearch: _onClearSearch,
  regionName: _regionName,
  translateYAnim: externalTranslateYAnim,
  searchRowTotalHeight,
}) => {
  const insets = useSafeAreaInsets();
  const [sortOption, setSortOption] = useState<'Recommended' | 'Price: Low' | 'Price: High'>('Recommended');
  const [localSearchSaved, setLocalSearchSaved] = useState(false);
  const isSearchSaved = isSearchSavedProp !== undefined ? isSearchSavedProp : localSearchSaved;

  const handleToggleSaveSearch = () => {
    if (onToggleSaveSearch) {
      onToggleSaveSearch();
    } else {
      setLocalSearchSaved(!localSearchSaved);
    }
  };

  // Status bar padding calculation matching Zillow
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : insets.top;
  const headerPaddingTop = statusBarHeight + 8;
  const computedSearchRowTotalHeight = searchRowTotalHeight || (headerPaddingTop + 56);

  // Calibrated Heights & Snap Point Geometry
  const fullHeight = availableHeight || (SCREEN_HEIGHT - 60);
  const PEEK_HEIGHT = 72;
  const DUAL_HEIGHT = Math.round(fullHeight * 0.44);
  const fullY = 0;
  const dualY = fullHeight - DUAL_HEIGHT;
  const peekY = fullHeight - PEEK_HEIGHT;
  const midY = (dualY + fullY) / 2;

  const getSnapTranslateY = useCallback(
    (state: SheetSnapState) => {
      switch (state) {
        case 'FULL':
          return 0;
        case 'DUAL':
          return dualY;
        case 'PEEK':
          return peekY;
      }
    },
    [dualY, peekY]
  );

  const internalTranslateY = useRef(new Animated.Value(getSnapTranslateY(snapState))).current;
  const translateYAnim = externalTranslateYAnim || internalTranslateY;
  const currentTranslateYRef = useRef(getSnapTranslateY(snapState));
  const dragStartTranslateY = useRef(getSnapTranslateY(snapState));
  const isSwipingDownHandledRef = useRef(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollYRef = useRef(0);
  const listTouchStartY = useRef(0);
  const listTouchStartedAtTop = useRef(false);

  const resetListToTop = useCallback(() => {
    scrollYRef.current = 0;
    try {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (e) {
      // safe fallback
    }
  }, []);

  // Sync internal translateY on snapState prop changes
  useEffect(() => {
    currentTranslateYRef.current = getSnapTranslateY(snapState);
  }, [snapState, getSnapTranslateY]);

  // Ultra-fluid GPU-accelerated spring animation with useNativeDriver: true!
  const animateToState = useCallback(
    (state: SheetSnapState) => {
      const targetY = getSnapTranslateY(state);
      Animated.spring(translateYAnim, {
        toValue: targetY,
        damping: 28,
        stiffness: 300,
        mass: 0.8,
        useNativeDriver: true,
      }).start(() => {
        currentTranslateYRef.current = targetY;
        isSwipingDownHandledRef.current = false;
      });
    },
    [getSnapTranslateY, translateYAnim]
  );

  const triggerGlideToDual = useCallback(() => {
    if (snapState === 'FULL' && !isSwipingDownHandledRef.current) {
      isSwipingDownHandledRef.current = true;
      resetListToTop();
      onSnapChange('DUAL');
      animateToState('DUAL');
    }
  }, [snapState, resetListToTop, onSnapChange, animateToState]);

  // React to snapState changes from parent
  useEffect(() => {
    animateToState(snapState);
  }, [snapState, animateToState]);

  // Docked Content Translation: stays docked at computedSearchRowTotalHeight as container moves from 0 to computedSearchRowTotalHeight
  const contentTranslateY = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [0, computedSearchRowTotalHeight],
        outputRange: [computedSearchRowTotalHeight, 0],
        extrapolate: 'clamp',
      }),
    [translateYAnim, computedSearchRowTotalHeight]
  );

  // 60fps GPU Native Driver Animated Interpolations
  const countRowOpacity = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [0, computedSearchRowTotalHeight * 0.4, computedSearchRowTotalHeight],
        outputRange: [0, 0.4, 1],
        extrapolate: 'clamp',
      }),
    [translateYAnim, computedSearchRowTotalHeight]
  );

  const sortRowOpacity = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [0, computedSearchRowTotalHeight * 0.4, computedSearchRowTotalHeight],
        outputRange: [1, 0.6, 0],
        extrapolate: 'clamp',
      }),
    [translateYAnim, computedSearchRowTotalHeight]
  );

  const hudOpacity = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [0, Math.max(1, dualY - 80), dualY - 20, dualY, peekY],
        outputRange: [0, 0, 0.7, 1, 1],
        extrapolate: 'clamp',
      }),
    [translateYAnim, dualY, peekY]
  );

  const containerBorderRadius = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [0, 30, computedSearchRowTotalHeight],
        outputRange: [0, 14, 24],
        extrapolate: 'clamp',
      }),
    [translateYAnim, computedSearchRowTotalHeight]
  );

  const bottomMapButtonOpacity = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [0, 30, 80],
        outputRange: [1, 0.8, 0],
        extrapolate: 'clamp',
      }),
    [translateYAnim]
  );

  const handleListScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      scrollYRef.current = Math.max(0, offsetY);
      if (snapState === 'FULL' && offsetY < -12) {
        triggerGlideToDual();
      }
    },
    [snapState, triggerGlideToDual]
  );

  // Universal PanResponder for PEEK & DUAL modes (swiping anywhere on container drags sheet)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (snapState === 'FULL') return false; // in FULL mode, FlatList scrolls natively and RefreshControl/overscroll handles pull-down
          return Math.abs(gesture.dy) > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
        },
        onPanResponderGrant: () => {
          dragStartTranslateY.current = currentTranslateYRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const target = dragStartTranslateY.current + gesture.dy;
          const minTranslate = 0;
          const maxTranslate = peekY;
          const clamped = Math.min(maxTranslate + 10, Math.max(minTranslate, target));
          currentTranslateYRef.current = clamped;
          translateYAnim.setValue(clamped);
        },
        onPanResponderRelease: (_, gesture) => {
          const vy = gesture.vy;
          const dy = gesture.dy;
          let nextState: SheetSnapState = snapState;

          if (snapState === 'FULL') {
            if (dy > 20 || vy > 0.15) {
              nextState = 'DUAL';
            } else {
              nextState = 'FULL';
            }
          } else if (snapState === 'DUAL') {
            if (dy < -20 || vy < -0.15) {
              nextState = 'FULL';
            } else if (dy > 20 || vy > 0.15) {
              nextState = 'PEEK';
            } else {
              nextState = 'DUAL';
            }
          } else {
            if (dy < -8 || vy < -0.1) {
              nextState = 'DUAL';
            } else {
              nextState = 'PEEK';
            }
          }

          if (nextState !== 'FULL') {
            resetListToTop();
          }

          if (nextState !== snapState) {
            onSnapChange(nextState);
          }
          animateToState(nextState);
        },
      }),
    [snapState, onSnapChange, animateToState, peekY, translateYAnim, resetListToTop]
  );

  // Header PanResponder to allow dragging down on the header in FULL mode
  const headerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          return snapState === 'FULL' && gesture.dy > 10 && gesture.dy > Math.abs(gesture.dx);
        },
        onPanResponderGrant: () => {
          dragStartTranslateY.current = 0;
        },
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 10) {
            triggerGlideToDual();
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 10 || gesture.vy > 0.15) {
            triggerGlideToDual();
          } else {
            animateToState('FULL');
          }
        },
      }),
    [snapState, triggerGlideToDual, animateToState]
  );

  const handleHeaderPress = () => {
    if (snapState === 'PEEK') {
      onSnapChange('DUAL');
      animateToState('DUAL');
    } else if (snapState === 'DUAL') {
      onSnapChange('FULL');
      animateToState('FULL');
    }
  };

  const handleSortToggle = () => {
    if (sortOption === 'Recommended') setSortOption('Price: Low');
    else if (sortOption === 'Price: Low') setSortOption('Price: High');
    else setSortOption('Recommended');
  };

  const sortedProperties = useMemo(() => {
    if (!properties || properties.length === 0) return [];
    const copy = [...properties];
    if (sortOption === 'Price: Low') {
      copy.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortOption === 'Price: High') {
      copy.sort((a, b) => (b.price || 0) - (a.price || 0));
    }
    return copy;
  }, [properties, sortOption]);

  const countText = `${(properties || []).length.toLocaleString()} ${
    listType === 'RENT' ? 'rentals' : 'homes'
  } available`;

  return (
    <Animated.View
      style={[
        styles.sheetContainer,
        snapState === 'FULL' && styles.sheetContainerFull,
        {
          height: fullHeight,
          borderTopLeftRadius: containerBorderRadius,
          borderTopRightRadius: containerBorderRadius,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* 0. Anchored Floating Action HUD Row: Layer | Draw | Recenter | Save Search */}
      <Animated.View
        style={[
          styles.anchoredHudContainer,
          { opacity: hudOpacity },
        ]}
        pointerEvents={snapState === 'FULL' ? 'none' : 'box-none'}
      >
        {/* Left circular HUD buttons */}
        <View style={styles.hudLeftGroup}>
          {/* Map Layer (Satellite / Standard) */}
          {onToggleMapType && (
            <TouchableOpacity
              style={[styles.hudCircle, mapType === 'satellite' && styles.hudCircleActive]}
              onPress={onToggleMapType}
              activeOpacity={0.85}
            >
              <Ionicons
                name={mapType === 'satellite' ? 'earth' : 'earth-outline'}
                size={20}
                color={mapType === 'satellite' ? '#ffffff' : '#0f172a'}
              />
            </TouchableOpacity>
          )}

          {/* Touch Draw Button with ZillowDrawIcon */}
          {onStartDraw && (
            <TouchableOpacity
              style={[styles.hudCircle, isDrawingMode && styles.hudCircleActive]}
              onPress={onStartDraw}
              activeOpacity={0.85}
            >
              <ZillowDrawIcon size={22} color={isDrawingMode ? '#ffffff' : '#0f172a'} />
            </TouchableOpacity>
          )}

          {/* Recenter / My Location */}
          {onRecenter && (
            <TouchableOpacity
              style={styles.hudCircle}
              onPress={onRecenter}
              activeOpacity={0.85}
            >
              <Ionicons name="locate" size={20} color="#0f172a" />
            </TouchableOpacity>
          )}
        </View>

        {/* Right Save Search Pill */}
        <TouchableOpacity
          style={[
            styles.anchoredSaveSearchPill,
            isSearchSaved && styles.anchoredSaveSearchPillActive,
          ]}
          onPress={handleToggleSaveSearch}
          activeOpacity={0.88}
        >
          <Ionicons
            name={isSearchSaved ? 'checkmark-circle' : 'search'}
            size={14}
            color="#ffffff"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.anchoredSaveSearchText}>
            {isSearchSaved ? 'Saved' : 'Save search'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 1C. Subheader Row & Feed Container */}
      <Animated.View
        style={[
          styles.mainContentContainer,
          { transform: [{ translateY: contentTranslateY }] },
        ]}
      >
        {/* Subheader Row: Cross-fades between count+handle and sort+save */}
        <View
          {...(snapState === 'FULL' ? headerPanResponder.panHandlers : {})}
          style={styles.subHeaderRowContainer}
        >
          {/* Layer A (PEEK / DUAL): Grab Handle + Centered Count Available */}
          <Animated.View
            style={[
              styles.countSubheaderLayer,
              { opacity: countRowOpacity },
            ]}
            pointerEvents={snapState === 'FULL' ? 'none' : 'auto'}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleHeaderPress}
              style={styles.handleTouchable}
            >
              <View style={styles.grabHandle} />
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>{countText}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Layer B (FULL): Sort: {sortOption} ⇅ | Save Search */}
          <Animated.View
            style={[
              styles.sortSubheaderLayer,
              { opacity: sortRowOpacity },
            ]}
            pointerEvents={snapState === 'FULL' ? 'auto' : 'none'}
          >
            <TouchableOpacity
              style={styles.zillowSortButton}
              onPress={handleSortToggle}
              activeOpacity={0.7}
            >
              <Text style={styles.zillowSortText}>
                Sort: {sortOption}
              </Text>
              <Ionicons name="swap-vertical" size={14} color="#006aff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.zillowSaveButton}
              onPress={handleToggleSaveSearch}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSearchSaved ? 'checkmark-circle' : 'search'}
                size={14}
                color="#006aff"
                style={{ marginRight: 5 }}
              />
              <Text style={styles.zillowSaveText}>
                {isSearchSaved ? 'Saved' : 'Save search'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Thin Divider Border below the subheader */}
        <View style={styles.headerDivider} />

        {/* Property Cards Feed - ALWAYS mounted to eliminate unmounting/mounting freeze! */}
        <FlatList
          ref={flatListRef}
          data={sortedProperties}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          onScroll={handleListScroll}
          scrollEventThrottle={16}
          onTouchStart={(e) => {
            listTouchStartY.current = e.nativeEvent.pageY;
            listTouchStartedAtTop.current = scrollYRef.current <= 5;
          }}
          onTouchMove={(e) => {
            if (snapState === 'FULL' && listTouchStartedAtTop.current) {
              if (listTouchStartY.current === 0) {
                listTouchStartY.current = e.nativeEvent.pageY;
                return;
              }
              const dy = e.nativeEvent.pageY - listTouchStartY.current;
              if (dy > 12) {
                triggerGlideToDual();
              }
            }
          }}
          onTouchEnd={() => {
            listTouchStartY.current = 0;
            listTouchStartedAtTop.current = false;
          }}
          onTouchCancel={() => {
            listTouchStartY.current = 0;
            listTouchStartedAtTop.current = false;
          }}
          getItemLayout={(_, index) => ({
            length: 356,
            offset: 356 * index,
            index,
          })}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          scrollEnabled={snapState === 'FULL'}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: snapState === 'FULL' ? insets.bottom + 80 + computedSearchRowTotalHeight : 32 },
          ]}
          renderItem={({ item }) => (
            <LuxuryPropertyCard
              property={item}
              isSelected={item.id === selectedPropertyId}
              isFavorite={isSaved(item.id)}
              listType={listType}
              onSwipeDown={snapState === 'FULL' ? triggerGlideToDual : undefined}
              isAtTop={() => scrollYRef.current <= 5}
              onSelect={() => onSelectProperty(item)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="home-outline" size={40} color="#cbd5e1" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No listings in this area</Text>
              <Text style={styles.emptySubtitle}>
                Try zooming out or moving the map to discover homes.
              </Text>
            </View>
          }
        />
      </Animated.View>

      {/* When in FULL: Floating bottom pill [ 🗺️ Map ] - instantly switches to PEEK mode! */}
      <Animated.View
        style={[
          styles.floatingMapPillWrap,
          {
            bottom: insets.bottom + 16,
            opacity: bottomMapButtonOpacity,
          },
        ]}
        pointerEvents={snapState === 'FULL' ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={styles.floatingMapPill}
          onPress={() => {
            resetListToTop();
            onSnapChange('PEEK');
            animateToState('PEEK');
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="map" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.floatingMapPillText}>Map</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    zIndex: 40,
    overflow: 'visible',
  },
  sheetContainerFull: {
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  mainContentContainer: {
    flex: 1,
    width: '100%',
  },
  subHeaderRowContainer: {
    height: 48,
    position: 'relative',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  countSubheaderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  sortSubheaderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
  },
  zillowSortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  zillowSortText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#006aff',
  },
  zillowSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  zillowSaveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#006aff',
  },
  anchoredHudContainer: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 45,
  },
  hudLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudCircle: {
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
  hudCircleActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  anchoredSaveSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 22,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  anchoredSaveSearchPillActive: {
    backgroundColor: '#059669',
  },
  anchoredSaveSearchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerWrapper: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
  },
  handleTouchable: {
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 30,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  subHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  saveSearchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  saveSearchPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  saveSearchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  saveSearchTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Luxury Property Card
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImageWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  cardImage: {
    width: CARD_INNER_WIDTH,
    height: 200,
  },
  badgeWrapper: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardHeartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  dotActive: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ffffff',
  },
  cardBody: {
    padding: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  totalMonthlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  totalMonthlyText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  specsText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  availabilityButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  floatingMapPillWrap: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 50,
  },
  floatingMapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingMapPillText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default MobileTriStateBottomSheet;
