import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 340);
export const CARD_SPACING = 12;
export const SIDE_INSET = Math.max(16, (SCREEN_WIDTH - CARD_WIDTH) / 2);

export interface CarouselProperty {
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
  isVerified?: boolean;
}

interface MobilePropertyCardCarouselProps {
  properties: CarouselProperty[];
  selectedIndex: number;
  onSnapToIndex: (index: number) => void;
  onToggleSaved: (id: string) => void;
  isPropertySaved: (id: string) => boolean;
  onClosePreview?: () => void;
}

export function formatPricePill(price: number): string {
  if (!price && price !== 0) return '₹--';
  if (price >= 10000000) {
    const cr = price / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (price >= 100000) {
    const l = price / 100000;
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L`;
  }
  if (price >= 1000) {
    return `₹${(price / 1000).toFixed(0)}k`;
  }
  return `₹${price.toLocaleString('en-IN')}`;
}

export const MobilePropertyCardCarousel: React.FC<MobilePropertyCardCarouselProps> = ({
  properties,
  selectedIndex,
  onSnapToIndex,
  onToggleSaved,
  isPropertySaved,
  onClosePreview,
}) => {
  const router = useRouter();
  const listRef = React.useRef<FlatList>(null);

  // Interaction tracking to prevent programmatic scroll feedback loops
  const isUserInteractingRef = React.useRef(false);
  const isProgrammaticScrollRef = React.useRef(false);
  const lastSettledIndexRef = React.useRef(selectedIndex);

  React.useEffect(() => {
    // If the index change was triggered by the user swiping the list, do NOT call scrollToIndex!
    if (isUserInteractingRef.current || lastSettledIndexRef.current === selectedIndex) {
      lastSettledIndexRef.current = selectedIndex;
      return;
    }

    if (selectedIndex >= 0 && selectedIndex < properties.length) {
      lastSettledIndexRef.current = selectedIndex;
      isProgrammaticScrollRef.current = true;
      try {
        listRef.current?.scrollToIndex({
          index: selectedIndex,
          animated: true,
        });
      } catch (err) {
        listRef.current?.scrollToOffset({
          offset: selectedIndex * (CARD_WIDTH + CARD_SPACING),
          animated: true,
        });
      }
    }
  }, [selectedIndex, properties.length]);

  if (!properties || properties.length === 0) return null;

  const renderCard = ({ item }: { item: CarouselProperty }) => {
    const photoUrl =
      item.property_media?.[0]?.url ||
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80';
    const saved = isPropertySaved(item.id);

    return (
      <TouchableOpacity
        style={styles.cardContainer}
        activeOpacity={0.92}
        onPress={() => router.push(`/property/${item.id}`)}
      >
        <View style={styles.cardImageContainer}>
          <Image source={{ uri: photoUrl }} style={styles.cardImage} resizeMode="cover" />

          {/* Top Floating Badges */}
          <View style={styles.topBadgeRow}>
            {item.isVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#ffffff" style={{ marginRight: 3 }} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            ) : (
              <View style={styles.listTypeBadge}>
                <Text style={styles.listTypeText}>
                  {item.list_type === 'RENT' ? 'FOR RENT' : 'FOR SALE'}
                </Text>
              </View>
            )}

            {/* Favorite Heart Button */}
            <TouchableOpacity
              style={styles.heartButton}
              onPress={(e) => {
                onToggleSaved(item.id);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={18}
                color={saved ? '#e11d48' : '#ffffff'}
              />
            </TouchableOpacity>
          </View>

          {/* Price Pill Tag hovering over image bottom */}
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>{formatPricePill(item.price)}</Text>
          </View>
        </View>

        {/* Card Details */}
        <View style={styles.cardDetails}>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {item.title}
          </Text>

          {item.address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-sharp" size={12} color="#94a3b8" style={{ marginRight: 2 }} />
              <Text style={styles.addressText} numberOfLines={1}>
                {item.address}
              </Text>
            </View>
          ) : null}

          {/* Specs Chips Row */}
          <View style={styles.specsRow}>
            {item.bedrooms !== undefined && item.bedrooms !== null ? (
              <View style={styles.specChip}>
                <Ionicons name="bed-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={styles.specText}>{item.bedrooms} bd</Text>
              </View>
            ) : null}

            {item.bathrooms !== undefined && item.bathrooms !== null ? (
              <View style={styles.specChip}>
                <Ionicons name="water-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={styles.specText}>{item.bathrooms} ba</Text>
              </View>
            ) : null}

            {item.area_sqft ? (
              <View style={styles.specChip}>
                <Ionicons name="expand-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={styles.specText}>{item.area_sqft} sqft</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.carouselWrapper}>
      {onClosePreview && (
        <TouchableOpacity style={styles.closeCapsule} onPress={onClosePreview} activeOpacity={0.8}>
          <Ionicons name="close" size={16} color="#0f172a" />
          <Text style={styles.closeCapsuleText}>Hide</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={listRef}
        data={properties}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={[styles.listContent, { paddingHorizontal: SIDE_INSET }]}
        onScrollBeginDrag={() => {
          isUserInteractingRef.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          isUserInteractingRef.current = false;
          if (isProgrammaticScrollRef.current) {
            isProgrammaticScrollRef.current = false;
            return;
          }

          const offsetX = e?.nativeEvent?.contentOffset?.x ?? 0;
          const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
          const clampedIndex = Math.max(0, Math.min(index, properties.length - 1));

          if (clampedIndex !== lastSettledIndexRef.current) {
            lastSettledIndexRef.current = clampedIndex;
            onSnapToIndex(clampedIndex);
          }
        }}
        onScrollEndDrag={(e) => {
          // If there is significant horizontal velocity, momentum scrolling will follow and fire onMomentumScrollEnd
          const velocityX = e?.nativeEvent?.velocity?.x ?? 0;
          if (Math.abs(velocityX) > 0.1) {
            return;
          }

          // If released without momentum, settle immediately using the current contentOffset
          isUserInteractingRef.current = false;
          if (isProgrammaticScrollRef.current) {
            isProgrammaticScrollRef.current = false;
            return;
          }

          const offsetX = e?.nativeEvent?.contentOffset?.x ?? 0;
          const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
          const clampedIndex = Math.max(0, Math.min(index, properties.length - 1));

          if (clampedIndex !== lastSettledIndexRef.current) {
            lastSettledIndexRef.current = clampedIndex;
            onSnapToIndex(clampedIndex);
          }
        }}
        renderItem={({ item, index }) => (
          <View style={{ marginRight: index === properties.length - 1 ? 0 : CARD_SPACING }}>
            {renderCard({ item })}
          </View>
        )}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + CARD_SPACING,
          offset: (CARD_WIDTH + CARD_SPACING) * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          const targetOffset = info.index * (CARD_WIDTH + CARD_SPACING);
          setTimeout(() => {
            listRef.current?.scrollToOffset({
              offset: targetOffset,
              animated: true,
            });
          }, 80);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  carouselWrapper: {
    width: '100%',
    zIndex: 40,
  },
  closeCapsule: {
    alignSelf: 'flex-end',
    marginRight: 24,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  closeCapsuleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 3,
  },
  listContent: {
    paddingVertical: 4,
  },
  cardContainer: {
    width: CARD_WIDTH,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  cardImageContainer: {
    width: '100%',
    height: 148,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  listTypeBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  listTypeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heartButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricePill: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#e11d48',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  priceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  cardDetails: {
    padding: 12,
  },
  propertyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
});

export default MobilePropertyCardCarousel;
