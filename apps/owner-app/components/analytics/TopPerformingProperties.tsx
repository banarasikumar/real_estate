import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface TopProperty {
  id: string;
  title: string;
  address: string;
  city?: string;
  price: number | string;
  priceType?: 'SALE' | 'RENT';
  imageUrl?: string;
  views: number;
  saves: number;
  chats: number;
  conversionRate?: number;
  demandLabel?: string;
  status?: 'PUBLISHED' | 'PENDING_APPROVAL' | 'RENTED' | 'SOLD';
}

export interface TopPerformingPropertiesProps {
  properties?: TopProperty[];
  onSelectProperty?: (property: TopProperty) => void;
  title?: string;
  subtitle?: string;
  onAddNewListing?: () => void;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_PROPERTIES: TopProperty[] = [
  {
    id: 'prop-1',
    title: 'The Bel-Air Horizon Villa',
    address: '10480 Bellagio Road, Bel Air, CA',
    city: 'Los Angeles',
    price: 18500000,
    priceType: 'SALE',
    imageUrl:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=600&q=80',
    views: 4820,
    saves: 342,
    chats: 48,
    conversionRate: 8.9,
    demandLabel: 'High Demand',
    status: 'PUBLISHED',
  },
  {
    id: 'prop-2',
    title: 'Tribeca Sky Penthouse',
    address: '56 Leonard St, Apt 48A, New York, NY',
    city: 'New York',
    price: 32000,
    priceType: 'RENT',
    imageUrl:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80',
    views: 3640,
    saves: 289,
    chats: 34,
    conversionRate: 8.2,
    demandLabel: 'Top 5% Velocity',
    status: 'PUBLISHED',
  },
  {
    id: 'prop-3',
    title: 'Biscayne Bay Waterfront Estate',
    address: '428 S Hibiscus Dr, Miami Beach, FL',
    city: 'Miami',
    price: 12900000,
    priceType: 'SALE',
    imageUrl:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80',
    views: 2910,
    saves: 198,
    chats: 26,
    conversionRate: 7.7,
    demandLabel: 'Steady Demand',
    status: 'PUBLISHED',
  },
];

export const TopPerformingProperties: React.FC<TopPerformingPropertiesProps> = ({
  properties: propList,
  onSelectProperty,
  title = 'Top Performing Listings',
  subtitle = 'Ranked by verified buyer interest and engagement',
  onAddNewListing,
  style,
}) => {
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});

  // If user passes undefined, default to luxury demo listings; if empty array is passed, show empty state
  const items = propList !== undefined ? propList : DEFAULT_PROPERTIES;

  const formatPrice = (price: number | string, priceType?: 'SALE' | 'RENT') => {
    if (typeof price === 'string') return price;
    const formatted = `$${price.toLocaleString()}`;
    return priceType === 'RENT' ? `${formatted}/mo` : formatted;
  };

  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) {
      return {
        container: styles.rankGold,
        text: styles.rankGoldText,
        label: '#1',
        icon: 'trophy',
      };
    }
    if (rank === 2) {
      return {
        container: styles.rankSilver,
        text: styles.rankSilverText,
        label: '#2',
        icon: 'medal',
      };
    }
    if (rank === 3) {
      return {
        container: styles.rankBronze,
        text: styles.rankBronzeText,
        label: '#3',
        icon: 'ribbon',
      };
    }
    return {
      container: styles.rankDefault,
      text: styles.rankDefaultText,
      label: `#${rank}`,
      icon: null,
    };
  };

  const handleImageError = (id: string) => {
    setImageErrorMap((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.trophyIconSquircle}>
          <Ionicons name="sparkles" size={16} color="#d97706" />
        </View>
      </View>

      {/* Empty State */}
      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="business-outline" size={32} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No Performance Data Yet</Text>
          <Text style={styles.emptyBody}>
            Listings appear here once published and receiving buyer traffic and inquiries.
          </Text>
          {onAddNewListing ? (
            <TouchableOpacity
              style={styles.emptyButton}
              activeOpacity={0.85}
              onPress={onAddNewListing}
            >
              <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Create New Listing</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        /* Top Listings List */
        <View style={styles.listContainer}>
          {items.map((prop, idx) => {
            const rank = idx + 1;
            const rankBadge = getRankBadgeStyle(rank);
            const hasImgError = Boolean(imageErrorMap[prop.id]);
            const calculatedConv =
              prop.conversionRate ??
              Number(((prop.saves / Math.max(prop.views, 1)) * 100).toFixed(1));

            return (
              <TouchableOpacity
                key={prop.id}
                activeOpacity={0.88}
                onPress={() => onSelectProperty?.(prop)}
                style={styles.propertyRow}
              >
                {/* Thumbnail with Rank Badge overlay */}
                <View style={styles.thumbnailWrapper}>
                  {prop.imageUrl && !hasImgError ? (
                    <Image
                      source={{ uri: prop.imageUrl }}
                      style={styles.thumbnail}
                      onError={() => handleImageError(prop.id)}
                    />
                  ) : (
                    <View style={styles.thumbnailFallback}>
                      <Ionicons name="home-outline" size={26} color="#94a3b8" />
                    </View>
                  )}

                  {/* Rank Badge */}
                  <View style={[styles.rankBadge, rankBadge.container]}>
                    <Text style={[styles.rankBadgeText, rankBadge.text]}>
                      {rankBadge.label}
                    </Text>
                  </View>
                </View>

                {/* Details Column */}
                <View style={styles.detailsCol}>
                  {/* Title & Price */}
                  <View style={styles.titlePriceRow}>
                    <Text style={styles.propTitle} numberOfLines={1}>
                      {prop.title}
                    </Text>
                    <Text style={styles.propPrice}>
                      {formatPrice(prop.price, prop.priceType)}
                    </Text>
                  </View>

                  {/* Address */}
                  <Text style={styles.propAddress} numberOfLines={1}>
                    {prop.address}
                  </Text>

                  {/* Metrics Row: Views, Saves, Chats */}
                  <View style={styles.metricsPillRow}>
                    <View style={styles.metricPill}>
                      <Text style={styles.metricPillText}>
                        👁️ {prop.views.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.metricPill}>
                      <Text style={styles.metricPillText}>
                        🤍 {prop.saves.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.metricPill}>
                      <Text style={styles.metricPillText}>
                        💬 {prop.chats.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Conversion Score Badge */}
                  <View style={styles.convBadgeRow}>
                    <View style={styles.convBadge}>
                      <Text style={styles.convBadgeStar}>⭐</Text>
                      <Text style={styles.convBadgeText}>
                        {calculatedConv}% Conv. • {prop.demandLabel || 'High Demand'}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitles: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  trophyIconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  listContainer: {
    flexDirection: 'column',
    gap: 14,
  },
  propertyRow: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
  },
  thumbnailWrapper: {
    position: 'relative',
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  thumbnailFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
  },
  rankBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  rankGold: {
    backgroundColor: '#f59e0b',
  },
  rankGoldText: {
    color: '#ffffff',
  },
  rankSilver: {
    backgroundColor: '#64748b',
  },
  rankSilverText: {
    color: '#ffffff',
  },
  rankBronze: {
    backgroundColor: '#b45309',
  },
  rankBronzeText: {
    color: '#ffffff',
  },
  rankDefault: {
    backgroundColor: '#94a3b8',
  },
  rankDefaultText: {
    color: '#ffffff',
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 6,
  },
  propTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  propPrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#059669',
  },
  propAddress: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  metricsPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  metricPill: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  convBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  convBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 4,
  },
  convBadgeStar: {
    fontSize: 9.5,
  },
  convBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default TopPerformingProperties;
