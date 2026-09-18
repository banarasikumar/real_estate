import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Modal,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { CategorizedMediaItem, MediaCategory } from '../../types/propertyDetails';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ALL_CATEGORIES: MediaCategory[] = [
  'All',
  'Exterior',
  'Living Room',
  'Kitchen',
  'Master Suite',
  'Bathroom',
  'Views',
];

export interface FullScreenPhotoGalleryModalProps {
  visible: boolean;
  onClose: () => void;
  media: CategorizedMediaItem[];
  initialIndex?: number;
}

interface ZoomableSlideProps {
  item: CategorizedMediaItem;
  isActive: boolean;
  onDismiss: () => void;
  dismissY: SharedValue<number>;
}

function ZoomableSlide({ item, isActive, onDismiss, dismissY }: ZoomableSlideProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Reset zoom when slide becomes inactive
  useEffect(() => {
    if (!isActive) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [isActive, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  // Double tap to toggle zoom 1x <-> 2.5x
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      if (scale.value > 1.2) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  // Pinch to zoom (up to 3x)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      'worklet';
      const target = savedScale.value * e.scale;
      scale.value = Math.min(Math.max(target, 0.9), 3.5);
    })
    .onEnd(() => {
      'worklet';
      if (scale.value < 1.05) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture: handles dragging when zoomed OR pull down to dismiss when not zoomed
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      if (scale.value > 1.1) {
        // Pan around the zoomed photo
        const maxOffset = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxOffsetY = (SCREEN_HEIGHT * 0.5 * (scale.value - 1)) / 2;
        translateX.value = Math.min(Math.max(savedTranslateX.value + e.translationX, -maxOffset), maxOffset);
        translateY.value = Math.min(Math.max(savedTranslateY.value + e.translationY, -maxOffsetY), maxOffsetY);
      } else if (e.translationY > 0) {
        // Swipe down to dismiss
        dismissY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (scale.value > 1.1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        if (e.translationY > 120 || e.velocityY > 750) {
          dismissY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }, () => {
            runOnJS(onDismiss)();
          });
        } else {
          dismissY.value = withSpring(0, { damping: 16, stiffness: 220 });
        }
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.slideContainer}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.imageWrapper, animatedImageStyle]}>
          <Image
            source={{ uri: item.url }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function FullScreenPhotoGalleryModal({
  visible,
  onClose,
  media = [],
  initialIndex = 0,
}: FullScreenPhotoGalleryModalProps) {
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = useState<MediaCategory>('All');
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const mainPagerRef = useRef<FlatList<CategorizedMediaItem>>(null);
  const thumbnailListRef = useRef<FlatList<CategorizedMediaItem>>(null);

  // Swipe-down dismiss animation value
  const dismissY = useSharedValue(0);

  // Compute available categories and item counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: media.length };
    ALL_CATEGORIES.forEach((cat) => {
      if (cat !== 'All') {
        counts[cat] = media.filter((m) => m.category === cat).length;
      }
    });
    return counts;
  }, [media]);

  // Available categories: show 'All' and any category with at least 1 photo
  const availableCategories = useMemo(() => {
    return ALL_CATEGORIES.filter((cat) => cat === 'All' || (categoryCounts[cat] ?? 0) > 0);
  }, [categoryCounts]);

  // Filtered media based on selectedCategory
  const filteredMedia = useMemo(() => {
    if (selectedCategory === 'All') return media;
    return media.filter((m) => m.category === selectedCategory);
  }, [media, selectedCategory]);

  // Reset states when modal becomes visible or initialIndex changes
  useEffect(() => {
    if (visible) {
      dismissY.value = 0;
      setSelectedCategory('All');
      const safeIndex = Math.min(Math.max(initialIndex, 0), Math.max(media.length - 1, 0));
      setCurrentIndex(safeIndex);

      // Delay scroll until modal mounts
      const timer = setTimeout(() => {
        if (mainPagerRef.current && safeIndex > 0 && safeIndex < media.length) {
          mainPagerRef.current.scrollToIndex({ index: safeIndex, animated: false });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [visible, initialIndex, media.length, dismissY]);

  // Handle category selection
  const handleSelectCategory = useCallback(
    (category: MediaCategory) => {
      setSelectedCategory(category);
      setCurrentIndex(0);
      if (mainPagerRef.current) {
        mainPagerRef.current.scrollToOffset({ offset: 0, animated: true });
      }
      if (thumbnailListRef.current) {
        thumbnailListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    },
    []
  );

  // Sync active index on horizontal scroll
  const onMomentumScrollEnd = useCallback((e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
      // Auto-scroll thumbnail strip
      if (thumbnailListRef.current) {
        try {
          thumbnailListRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
            viewPosition: 0.5,
          });
        } catch {
          // Ignore index measurement race condition
        }
      }
    }
  }, []);

  // Jump to photo when thumbnail tapped
  const handleThumbnailPress = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      mainPagerRef.current?.scrollToIndex({ index, animated: true });
      thumbnailListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
    },
    []
  );

  // Close with animation reset
  const handleClose = useCallback(() => {
    dismissY.value = 0;
    onClose();
  }, [dismissY, onClose]);

  // Animated style for modal content during pull-down dismiss
  const animatedModalContainerStyle = useAnimatedStyle(() => {
    const dy = dismissY.value;
    const modalScale = interpolate(dy, [0, 320], [1.0, 0.85], Extrapolation.CLAMP);
    const modalOpacity = interpolate(dy, [0, 320], [1.0, 0.35], Extrapolation.CLAMP);

    return {
      transform: [{ translateY: dy }, { scale: modalScale }],
      opacity: modalOpacity,
    };
  });

  const currentItem = filteredMedia[currentIndex] || filteredMedia[0];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.modalBackground}>
        <Animated.View style={[styles.modalInner, animatedModalContainerStyle]}>
          {/* Top Bar: Close Button & Category Pills */}
          <View style={[styles.topHeader, { paddingTop: insets.top > 0 ? insets.top + 8 : 20 }]}>
            <View style={styles.topActionRow}>
              {/* Back / Close Icon */}
              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>

              {/* Title / Counter in Header */}
              <View style={styles.topTitleBox}>
                <Text style={styles.topTitleText}>Gallery</Text>
                <Text style={styles.topCounterText}>
                  {filteredMedia.length > 0 ? `${currentIndex + 1} / ${filteredMedia.length}` : '0 / 0'}
                </Text>
              </View>

              <View style={styles.headerSpacer} />
            </View>

            {/* Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScrollContent}
              style={styles.categoryScrollView}
            >
              {availableCategories.map((category) => {
                const count = categoryCounts[category] ?? 0;
                const isSelected = selectedCategory === category;
                return (
                  <TouchableOpacity
                    key={category}
                    activeOpacity={0.8}
                    onPress={() => handleSelectCategory(category)}
                    style={[
                      styles.categoryPill,
                      isSelected ? styles.categoryPillActive : styles.categoryPillInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected ? styles.categoryPillTextActive : styles.categoryPillTextInactive,
                      ]}
                    >
                      {category}
                    </Text>
                    <View
                      style={[
                        styles.categoryCountBadge,
                        isSelected ? styles.categoryCountBadgeActive : styles.categoryCountBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryCountText,
                          isSelected ? styles.categoryCountTextActive : styles.categoryCountTextInactive,
                        ]}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Main Fullscreen Horizontal Pager */}
          <View style={styles.pagerContainer}>
            {filteredMedia.length > 0 ? (
              <FlatList
                ref={mainPagerRef}
                data={filteredMedia}
                keyExtractor={(item, index) => item.id || `fullscreen-photo-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                onMomentumScrollEnd={onMomentumScrollEnd}
                getItemLayout={(_, index) => ({
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
                  index,
                })}
                onScrollToIndexFailed={(info) => {
                  setTimeout(() => {
                    mainPagerRef.current?.scrollToIndex({ index: info.index, animated: false });
                  }, 50);
                }}
                renderItem={({ item, index }) => (
                  <ZoomableSlide
                    item={item}
                    isActive={index === currentIndex}
                    onDismiss={handleClose}
                    dismissY={dismissY}
                  />
                )}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="images-outline" size={48} color="#475569" />
                <Text style={styles.emptyText}>No photos found in this category</Text>
              </View>
            )}
          </View>

          {/* Bottom Area: Photo Caption Overlay + Thumbnail Strip */}
          <View style={[styles.bottomContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 20 }]}>
            {/* Photo Caption Overlay */}
            {currentItem && (
              <View style={styles.captionOverlay}>
                <View style={styles.captionHeaderRow}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{currentItem.category}</Text>
                  </View>
                  <Text style={styles.captionIndexText}>
                    {currentIndex + 1} of {filteredMedia.length}
                  </Text>
                </View>
                {currentItem.caption ? (
                  <Text style={styles.captionBodyText} numberOfLines={2}>
                    {currentItem.caption}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Bottom Thumbnail Strip */}
            {filteredMedia.length > 1 && (
              <FlatList
                ref={thumbnailListRef}
                data={filteredMedia}
                keyExtractor={(item, index) => `thumb-${item.id || index}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailListContent}
                getItemLayout={(_, index) => ({
                  length: 64, // 56 width + 8 gap
                  offset: 64 * index,
                  index,
                })}
                onScrollToIndexFailed={() => {}}
                renderItem={({ item, index }) => {
                  const isActive = index === currentIndex;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleThumbnailPress(index)}
                      style={[
                        styles.thumbnailWrapper,
                        isActive ? styles.thumbnailWrapperActive : styles.thumbnailWrapperInactive,
                      ]}
                    >
                      <Image source={{ uri: item.url }} style={styles.thumbnailImage} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalInner: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  topHeader: {
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  topTitleBox: {
    alignItems: 'center',
  },
  topTitleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  topCounterText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  headerSpacer: {
    width: 38,
  },
  categoryScrollView: {
    marginTop: 8,
    marginBottom: 10,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  categoryPillActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  categoryPillInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#0f172a',
  },
  categoryPillTextInactive: {
    color: '#cbd5e1',
  },
  categoryCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  categoryCountBadgeActive: {
    backgroundColor: '#e2e8f0',
  },
  categoryCountBadgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryCountTextActive: {
    color: '#0f172a',
  },
  categoryCountTextInactive: {
    color: '#94a3b8',
  },
  pagerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
  },
  bottomContainer: {
    zIndex: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    paddingTop: 12,
  },
  captionOverlay: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  captionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    backgroundColor: 'rgba(225, 29, 72, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  captionIndexText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  captionBodyText: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 6,
  },
  thumbnailListContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  thumbnailWrapper: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnailWrapperActive: {
    borderWidth: 2.5,
    borderColor: '#ffffff',
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  thumbnailWrapperInactive: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.45,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1e293b',
  },
});
