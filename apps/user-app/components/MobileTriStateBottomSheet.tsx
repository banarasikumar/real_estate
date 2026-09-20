import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector, FlatList } from 'react-native-gesture-handler';
import { ZillowDrawIcon } from './ZillowIcons';
import { MobilePropertyCardCarousel } from './MobilePropertyCardCarousel';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_INNER_WIDTH = CARD_WIDTH - 2;

export type SheetSnapState = 'MINI_PEEK' | 'PEEK' | 'DUAL' | 'FULL';

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
  translateYAnim?: SharedValue<number>;
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
 * Format property price strictly in Indian Rupees (₹ Cr / ₹ L / ₹k).
 */
export function formatPropertyPrice(price: number, listType?: string): string {
  if (!price && price !== 0) return '₹--';
  const isRent = listType === 'RENT';
  const suffix = isRent ? '/mo' : '';

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
  return `₹${price.toLocaleString('en-IN')}${suffix}`;
}

interface LuxuryPropertyCardProps {
  property: any;
  isSelected: boolean;
  isFavorite: boolean;
  listType: string;
  onSelect: (property: any) => void;
  onToggleFavorite: (id: string) => void;
}

const LuxuryPropertyCard = React.memo<LuxuryPropertyCardProps>(({
  property,
  isSelected,
  isFavorite,
  listType,
  onSelect,
  onToggleFavorite,
}) => {
  const router = useRouter();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

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

  const handleCardPress = useCallback(() => {
    onSelect(property);
    if (property.id) {
      router.push(`/property/${property.id}`);
    }
  }, [property, onSelect, router]);

  const handleFavoritePress = useCallback(
    (e: any) => {
      e.stopPropagation();
      onToggleFavorite(property.id);
    },
    [property.id, onToggleFavorite]
  );

  const handleCallPress = () => {
    const phone = property.phone || '+1234567890';
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  return (
    <View style={styles.cardContainer}>
      {/* 1. Image Carousel Container */}
      <View style={styles.cardImageWrapper}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={CARD_INNER_WIDTH}
          directionalLockEnabled={true}
          nestedScrollEnabled={true}
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
          onPress={handleFavoritePress}
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
      <TouchableOpacity
        style={styles.cardBody}
        activeOpacity={0.96}
        onPress={handleCardPress}
      >
        {/* Price & Total Monthly Price Badge */}
        <View style={styles.priceRow}>
          <Text style={styles.priceValue}>
            {formatPropertyPrice(property.price, listType)}
          </Text>
          {listType === 'RENT' && (
            <View style={styles.totalMonthlyBadge}>
              <View style={styles.bulletDot} />
              <Text style={styles.totalMonthlyText}>Total monthly price</Text>
            </View>
          )}
        </View>

        {/* Specs: 1 bd | 1 ba | 756 sqft | Apartment for rent */}
        <Text style={styles.specsText} numberOfLines={1}>
          {specsText}
        </Text>

        {/* Address */}
        <Text style={styles.addressText} numberOfLines={1}>
          {property.address || 'Bandra West, Mumbai'}
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
  const bottomInset = insets.bottom || (Platform.OS === 'android' ? 12 : 0);
  const MINI_PEEK_HEIGHT = 28;
  const PEEK_HEIGHT = 68;
  const DUAL_HEIGHT = Math.round(fullHeight * 0.44);
  // In FULL mode, the single sheet expands to the absolute top of the screen (0),
  // smoothly flattening its top corners and wiping out the search bar background.
  const fullY = 0;
  const dualY = fullHeight - DUAL_HEIGHT;
  const peekY = fullHeight - PEEK_HEIGHT;
  const miniPeekY = fullHeight - MINI_PEEK_HEIGHT;
  const midY = (dualY + computedSearchRowTotalHeight) / 2;

  const getSnapTranslateY = useCallback(
    (state: SheetSnapState) => {
      'worklet';
      switch (state) {
        case 'FULL':
          return fullY;
        case 'DUAL':
          return dualY;
        case 'PEEK':
          return peekY;
        case 'MINI_PEEK':
          return miniPeekY;
      }
    },
    [fullY, dualY, peekY, miniPeekY]
  );

  const internalTranslateY = useSharedValue(getSnapTranslateY(snapState));
  const translateYAnim = externalTranslateYAnim || internalTranslateY;
  const dragStartY = useSharedValue(getSnapTranslateY(snapState));
  const currentSnapState = useSharedValue<SheetSnapState>(snapState);
  const isDraggingSheetFromList = useSharedValue(false);

  // Strict Feed Scroll Lock: Listing cards scroll vertically ONLY when fully settled in FULL mode
  const [isSettledInFull, setIsSettledInFull] = useState(snapState === 'FULL');
  const isSettledInFullShared = useSharedValue(snapState === 'FULL');

  const setSettledInFullJS = useCallback((val: boolean) => {
    setIsSettledInFull(val);
  }, []);

  const flatListRef = useRef<FlatList>(null);
  const scrollYRef = useRef(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const isAtTopRef = useRef(true);

  // Tracks in-flight gesture snap target so React prop sync does NOT re-trigger or reverse gesture animations
  const pendingGestureStateRef = useRef<SheetSnapState | null>(null);

  const resetListToTop = useCallback(() => {
    scrollYRef.current = 0;
    isAtTopRef.current = true;
    setIsAtTop(true);
    try {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (e) {
      // safe fallback
    }
  }, []);

  // Ultra-fluid zero-bounce GPU spring animation with exact critical damping (zeta = 1.00) & overshootClamping
  const animateToState = useCallback(
    (state: SheetSnapState, velocity?: number) => {
      const targetY = getSnapTranslateY(state);

      cancelAnimation(translateYAnim);

      if (state !== 'FULL') {
        isSettledInFullShared.value = false;
        runOnJS(setSettledInFullJS)(false);
      }

      const clampedVelocity =
        velocity !== undefined ? Math.max(-8, Math.min(8, velocity)) : undefined;

      translateYAnim.value = withSpring(
        targetY,
        {
          damping: 24,
          stiffness: 320,
          mass: 0.45,
          overshootClamping: true,
          velocity: clampedVelocity,
        },
        (finished) => {
          'worklet';
          if (finished && state === 'FULL') {
            isSettledInFullShared.value = true;
            runOnJS(setSettledInFullJS)(true);
          }
        }
      );
    },
    [getSnapTranslateY, translateYAnim, isSettledInFullShared, setSettledInFullJS]
  );

  // React to external snapState changes (e.g. user tapped map, dismissed, or routed)
  useEffect(() => {
    // 1. If this prop change matches what a user gesture already initiated, clear ref and DO NOT re-animate
    if (pendingGestureStateRef.current === snapState) {
      pendingGestureStateRef.current = null;
      return;
    }

    // 2. If a more recent gesture is pending, ignore this stale intermediate prop update from React's queue
    if (pendingGestureStateRef.current !== null) {
      return;
    }

    // 3. This is an external/programmatic prop change:
    currentSnapState.value = snapState;
    if (snapState !== 'FULL') {
      resetListToTop();
      setIsSettledInFull(false);
      isSettledInFullShared.value = false;
    }
    animateToState(snapState);
  }, [snapState, animateToState, resetListToTop, selectedPropertyId, isSettledInFullShared, currentSnapState]);

  // 60fps GPU Native Driver Animated Interpolations via Reanimated
  const sheetAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateYAnim.value }],
    };
  });

  // Docked Content Translation: stays docked at computedSearchRowTotalHeight as container moves from 0 to computedSearchRowTotalHeight
  const contentDockingStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      translateYAnim.value,
      [0, computedSearchRowTotalHeight],
      [computedSearchRowTotalHeight, 0],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY }],
    };
  });

  // Smooth iOS-grade corner radius (28px curve), subtle hairline border, and shadow flattening
  const containerBorderRadiusStyle = useAnimatedStyle(() => {
    const radius = interpolate(
      translateYAnim.value,
      [0, 30, computedSearchRowTotalHeight],
      [0, 16, 28],
      Extrapolation.CLAMP
    );
    const borderAlpha = interpolate(
      translateYAnim.value,
      [0, computedSearchRowTotalHeight, dualY],
      [0, 0.05, 0.08],
      Extrapolation.CLAMP
    );
    const shadowOpacity = interpolate(
      translateYAnim.value,
      [0, computedSearchRowTotalHeight, dualY],
      [0, 0.08, 0.12],
      Extrapolation.CLAMP
    );
    const elevation = interpolate(
      translateYAnim.value,
      [0, computedSearchRowTotalHeight, dualY],
      [0, 3, 6],
      Extrapolation.CLAMP
    );
    return {
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      borderTopWidth: 1,
      borderTopColor: `rgba(0, 0, 0, ${borderAlpha})`,
      shadowOpacity,
      elevation,
    };
  });

  const countRowAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateYAnim.value,
        [computedSearchRowTotalHeight, computedSearchRowTotalHeight + 40, dualY],
        [0, 0.4, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const sortRowAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateYAnim.value,
        [computedSearchRowTotalHeight, computedSearchRowTotalHeight + 40, dualY],
        [1, 0.6, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  const hudAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateYAnim.value,
        [computedSearchRowTotalHeight, Math.max(computedSearchRowTotalHeight + 1, dualY - 80), dualY - 20, dualY, peekY],
        [0, 0, 0.7, 1, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  const bottomMapButtonAnimatedStyle = useAnimatedStyle(() => {
    // Only smoothly appears right when the sheet completely enters FULL view mode
    // No translation from bottom - appears smoothly right in place
    const opacity = interpolate(
      translateYAnim.value,
      [0, 8, 20],
      [1, 0.6, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      translateYAnim.value,
      [0, 15],
      [1, 0.92],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  // Grab handle bar in FULL mode: smoothly collapses height from 20 to 0 and fades out
  const handleBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateYAnim.value,
        [computedSearchRowTotalHeight, computedSearchRowTotalHeight + 24, dualY],
        [0, 1, 1],
        Extrapolation.CLAMP
      ),
      height: interpolate(
        translateYAnim.value,
        [computedSearchRowTotalHeight, computedSearchRowTotalHeight + 24, dualY],
        [0, 20, 20],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          translateY: interpolate(
            translateYAnim.value,
            [computedSearchRowTotalHeight, computedSearchRowTotalHeight + 24, dualY],
            [-10, 0, 0],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  // Zero-bleed PEEK mode: list opacity is 0 at peekY/miniPeekY so no card image bleeds through
  const listContentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        translateYAnim.value,
        [0, dualY, (dualY + peekY) / 2, peekY],
        [1, 1, 0.3, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  const handleListScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      scrollYRef.current = offsetY <= 2 ? 0 : Math.max(0, offsetY);
      const atTop = offsetY <= 2;
      if (atTop !== isAtTopRef.current) {
        isAtTopRef.current = atTop;
        setIsAtTop(atTop);
      }
    },
    []
  );

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      scrollYRef.current = offsetY <= 2 ? 0 : Math.max(0, offsetY);
      const atTop = offsetY <= 2;
      if (atTop !== isAtTopRef.current) {
        isAtTopRef.current = atTop;
        setIsAtTop(atTop);
      }
    },
    []
  );

  const handleHeaderPress = useCallback(() => {
    if (snapState === 'PEEK') {
      pendingGestureStateRef.current = 'DUAL';
      onSnapChange('DUAL');
      animateToState('DUAL');
    } else if (snapState === 'DUAL') {
      pendingGestureStateRef.current = 'FULL';
      onSnapChange('FULL');
      animateToState('FULL');
    }
  }, [snapState, onSnapChange, animateToState]);

  const onSnapFinishedJS = useCallback(
    (nextState: SheetSnapState) => {
      if (nextState !== snapState) {
        pendingGestureStateRef.current = nextState;
        onSnapChange(nextState);
      } else {
        pendingGestureStateRef.current = null;
      }
      if (nextState !== 'FULL') {
        resetListToTop();
        setIsSettledInFull(false);
      }
    },
    [snapState, onSnapChange, resetListToTop]
  );

  const snapToRelease = useCallback(
    (currentY: number, delta: number, vy: number) => {
      'worklet';
      const midFullDual = (fullY + dualY) / 2;
      const midDualPeek = (dualY + peekY) / 2;
      const startY = dragStartY.value;

      let nextState: SheetSnapState;

      const isFlickUp = vy < -0.25 || delta < -35;
      const isFlickDown = vy > 0.25 || delta > 35;

      if (startY >= midDualPeek) {
        // --- 1. GESTURE STARTED FROM PEEK ZONE ---
        if (isFlickUp) {
          // Option 2: ONLY go to FULL if the finger physically dragged the sheet past DUAL (currentY < dualY)
          // AND is still heading upward. If released before passing DUAL (currentY >= dualY), strictly snap to DUAL!
          if (currentY < dualY && (vy < -0.25 || delta < -35)) {
            nextState = 'FULL';
          } else {
            nextState = 'DUAL';
          }
        } else if (isFlickDown) {
          nextState = currentY >= peekY + 15 ? 'MINI_PEEK' : 'PEEK';
        } else {
          // Slow drag from PEEK:
          if (currentY < midFullDual) nextState = 'FULL';
          else if (currentY < midDualPeek) nextState = 'DUAL';
          else nextState = 'PEEK';
        }
      } else if (startY < midFullDual) {
        // --- 2. GESTURE STARTED FROM FULL ZONE ---
        if (isFlickDown) {
          // Option 2: ONLY go to PEEK if the finger physically dragged the sheet past DUAL (currentY > dualY)
          // AND is still heading downward. If released before passing DUAL (currentY <= dualY), strictly snap to DUAL!
          if (currentY > dualY && (vy > 0.25 || delta > 35)) {
            nextState = 'PEEK';
          } else {
            nextState = 'DUAL';
          }
        } else if (isFlickUp) {
          nextState = 'FULL';
        } else {
          // Slow drag from FULL:
          if (currentY < midFullDual) nextState = 'FULL';
          else if (currentY < midDualPeek) nextState = 'DUAL';
          else nextState = 'PEEK';
        }
      } else {
        // --- 3. GESTURE STARTED FROM DUAL ZONE ---
        if (isFlickUp) {
          nextState = 'FULL';
        } else if (isFlickDown) {
          nextState = 'PEEK';
        } else {
          // Slow drag from DUAL:
          if (currentY < midFullDual) nextState = 'FULL';
          else if (currentY < midDualPeek) nextState = 'DUAL';
          else nextState = 'PEEK';
        }
      }

      currentSnapState.value = nextState;

      if (nextState !== 'FULL') {
        isSettledInFullShared.value = false;
        runOnJS(setSettledInFullJS)(false);
      }

      let targetY = fullY;
      if (nextState === 'DUAL') targetY = dualY;
      else if (nextState === 'PEEK') targetY = peekY;
      else if (nextState === 'MINI_PEEK') targetY = miniPeekY;

      const springVelocity =
        (targetY - currentY) * vy > 0 ? Math.max(-6, Math.min(6, vy * 1.5)) : 0;

      translateYAnim.value = withSpring(
        targetY,
        {
          damping: 24,
          stiffness: 320,
          mass: 0.45,
          overshootClamping: true,
          velocity: springVelocity,
        },
        (finished) => {
          'worklet';
          if (finished && nextState === 'FULL') {
            isSettledInFullShared.value = true;
            runOnJS(setSettledInFullJS)(true);
          }
        }
      );

      runOnJS(onSnapFinishedJS)(nextState);
    },
    [
      fullY,
      dualY,
      peekY,
      miniPeekY,
      dragStartY,
      currentSnapState,
      translateYAnim,
      isSettledInFullShared,
      setSettledInFullJS,
      onSnapFinishedJS,
    ]
  );

  // Dedicated subheader PanGesture from react-native-gesture-handler:
  // - In PEEK/DUAL: Intercepts immediately on touch-down and follows finger 1:1 on UI thread
  // - In FULL mode: Disabled so dragging subheader does NOT pull down the sheet, letting Sort & Save work cleanly
  const subHeaderGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(snapState !== 'FULL')
      .activeOffsetY([-4, 4])
      .onBegin(() => {
        'worklet';
        cancelAnimation(translateYAnim);
        dragStartY.value = translateYAnim.value;
        isDraggingSheetFromList.value = true;
      })
      .onUpdate((e) => {
        'worklet';
        const target = dragStartY.value + e.translationY;
        const clamped = Math.min(peekY, Math.max(fullY, target));
        translateYAnim.value = clamped;
      })
      .onEnd((e) => {
        'worklet';
        isDraggingSheetFromList.value = false;
        const totalMove = Math.abs(e.translationX) + Math.abs(e.translationY);
        const vy = e.velocityY / 1000;
        if (totalMove < 6 && Math.abs(vy) < 0.1) {
          runOnJS(handleHeaderPress)();
          return;
        }
        snapToRelease(translateYAnim.value, e.translationY, vy);
      })
      .onFinalize(() => {
        'worklet';
        isDraggingSheetFromList.value = false;
      });
  }, [snapState, fullY, peekY, translateYAnim, dragStartY, isDraggingSheetFromList, handleHeaderPress, snapToRelease]);

  // Unified PanGesture on the listing feed for ALL modes (FULL, DUAL, PEEK):
  // - In FULL mode (when settled): activates on downward drag when at top (isAtTop), allowing upward feed scroll.
  // - In DUAL and PEEK modes: activates on both upward and downward drags without failing on diagonal thumb movement.
  // - Fully executes on the UI thread for buttery smooth 60fps/120fps tracking without JS latency.
  const listPanGesture = useMemo(() => {
    const isFull = snapState === 'FULL' && isSettledInFull;
    const pan = Gesture.Pan()
      .enabled(!isFull || isAtTop)
      .activeOffsetY(isFull ? 6 : [-6, 6])
      .failOffsetY(isFull ? -1 : -9999);

    if (isFull) {
      // In settled FULL mode, keep moderate horizontal fail bounds so card photo carousel can be swiped horizontally
      pan.failOffsetX([-25, 25]);
    }
    // In DUAL and PEEK modes, NO failOffsetX is set, ensuring diagonal thumb sweeps never fail the sheet pan.

    return pan
      .onBegin(() => {
        'worklet';
        cancelAnimation(translateYAnim);
        dragStartY.value = translateYAnim.value;
        isDraggingSheetFromList.value = true;
        // Immediately revoke settled status on drag begin if pulling down from FULL
        if (translateYAnim.value > fullY + 2) {
          isSettledInFullShared.value = false;
          runOnJS(setSettledInFullJS)(false);
        }
      })
      .onUpdate((e) => {
        'worklet';
        if (!isDraggingSheetFromList.value) return;
        // If pulled down from top in FULL mode, ensure scroll is immediately cut off
        if (isSettledInFullShared.value && e.translationY > 2) {
          isSettledInFullShared.value = false;
          runOnJS(setSettledInFullJS)(false);
        }
        const target = dragStartY.value + e.translationY;
        const clamped = Math.min(peekY, Math.max(fullY, target));
        translateYAnim.value = clamped;
      })
      .onEnd((e) => {
        'worklet';
        if (!isDraggingSheetFromList.value) return;
        isDraggingSheetFromList.value = false;
        snapToRelease(translateYAnim.value, e.translationY, e.velocityY / 1000);
      })
      .onFinalize(() => {
        'worklet';
        isDraggingSheetFromList.value = false;
      });
  }, [
    snapState,
    isSettledInFull,
    isAtTop,
    fullY,
    peekY,
    translateYAnim,
    dragStartY,
    isDraggingSheetFromList,
    isSettledInFullShared,
    setSettledInFullJS,
    snapToRelease,
  ]);

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

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <View style={styles.cardItemWrapper}>
        <LuxuryPropertyCard
          property={item}
          isSelected={item.id === selectedPropertyId}
          isFavorite={isSaved(item.id)}
          listType={listType}
          onSelect={onSelectProperty}
          onToggleFavorite={onToggleFavorite}
        />
      </View>
    ),
    [
      selectedPropertyId,
      isSaved,
      listType,
      onSelectProperty,
      onToggleFavorite,
    ]
  );

  const handleFloatingMapPress = useCallback(() => {
    // 1. Instantly trigger GPU spring collapse on the UI thread (0ms latency!)
    currentSnapState.value = 'PEEK';
    isSettledInFullShared.value = false;
    setIsSettledInFull(false);
    pendingGestureStateRef.current = 'PEEK';
    animateToState('PEEK');
    onSnapChange('PEEK');

    // 2. Defer heavy FlatList scroll reset so it doesn't freeze the animation start
    requestAnimationFrame(() => {
      resetListToTop();
    });
  }, [resetListToTop, onSnapChange, animateToState, isSettledInFullShared, currentSnapState]);

  const mapButtonTapGesture = useMemo(() => {
    return Gesture.Tap()
      .runOnJS(true)
      .maxDuration(500)
      .onEnd(() => {
        handleFloatingMapPress();
      });
  }, [handleFloatingMapPress]);

  return (
    <>
      <Animated.View
        style={[
          styles.sheetContainer,
          { height: fullHeight + computedSearchRowTotalHeight },
          sheetAnimatedStyle,
          containerBorderRadiusStyle,
        ]}
      >

      {/* 0. Anchored Floating Action HUD Row: Layer | Draw | Recenter | Save Search */}
      <Animated.View
        style={[
          styles.anchoredHudContainer,
          hudAnimatedStyle,
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
      <Animated.View style={[styles.mainContentContainer, contentDockingStyle]}>
        {/* Subheader Row: Collapsing handle in FULL, cross-fade text */}
        <GestureDetector gesture={subHeaderGesture}>
          <View style={styles.subHeaderRowContainer}>
            {/* Grab handle container: collapses to 0 height & opacity in FULL mode */}
            <Animated.View
              style={[
                styles.grabHandleContainer,
                handleBarAnimatedStyle,
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleHeaderPress}
                style={styles.grabHandleArea}
                disabled={snapState === 'FULL'}
              >
                <View style={styles.grabHandle} />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.headerContentWrapper}>
              {/* Layer A (PEEK / DUAL): Centered Count Available */}
              <Animated.View
                style={[
                  styles.countSubheaderLayer,
                  countRowAnimatedStyle,
                ]}
                pointerEvents={snapState === 'FULL' ? 'none' : 'auto'}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleHeaderPress}
                  style={styles.headerRow}
                >
                  <Text style={styles.headerTitle}>{countText}</Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Layer B (FULL): Sort: {sortOption} ⇅ | Save Search */}
              <Animated.View
                style={[
                  styles.sortSubheaderLayer,
                  sortRowAnimatedStyle,
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
          </View>
        </GestureDetector>

        {/* Thin Divider Border below the subheader */}
        <View style={styles.headerDivider} />

        {/* Property Cards Feed */}
        <GestureDetector gesture={listPanGesture}>
          <Animated.View
            style={[
              styles.listWrapper,
              listContentAnimatedStyle,
              { overflow: 'hidden' },
            ]}
          >
            <FlatList
              ref={flatListRef}
              disallowInterruption={false}
              data={sortedProperties}
              keyExtractor={(item) => String(item.id)}
              showsVerticalScrollIndicator={false}
              onScroll={handleListScroll}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              scrollEventThrottle={16}
              overScrollMode="never"
              bounces={false}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={5}
              removeClippedSubviews={false}
              getItemLayout={(_, index) => ({
                length: 346,
                offset: 346 * index,
                index,
              })}
              decelerationRate="normal"
              scrollEnabled={snapState === 'FULL' && isSettledInFull}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: insets.bottom + 90 },
              ]}
              renderItem={renderItem}
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
        </GestureDetector>
      </Animated.View>
    </Animated.View>

    {/* When in FULL: Floating bottom pill [ 🗺️ Map ] - cleanly floating at bottom-center above safe area */}
    <Animated.View
      style={[
        styles.floatingMapPillWrap,
        {
          bottom: Math.max(insets.bottom, 12) + 16,
        },
        bottomMapButtonAnimatedStyle,
      ]}
      pointerEvents={snapState === 'FULL' ? 'auto' : 'none'}
    >
      <GestureDetector gesture={mapButtonTapGesture}>
        <TouchableOpacity
          style={styles.floatingMapPill}
          onPress={handleFloatingMapPress}
          activeOpacity={0.82}
          hitSlop={{ top: 14, bottom: 14, left: 20, right: 20 }}
        >
          <Ionicons name="map" size={14.5} color="#ffffff" style={styles.floatingMapIcon} />
          <Text style={styles.floatingMapPillText}>Map</Text>
        </TouchableOpacity>
      </GestureDetector>
    </Animated.View>
  </>
);
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 14,
    shadowOpacity: 0.12,
    elevation: 6,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    zIndex: 40,
    overflow: 'visible',
  },
  mainContentContainer: {
    flex: 1,
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  listWrapper: {
    flex: 1,
    width: '100%',
  },
  subHeaderRowContainer: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: '100%',
  },
  grabHandleContainer: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  grabHandleArea: {
    width: '100%',
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContentWrapper: {
    height: 48,
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
  },
  countSubheaderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortSubheaderLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
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
    justifyContent: 'center',
    height: 40,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  zillowSortText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006aff',
    lineHeight: 20,
    includeFontPadding: false,
  },
  zillowSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  zillowSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006aff',
    lineHeight: 20,
    includeFontPadding: false,
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
  grabHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 48,
    width: '100%',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
    textAlign: 'center',
    lineHeight: 20,
    includeFontPadding: false,
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
  cardItemWrapper: {
    width: '100%',
    alignItems: 'center',
  },
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
    zIndex: 999,
    elevation: 30,
  },
  floatingMapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  floatingMapIcon: {
    marginRight: 6,
  },
  floatingMapPillText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

export default MobileTriStateBottomSheet;
