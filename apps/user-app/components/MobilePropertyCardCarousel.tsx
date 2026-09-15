import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 340);
export const CARD_SPACING = 12;

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
  return `₹${price.toLocaleString()}`;
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

  React.useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < properties.length) {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true,
      });
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
        snapToAlignment="center"
        decelerationRate="fast"
        contentContainerStyle={styles.listContent}
        onMomentumScrollEnd={(e) => {
          const offsetX = e.nativeEvent.contentOffset.x;
          const index = Math.round(offsetX / (CARD_WIDTH + CARD_SPACING));
          if (index >= 0 && index < properties.length && index !== selectedIndex) {
            onSnapToIndex(index);
          }
        }}
        renderItem={renderCard}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + CARD_SPACING,
          offset: (CARD_WIDTH + CARD_SPACING) * index,
          index,
        })}
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
    paddingHorizontal: 24,
    gap: CARD_SPACING,
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
