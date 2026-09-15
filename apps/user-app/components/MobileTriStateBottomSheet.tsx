import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
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
import { Gesture, GestureDetector, FlatList } from 'react-native-gesture-handler';
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
          directionalLockEnabled={true}
          nestedScrollEnabled={false}
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
  const fullY = computedSearchRowTotalHeight;
  const dualY = fullHeight - DUAL_HEIGHT;
  const peekY = fullHeight - PEEK_HEIGHT;
  const midY = (dualY + fullY) / 2;

  const getSnapTranslateY = useCallback(
    (state: SheetSnapState) => {
      switch (state) {
        case 'FULL':
          return fullY;
        case 'DUAL':
          return dualY;
        case 'PEEK':
          return peekY;
      }
    },
    [fullY, dualY, peekY]
  );

  const internalTranslateY = useRef(new Animated.Value(getSnapTranslateY(snapState))).current;
  const translateYAnim = externalTranslateYAnim || internalTranslateY;
  const currentTranslateYRef = useRef(getSnapTranslateY(snapState));
  const dragStartTranslateY = useRef(getSnapTranslateY(snapState));
  const animatingToStateRef = useRef<SheetSnapState | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const scrollYRef = useRef(0);
  const [isAtTop, setIsAtTop] = useState(true);
  const isAtTopRef = useRef(true);
  const [isSettledAtFull, setIsSettledAtFull] = useState(snapState === 'FULL');
  const isSettledAtFullRef = useRef(snapState === 'FULL');
  const isDraggingSheetFromList = useRef(false);
  const isActivelyInteractingRef = useRef(false);
  const lastAnimatedStateRef = useRef<SheetSnapState>(snapState);

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

      if (state !== 'FULL') {
        isSettledAtFullRef.current = false;
        setIsSettledAtFull(false);
      }

      // Stop any running animation immediately so the new animation takes over
      translateYAnim.stopAnimation();
      animatingToStateRef.current = state;

      const clampedVelocity =
        velocity !== undefined ? Math.max(-8, Math.min(8, velocity)) : undefined;

      Animated.spring(translateYAnim, {
        toValue: targetY,
        damping: 24,
        stiffness: 320,
        mass: 0.45,
        overshootClamping: true, // Eliminates bounce past target
        velocity: clampedVelocity,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          currentTranslateYRef.current = targetY;
          animatingToStateRef.current = null;
          const settled = state === 'FULL';
          isSettledAtFullRef.current = settled;
          setIsSettledAtFull(settled);
        }
      });
    },
    [getSnapTranslateY, translateYAnim]
  );

  // Synchronize currentTranslateYRef with real-time animated values across any frame or driver
  useEffect(() => {
    const id = translateYAnim.addListener(({ value }) => {
      currentTranslateYRef.current = value;
    });
    return () => {
      translateYAnim.removeListener(id);
    };
  }, [translateYAnim]);

  // React to snapState changes from parent (only if not already animated by active user gesture)
  useEffect(() => {
    if (snapState === lastAnimatedStateRef.current) {
      return;
    }
    lastAnimatedStateRef.current = snapState;
    if (isActivelyInteractingRef.current) {
      return;
    }
    if (snapState !== 'FULL') {
      resetListToTop();
    }
    animateToState(snapState);
  }, [snapState, animateToState, resetListToTop]);

  // 60fps GPU Native Driver Animated Interpolations
  const countRowOpacity = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [fullY, fullY + 40, dualY],
        outputRange: [0, 0.4, 1],
        extrapolate: 'clamp',
      }),
    [translateYAnim, fullY, dualY]
  );

  const sortRowOpacity = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [fullY, fullY + 40, dualY],
        outputRange: [1, 0.6, 0],
        extrapolate: 'clamp',
      }),
    [translateYAnim, fullY, dualY]
  );

  const hudOpacity = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [fullY, Math.max(fullY + 1, dualY - 80), dualY - 20, dualY, peekY],
        outputRange: [0, 0, 0.7, 1, 1],
        extrapolate: 'clamp',
      }),
    [translateYAnim, fullY, dualY, peekY]
  );

  const bottomMapButtonOpacity = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [fullY, fullY + 30, fullY + 80],
        outputRange: [1, 0.8, 0],
        extrapolate: 'clamp',
      }),
    [translateYAnim, fullY]
  );

  // Seamless borderless fusion interpolations: fade to 0 in FULL mode, 1 in DUAL/PEEK
  const sheetBorderOpacity = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [fullY, fullY + 20, dualY],
        outputRange: [0, 1, 1],
        extrapolate: 'clamp',
      }),
    [translateYAnim, fullY, dualY]
  );

  const sheetShadowOpacity = useMemo(
    () =>
      translateYAnim.interpolate({
        inputRange: [fullY, fullY + 20, dualY],
        outputRange: [0, 1, 1],
        extrapolate: 'clamp',
      }),
    [translateYAnim, fullY, dualY]
  );

  const handleListScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;

      // Suppress any list scrolling if the sheet is not physically at FULL view
      if (currentTranslateYRef.current > fullY + 2) {
        if (y > 0) {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
          scrollYRef.current = 0;
          return;
        }
      }

      scrollYRef.current = y;
      if (y <= 0 && !isAtTopRef.current) {
        isAtTopRef.current = true;
        setIsAtTop(true);
      } else if (y > 0 && isAtTopRef.current) {
        isAtTopRef.current = false;
        setIsAtTop(false);
      }
    },
    [fullY]
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

  const startingSnapState = useRef<SheetSnapState>(snapState);

  const handleHeaderPress = useCallback(() => {
    if (snapState === 'PEEK') {
      onSnapChange('DUAL');
      animateToState('DUAL');
    } else if (snapState === 'DUAL') {
      onSnapChange('FULL');
      animateToState('FULL');
    }
  }, [snapState, onSnapChange, animateToState]);

  const handleGestureRelease = useCallback(
    (currentY: number, delta: number) => {
      const distFull = Math.abs(currentY - fullY);
      const distDual = Math.abs(currentY - dualY);
      const distPeek = Math.abs(currentY - peekY);

      let closest: SheetSnapState = 'DUAL';
      let minDist = Math.min(distFull, distDual, distPeek);
      if (minDist === distFull) closest = 'FULL';
      else if (minDist === distPeek) closest = 'PEEK';

      let nextState: SheetSnapState = closest;

      if (closest === startingSnapState.current) {
        if (startingSnapState.current === 'FULL' && delta > 80) {
          nextState = 'DUAL';
        } else if (startingSnapState.current === 'PEEK' && delta < -80) {
          nextState = 'DUAL';
        } else if (startingSnapState.current === 'DUAL') {
          if (delta > 60) nextState = 'PEEK';
          else if (delta < -60) nextState = 'FULL';
        }
      }

      if (nextState !== 'FULL') {
        resetListToTop();
      }

      lastAnimatedStateRef.current = nextState;

      if (nextState !== snapState) {
        onSnapChange(nextState);
      }

      animateToState(nextState);
    },
    [fullY, dualY, peekY, snapState, onSnapChange, animateToState, resetListToTop]
  );

  // Dedicated subheader PanGesture from react-native-gesture-handler:
  // Intercepts immediately on touch-down, stops previous animation synchronously, and follows finger 1:1
  const subHeaderGesture = useMemo(() => {
    return Gesture.Pan()
      .runOnJS(true)
      .activeOffsetY([-4, 4])
      .onBegin(() => {
        isActivelyInteractingRef.current = true;
        translateYAnim.stopAnimation();
        animatingToStateRef.current = null;
        isSettledAtFullRef.current = false;
        setIsSettledAtFull(false);
        dragStartTranslateY.current = currentTranslateYRef.current;
        startingSnapState.current = snapState;
      })
      .onStart(() => {
        translateYAnim.stopAnimation();
        animatingToStateRef.current = null;
        isSettledAtFullRef.current = false;
        setIsSettledAtFull(false);
        dragStartTranslateY.current = currentTranslateYRef.current;
        isDraggingSheetFromList.current = true;
      })
      .onUpdate((e) => {
        const target = dragStartTranslateY.current + e.translationY;
        const clamped = Math.min(peekY, Math.max(fullY, target));
        currentTranslateYRef.current = clamped;
        translateYAnim.setValue(clamped);
      })
      .onEnd((e) => {
        isDraggingSheetFromList.current = false;
        isActivelyInteractingRef.current = false;
        const totalMove = Math.abs(e.translationX) + Math.abs(e.translationY);
        if (totalMove < 6) {
          handleHeaderPress();
          return;
        }
        handleGestureRelease(currentTranslateYRef.current, e.translationY);
      })
      .onFinalize(() => {
        isDraggingSheetFromList.current = false;
        isActivelyInteractingRef.current = false;
      });
  }, [snapState, fullY, peekY, translateYAnim, handleGestureRelease, handleHeaderPress]);

  // Unified PanGesture on the listing feed for ALL modes (FULL, DUAL, PEEK):
  // - When NOT settled at FULL (DUAL, PEEK, or mid-flight toward FULL): activeOffsetY([-6, 6])
  //   catches the sheet on any drag up/down and tracks finger 1:1.
  // - If dragging continues upward past fullY, seamlessly scrolls the FlatList without lifting finger.
  // - Once settled at FULL: activeOffsetY(6) activates on downward drag when at top (isAtTop),
  //   while upward drags are handled natively by FlatList.
  const nativeGesture = useMemo(() => Gesture.Native(), []);

  const listPanGesture = useMemo(() => {
    return Gesture.Pan()
      .runOnJS(true)
      .activeOffsetY([-4, 4])
      .failOffsetX([-25, 25])
      .onBegin(() => {
        isActivelyInteractingRef.current = true;
        translateYAnim.stopAnimation();
        animatingToStateRef.current = null;
        if (currentTranslateYRef.current > fullY + 2) {
          isSettledAtFullRef.current = false;
          setIsSettledAtFull(false);
        }
        dragStartTranslateY.current = currentTranslateYRef.current;
        startingSnapState.current = snapState;
      })
      .onStart(() => {
        translateYAnim.stopAnimation();
        animatingToStateRef.current = null;
        if (currentTranslateYRef.current > fullY + 2) {
          isSettledAtFullRef.current = false;
          setIsSettledAtFull(false);
        }
        dragStartTranslateY.current = currentTranslateYRef.current;
        isDraggingSheetFromList.current = true;
      })
      .onUpdate((e) => {
        if (!isDraggingSheetFromList.current) return;

        if (scrollYRef.current > 0) {
          // List is natively scrolling (offset > 0). Sheet MUST stay at FULL.
          currentTranslateYRef.current = fullY;
          translateYAnim.setValue(fullY);
          // Keep drag anchor exactly fullY relative to current touch to allow seamless pull-down handoff.
          dragStartTranslateY.current = fullY - e.translationY;
        } else {
          // List is at top (offset <= 0).
          let target = dragStartTranslateY.current + e.translationY;
          
          if (target < fullY) {
            // Trying to drag above FULL. Clamp to FULL.
            target = fullY;
            // Shift anchor so pulling back down doesn't jump.
            dragStartTranslateY.current = fullY - e.translationY;
          }
          
          const clamped = Math.min(peekY, Math.max(fullY, target));
          currentTranslateYRef.current = clamped;
          translateYAnim.setValue(clamped);

          // If the sheet is physically below FULL, actively force list to stay at top.
          if (clamped > fullY + 2) {
            if (scrollYRef.current > 0) {
              flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
              scrollYRef.current = 0;
            }
            if (!isAtTopRef.current) {
              isAtTopRef.current = true;
              setIsAtTop(true);
            }
          }
        }
      })
      .onEnd((e) => {
        if (!isDraggingSheetFromList.current) return;
        isDraggingSheetFromList.current = false;
        isActivelyInteractingRef.current = false;
        handleGestureRelease(currentTranslateYRef.current, e.translationY);
      })
      .onFinalize(() => {
        isDraggingSheetFromList.current = false;
        isActivelyInteractingRef.current = false;
      });
  }, [
    fullY,
    peekY,
    translateYAnim,
    handleGestureRelease,
  ]);

  const composedListGesture = useMemo(
    () => Gesture.Simultaneous(listPanGesture, nativeGesture),
    [listPanGesture, nativeGesture]
  );

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

  return (
    <Animated.View
      style={[
        styles.sheetContainer,
        {
          height: fullHeight,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
      {/* Animated Sheet Shadow Overlay - fades out completely at fullY so no shadow bleeds into search bar */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sheetShadowOverlay,
          { opacity: sheetShadowOpacity },
        ]}
      />

      {/* Animated Hairline Border Overlay - fades out to 0 at fullY for seamless borderless fusion */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sheetHairlineBorderOverlay,
          { opacity: sheetBorderOpacity },
        ]}
      />

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
      <View style={styles.mainContentContainer}>
        {/* Subheader Row: Cross-fades between count+handle and sort+save */}
        <GestureDetector gesture={subHeaderGesture}>
          <View style={styles.subHeaderRowContainer}>
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
        </GestureDetector>

        {/* Thin Divider Border below the subheader */}
        <View style={styles.headerDivider} />

        {/* Property Cards Feed */}
        <View style={styles.listWrapper}>
          <GestureDetector gesture={composedListGesture}>
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
          </GestureDetector>
        </View>
      </View>

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
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    zIndex: 40,
    overflow: 'visible',
  },
  sheetShadowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: -1,
  },
  sheetHairlineBorderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: 'transparent',
    zIndex: 45,
  },
  mainContentContainer: {
    flex: 1,
    width: '100%',
  },
  listWrapper: {
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
