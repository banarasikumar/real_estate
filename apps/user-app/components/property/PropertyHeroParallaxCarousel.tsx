import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Share,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSequence,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CategorizedMediaItem } from '../../types/propertyDetails';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const HERO_HEIGHT = 340;

export interface PropertyStickyNavBarProps {
  scrollY?: SharedValue<number>;
  title?: string;
  price?: number;
  formattedPrice?: string;
  propertyId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onBack?: () => void;
  heroHeight?: number;
  pinToTop?: boolean;
}

export function PropertyStickyNavBar({
  scrollY,
  title = 'Property Details',
  price,
  formattedPrice,
  propertyId,
  isSaved = false,
  onToggleSave,
  onBack,
  heroHeight = HERO_HEIGHT,
  pinToTop = false,
}: PropertyStickyNavBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const internalScrollY = useSharedValue(0);
  const activeScrollY = scrollY ?? internalScrollY;

  // Heart bounce animation
  const heartScale = useSharedValue(1);

  const handleToggleHeart = useCallback(() => {
    heartScale.value = withSequence(
      withSpring(1.35, { damping: 4, stiffness: 350 }),
      withSpring(1.0, { damping: 8, stiffness: 250 })
    );
    onToggleSave?.();
  }, [heartScale, onToggleSave]);

  const animatedHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }, [onBack, router]);

  const handleShare = useCallback(async () => {
    try {
      const shareUrl = propertyId ? `https://seeker.app/property/${propertyId}` : 'https://seeker.app';
      await Share.share({
        title: title || 'Property Details',
        message: `${title ? title + ' - ' : ''}Check out this property on Seeker:\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.error('Error sharing property:', err);
    }
  }, [title, propertyId]);

  // Navbar background and border transition
  const animatedNavBarStyle = useAnimatedStyle(() => {
    const y = activeScrollY.value;
    const threshold = heroHeight - insets.top - 60;

    const bgOpacity = interpolate(y, [threshold - 40, threshold], [0, 1], Extrapolation.CLAMP);
    const borderOpacity = interpolate(y, [threshold - 20, threshold], [0, 1], Extrapolation.CLAMP);
    const shadowOpacity = interpolate(y, [threshold - 20, threshold], [0, 0.08], Extrapolation.CLAMP);

    const translateY = pinToTop ? Math.max(0, y) : 0;

    return {
      backgroundColor: `rgba(255, 255, 255, ${bgOpacity})`,
      borderBottomColor: `rgba(226, 232, 240, ${borderOpacity})`,
      shadowOpacity,
      transform: [{ translateY }],
    };
  });

  // Animated Title & Price in sticky navbar
  const animatedNavContentStyle = useAnimatedStyle(() => {
    const y = activeScrollY.value;
    const threshold = heroHeight - insets.top - 60;

    const opacity = interpolate(y, [threshold - 30, threshold + 10], [0, 1], Extrapolation.CLAMP);
    const translateY = interpolate(y, [threshold - 30, threshold + 10], [8, 0], Extrapolation.CLAMP);

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Glassmorphic circle buttons
  const animatedGlassButtonStyle = useAnimatedStyle(() => {
    const y = activeScrollY.value;
    const threshold = heroHeight - insets.top - 60;

    const glassBg = interpolate(y, [threshold - 40, threshold], [0.82, 0.96], Extrapolation.CLAMP);
    const borderColor = interpolate(y, [threshold - 40, threshold], [0.4, 0.15], Extrapolation.CLAMP);

    return {
      backgroundColor: `rgba(255, 255, 255, ${glassBg})`,
      borderColor: `rgba(15, 23, 42, ${borderColor})`,
    };
  });

  const displayPrice = formattedPrice || (price ? `$${price.toLocaleString()}` : undefined);

  return (
    <Animated.View
      style={[
        styles.stickyNavBar,
        {
          paddingTop: insets.top > 0 ? insets.top : 12,
          height: (insets.top > 0 ? insets.top : 12) + 54,
        },
        animatedNavBarStyle,
      ]}
    >
      <View style={styles.navBarInner}>
        {/* Back Button */}
        <Animated.View style={[styles.glassCircleButton, animatedGlassButtonStyle]}>
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.touchableButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>
        </Animated.View>

        {/* Center: Title & Price Pill */}
        <Animated.View style={[styles.navCenterContent, animatedNavContentStyle]} pointerEvents="box-none">
          <Text style={styles.navTitle} numberOfLines={1}>
            {title}
          </Text>
          {displayPrice && (
            <View style={styles.navPricePill}>
              <Text style={styles.navPriceText}>{displayPrice}</Text>
            </View>
          )}
        </Animated.View>

        {/* Right Action Buttons: Share & Heart */}
        <View style={styles.navRightActions}>
          {/* Share Button */}
          <Animated.View style={[styles.glassCircleButton, animatedGlassButtonStyle]}>
            <TouchableOpacity
              onPress={handleShare}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.touchableButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={Platform.OS === 'ios' ? 'share-outline' : 'share-social-outline'}
                size={20}
                color="#0f172a"
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Heart Button */}
          <Animated.View style={[styles.glassCircleButton, animatedGlassButtonStyle, animatedHeartStyle]}>
            <TouchableOpacity
              onPress={handleToggleHeart}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.touchableButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={21}
                color={isSaved ? '#e11d48' : '#0f172a'}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

export interface PropertyHeroParallaxCarouselProps {
  media: CategorizedMediaItem[] | { id?: string; url: string; category?: string; caption?: string }[];
  title?: string;
  price?: number;
  formattedPrice?: string;
  propertyId?: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  onOpenGallery?: (initialIndex: number) => void;
  onBack?: () => void;
  scrollY?: SharedValue<number>;
  heroHeight?: number;
  showStickyNav?: boolean;
  pinToTop?: boolean;
}

export function PropertyHeroParallaxCarousel({
  media,
  title = 'Property Details',
  price,
  formattedPrice,
  propertyId,
  isSaved = false,
  onToggleSave,
  onOpenGallery,
  onBack,
  scrollY,
  heroHeight = HERO_HEIGHT,
  showStickyNav = true,
  pinToTop = true,
}: PropertyHeroParallaxCarouselProps) {
  // Internal scroll tracker if parent doesn't provide scrollY
  const internalScrollY = useSharedValue(0);
  const activeScrollY = scrollY ?? internalScrollY;

  const [activeIndex, setActiveIndex] = useState(0);
  const carouselScrollRef = useRef<ScrollView>(null);

  // Horizontal paging listener for photo counter
  const onCarouselScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page >= 0 && page !== activeIndex) {
      setActiveIndex(page);
    }
  }, [activeIndex]);

  // Parallax & overscroll zoom animation on hero container
  const animatedHeroContainerStyle = useAnimatedStyle(() => {
    const y = activeScrollY.value;

    if (y < 0) {
      // Overscroll pull-down: anchor top and scale up
      const scale = interpolate(y, [-200, 0], [1.7, 1.0], Extrapolation.CLAMP);
      const translateY = y / 2;
      return {
        transform: [{ translateY }, { scale }],
      };
    }

    // Scroll down: smooth parallax translation
    const translateY = interpolate(y, [0, heroHeight], [0, heroHeight * 0.42], Extrapolation.CLAMP);
    return {
      transform: [{ translateY }],
    };
  });

  const mediaList = media && media.length > 0 ? media : [{ url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85' }];
  const totalPhotos = mediaList.length;

  return (
    <View style={[styles.rootContainer, { height: heroHeight }]}>
      {/* Parallax Image Carousel Container */}
      <Animated.View style={[styles.heroAnimatedWrapper, { height: heroHeight }, animatedHeroContainerStyle]}>
        <ScrollView
          ref={carouselScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled
          nestedScrollEnabled
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces
          onScroll={onCarouselScroll}
          style={styles.carouselScrollView}
        >
          {mediaList.map((item, index) => (
            <TouchableOpacity
              key={item.id || `hero-media-${index}`}
              activeOpacity={0.97}
              onPress={() => onOpenGallery?.(index)}
              style={styles.slideTouchable}
            >
              <Image
                source={{ uri: item.url }}
                style={[styles.heroImage, { height: heroHeight }]}
                resizeMode="cover"
              />
              {/* Subtle top & bottom shadow scrims for contrast */}
              <View style={styles.topScrim} pointerEvents="none" />
              <View style={styles.bottomScrim} pointerEvents="none" />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bottom-Right Photo Counter Pill */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.counterPill}
          onPress={() => onOpenGallery?.(activeIndex)}
        >
          <Ionicons name="images-outline" size={14} color="#ffffff" style={styles.counterIcon} />
          <Text style={styles.counterText}>
            {activeIndex + 1} / {totalPhotos}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Floating / Sticky Header Bar */}
      {showStickyNav && (
        <PropertyStickyNavBar
          scrollY={activeScrollY}
          title={title}
          price={price}
          formattedPrice={formattedPrice}
          propertyId={propertyId}
          isSaved={isSaved}
          onToggleSave={onToggleSave}
          onBack={onBack}
          heroHeight={heroHeight}
          pinToTop={pinToTop}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: '#0f172a',
    zIndex: 10,
  },
  heroAnimatedWrapper: {
    width: SCREEN_WIDTH,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  carouselScrollView: {
    width: SCREEN_WIDTH,
  },
  slideTouchable: {
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    backgroundColor: '#1e293b',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  counterPill: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  counterIcon: {
    marginRight: 6,
  },
  counterText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  stickyNavBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  navBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  glassCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    elevation: 3,
  },
  touchableButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenterContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  navTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  navPricePill: {
    backgroundColor: '#fff1f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  navPriceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e11d48',
  },
  navRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
