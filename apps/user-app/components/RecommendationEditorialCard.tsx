import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface RecommendationEditorialCardProps {
  item: any; // Property item with recommendation metadata
  matchScore?: number; // e.g. 98
  matchReason?: string; // e.g. 'Matches your luxury villa preference'
  isTopPick?: boolean; // Large hero format vs standard carousel card
  onPress?: () => void;
  onSaveToggle?: () => void;
  isSaved?: boolean;
  style?: StyleProp<ViewStyle>;
  velocityBadge?: string;
}

/**
 * Smart price formatter adhering to Apple HIG luxury typography.
 * Supports INR (₹ Cr / ₹ L) for Mumbai properties and USD ($) for LA / NY / international properties.
 */
export function formatEditorialPrice(item: any): string {
  const price = item?.price ?? item?.salePrice ?? item?.rentPrice ?? 0;
  const isRent = item?.list_type === 'RENT';
  const isIndia =
    item?.currency === 'INR' ||
    item?.city?.toLowerCase() === 'mumbai' ||
    (typeof item?.address === 'string' && item?.address?.toLowerCase().includes('mumbai'));

  if (isIndia) {
    if (price >= 10000000) {
      const cr = price / 10000000;
      return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr${isRent ? '/mo' : ''}`;
    }
    if (price >= 100000) {
      const l = price / 100000;
      return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)} L${isRent ? '/mo' : ''}`;
    }
    if (price >= 1000) {
      return `₹${(price / 1000).toFixed(0)}k${isRent ? '/mo' : ''}`;
    }
    return `₹${price.toLocaleString()}${isRent ? '/mo' : ''}`;
  }

  // USD / International
  if (isRent) {
    return `$${price.toLocaleString()}/mo`;
  }
  return `$${price.toLocaleString()}`;
}

export const RecommendationEditorialCard: React.FC<RecommendationEditorialCardProps> = ({
  item,
  matchScore,
  matchReason,
  isTopPick = false,
  onPress,
  onSaveToggle,
  isSaved = false,
  style,
  velocityBadge,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSavePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.78,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.25,
        friction: 3,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    onSaveToggle?.();
  };

  const score = matchScore ?? item?.matchScore ?? 98;
  const reason =
    matchReason ??
    item?.matchReason ??
    item?.aiRecommendationReason ??
    'Matches your preferred architectural style & luxury price band';

  const imageUrl =
    item?.property_media?.[0]?.url ||
    item?.imageUrl ||
    item?.thumbnailUrl ||
    item?.photos?.[0] ||
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=85';

  const formattedPrice = formatEditorialPrice(item);
  const city = item?.city || (item?.address?.split(',')[1]?.trim()) || 'Luxury Estate';

  return (
    <TouchableOpacity
      activeOpacity={0.93}
      onPress={onPress}
      style={[
        styles.container,
        isTopPick ? styles.heroContainer : styles.railContainer,
        style,
      ]}
    >
      {/* Background High-Resolution Architectural Image */}
      <Image
        source={{ uri: imageUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* Luxury Cinematic Scrim Gradient (App Store style) */}
      <LinearGradient
        colors={[
          'rgba(15, 23, 42, 0.45)',
          'rgba(15, 23, 42, 0.08)',
          'rgba(15, 23, 42, 0.65)',
          'rgba(15, 23, 42, 0.96)',
        ]}
        locations={[0, 0.28, 0.62, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top Floating Glassmorphic Badges */}
      <View style={styles.topRow}>
        {/* Glassmorphic Match Badge with Emerald Gradient & Border */}
        <LinearGradient
          colors={['rgba(5, 150, 105, 0.95)', 'rgba(4, 120, 87, 0.92)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.matchBadge}
        >
          <Text style={styles.matchBadgeText}>✨ {score}% Match</Text>
        </LinearGradient>

        <View style={styles.topRightRow}>
          {/* City Tag Pill */}
          {city ? (
            <View style={styles.cityPill}>
              <Ionicons name="location-sharp" size={11} color="#f8fafc" style={{ marginRight: 3 }} />
              <Text style={styles.cityPillText} numberOfLines={1}>
                {city}
              </Text>
            </View>
          ) : null}

          {/* Verified Listing Badge */}
          {item?.isVerified !== false && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#38bdf8" style={{ marginRight: 3 }} />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
          )}

          {/* Interactive Heart / Save Button with Smooth Scale Feedback */}
          {onSaveToggle && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSavePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.heartTouchable}
            >
              <Animated.View
                style={[
                  styles.heartCircle,
                  {
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: isSaved ? 'rgba(225, 29, 72, 0.9)' : 'rgba(15, 23, 42, 0.55)',
                    borderColor: isSaved ? '#f43f5e' : 'rgba(255, 255, 255, 0.25)',
                  },
                ]}
              >
                <Ionicons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={17}
                  color="#ffffff"
                />
              </Animated.View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Optional Velocity Badge for Trending Rails */}
      {Boolean(velocityBadge || item?.velocityBadge) && (
        <View style={styles.velocityRow}>
          <View style={styles.velocityBadge}>
            <Text style={styles.velocityBadgeText}>{velocityBadge || item?.velocityBadge}</Text>
          </View>
        </View>
      )}

      {/* Bottom Content Area */}
      <View style={[styles.bottomContent, isTopPick && styles.heroBottomContent]}>
        {/* Big Bold Apple Price Typography */}
        <View style={styles.priceRow}>
          <Text style={[styles.priceText, isTopPick ? styles.heroPriceText : styles.railPriceText]}>
            {formattedPrice}
          </Text>
          {item?.list_type && (
            <View style={styles.listTypeTag}>
              <Text style={styles.listTypeText}>
                {item.list_type === 'RENT' ? 'FOR LEASE' : 'EXCLUSIVE SALE'}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text
          style={[styles.titleText, isTopPick ? styles.heroTitleText : styles.railTitleText]}
          numberOfLines={isTopPick ? 2 : 1}
        >
          {item?.title || 'Prime Architectural Residence'}
        </Text>

        {/* Address Row with Pin Icon */}
        {item?.address ? (
          <View style={styles.addressRow}>
            <Ionicons name="location" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        ) : null}

        {/* Beds, Baths, Sqft Pill Cluster */}
        <View style={styles.specsCluster}>
          {item?.bedrooms !== undefined && item?.bedrooms !== null ? (
            <View style={styles.specChip}>
              <Ionicons name="bed-outline" size={12} color="#e2e8f0" style={{ marginRight: 4 }} />
              <Text style={styles.specChipText}>{item.bedrooms} bd</Text>
            </View>
          ) : null}

          {item?.bathrooms !== undefined && item?.bathrooms !== null ? (
            <View style={styles.specChip}>
              <Ionicons name="water-outline" size={12} color="#e2e8f0" style={{ marginRight: 4 }} />
              <Text style={styles.specChipText}>{item.bathrooms} ba</Text>
            </View>
          ) : null}

          {item?.area_sqft ? (
            <View style={styles.specChip}>
              <Ionicons name="expand-outline" size={12} color="#e2e8f0" style={{ marginRight: 4 }} />
              <Text style={styles.specChipText}>{item.area_sqft.toLocaleString()} sqft</Text>
            </View>
          ) : null}

          {item?.prop_type ? (
            <View style={[styles.specChip, styles.propTypeChip]}>
              <Text style={styles.propTypeChipText}>{item.prop_type}</Text>
            </View>
          ) : null}
        </View>

        {/* AI Match Reason Callout Pill with Icon */}
        <View style={[styles.matchReasonPill, isTopPick && styles.heroMatchReasonPill]}>
          <Ionicons name="bulb" size={13} color="#fde047" style={styles.reasonIcon} />
          <Text
            style={[styles.matchReasonText, isTopPick && styles.heroMatchReasonText]}
            numberOfLines={isTopPick ? 2 : 1}
          >
            <Text style={styles.matchReasonHighlight}>Why you'll love this: </Text>
            {reason}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f172a',
    position: 'relative',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContainer: {
    width: '100%',
    height: 440,
    borderRadius: 24,
    overflow: 'hidden',
  },
  railContainer: {
    width: 290,
    height: 385,
    borderRadius: 18,
    overflow: 'hidden',
  },

  // Top Row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 14,
    zIndex: 10,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.45)',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  matchBadgeText: {
    color: '#ecfdf5',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    maxWidth: 100,
  },
  cityPillText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  verifiedBadgeText: {
    color: '#e0f2fe',
    fontSize: 11,
    fontWeight: '600',
  },
  heartTouchable: {
    padding: 2,
  },
  heartCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  velocityRow: {
    paddingHorizontal: 14,
    marginTop: 8,
    flexDirection: 'row',
  },
  velocityBadge: {
    backgroundColor: 'rgba(225, 29, 72, 0.88)',
    paddingVertical: 3.5,
    paddingHorizontal: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.35)',
  },
  velocityBadgeText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Bottom Content
  bottomContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  heroBottomContent: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  priceText: {
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroPriceText: {
    fontSize: 28,
  },
  railPriceText: {
    fontSize: 22,
  },
  listTypeTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  listTypeText: {
    color: '#f8fafc',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titleText: {
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  heroTitleText: {
    fontSize: 19,
    lineHeight: 24,
  },
  railTitleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addressText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },

  // Specs Cluster
  specsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  specChipText: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: '600',
  },
  propTypeChip: {
    backgroundColor: 'rgba(244, 63, 94, 0.22)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  propTypeChipText: {
    color: '#fecdd3',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // AI Match Reason Pill
  matchReasonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  heroMatchReasonPill: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 12,
  },
  reasonIcon: {
    marginRight: 6,
  },
  matchReasonText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    lineHeight: 15,
  },
  heroMatchReasonText: {
    fontSize: 12,
    lineHeight: 16,
  },
  matchReasonHighlight: {
    color: '#fde047',
    fontWeight: '700',
  },
});
