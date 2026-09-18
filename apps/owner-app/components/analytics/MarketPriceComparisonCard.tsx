import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Polygon,
  Circle,
  Line,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export interface MarketCityMetric {
  city: string;
  portfolioPricePerSqft: number;
  marketMedianPricePerSqft: number;
  fairMinPricePerSqft: number;
  fairMaxPricePerSqft: number;
  totalListings?: number;
  note?: string;
}

export interface MarketPriceComparisonCardProps {
  data?: MarketCityMetric[];
  selectedCity?: string;
  onSelectCity?: (city: string) => void;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_MARKET_DATA: MarketCityMetric[] = [
  {
    city: 'All Portfolio',
    portfolioPricePerSqft: 1420,
    marketMedianPricePerSqft: 1390,
    fairMinPricePerSqft: 1320,
    fairMaxPricePerSqft: 1460,
    totalListings: 6,
    note: 'Balanced portfolio pricing yields maximum qualified tour conversions.',
  },
  {
    city: 'Los Angeles',
    portfolioPricePerSqft: 1680,
    marketMedianPricePerSqft: 1650,
    fairMinPricePerSqft: 1560,
    fairMaxPricePerSqft: 1740,
    totalListings: 3,
    note: 'Bel Air & Beverly Hills listings are in optimal fair value tier.',
  },
  {
    city: 'New York',
    portfolioPricePerSqft: 2450,
    marketMedianPricePerSqft: 2380,
    fairMinPricePerSqft: 2260,
    fairMaxPricePerSqft: 2520,
    totalListings: 2,
    note: 'Manhattan penthouses command steady +2.9% premium above median.',
  },
  {
    city: 'Miami Beach',
    portfolioPricePerSqft: 1290,
    marketMedianPricePerSqft: 1340,
    fairMinPricePerSqft: 1250,
    fairMaxPricePerSqft: 1420,
    totalListings: 1,
    note: 'Waterfront condo priced attractively for rapid seasonal closing.',
  },
];

export const MarketPriceComparisonCard: React.FC<MarketPriceComparisonCardProps> = ({
  data = DEFAULT_MARKET_DATA,
  selectedCity: controlledCity,
  onSelectCity,
  title = 'Price Competitiveness',
  subtitle = 'Portfolio vs. active luxury market comps',
  style,
}) => {
  const [internalCity, setInternalCity] = useState<string>(data[0]?.city || 'All Portfolio');
  const [gaugeWidth, setGaugeWidth] = useState<number>(300);

  const activeCityName = controlledCity ?? internalCity;

  const currentMetric = useMemo(() => {
    return (
      data.find((item) => item.city === activeCityName) ||
      data[0] ||
      DEFAULT_MARKET_DATA[0]
    );
  }, [data, activeCityName]);

  const handleCitySelect = (city: string) => {
    if (onSelectCity) {
      onSelectCity(city);
    } else {
      setInternalCity(city);
    }
  };

  const onGaugeLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - gaugeWidth) > 2) {
      setGaugeWidth(width);
    }
  };

  // Pricing analysis
  const {
    portfolioPricePerSqft,
    marketMedianPricePerSqft,
    fairMinPricePerSqft,
    fairMaxPricePerSqft,
  } = currentMetric;

  const diffPct =
    ((portfolioPricePerSqft - marketMedianPricePerSqft) /
      marketMedianPricePerSqft) *
    100;
  const isOptimal =
    portfolioPricePerSqft >= fairMinPricePerSqft &&
    portfolioPricePerSqft <= fairMaxPricePerSqft;
  const isBelowMarket = portfolioPricePerSqft < fairMinPricePerSqft;
  const isPremiumAbove = portfolioPricePerSqft > fairMaxPricePerSqft;

  // Gauge bounding: show span from -25% below median to +25% above median
  const gaugeMin = Math.round(marketMedianPricePerSqft * 0.78);
  const gaugeMax = Math.round(marketMedianPricePerSqft * 1.22);
  const totalSpan = Math.max(gaugeMax - gaugeMin, 1);

  // Pointer position clamped between 0 and 1
  const rawRatio = (portfolioPricePerSqft - gaugeMin) / totalSpan;
  const clampedRatio = Math.max(0.04, Math.min(0.96, rawRatio));
  const pointerX = Math.round(gaugeWidth * clampedRatio);

  // Zone boundary coordinates
  const zone1EndX = Math.round(
    gaugeWidth * Math.max(0.1, (fairMinPricePerSqft - gaugeMin) / totalSpan)
  );
  const zone2EndX = Math.round(
    gaugeWidth * Math.min(0.9, (fairMaxPricePerSqft - gaugeMin) / totalSpan)
  );

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Optimal Checkmark Pill */}
        {isOptimal ? (
          <View style={styles.optimalPill}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={styles.optimalPillText}>Optimal Pricing</Text>
          </View>
        ) : isBelowMarket ? (
          <View style={styles.velocityPill}>
            <Ionicons name="flash" size={13} color="#2563eb" />
            <Text style={styles.velocityPillText}>High Velocity</Text>
          </View>
        ) : (
          <View style={styles.premiumPill}>
            <Ionicons name="diamond" size={13} color="#d97706" />
            <Text style={styles.premiumPillText}>Premium Tier</Text>
          </View>
        )}
      </View>

      {/* City Switcher Pills */}
      {data.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cityScrollContainer}
          style={styles.cityScrollView}
        >
          {data.map((item) => {
            const isSelected = item.city === activeCityName;
            return (
              <TouchableOpacity
                key={item.city}
                activeOpacity={0.8}
                onPress={() => handleCitySelect(item.city)}
                style={[
                  styles.cityPill,
                  isSelected && styles.cityPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.cityPillText,
                    isSelected && styles.cityPillTextActive,
                  ]}
                >
                  {item.city}
                </Text>
                {item.totalListings ? (
                  <View
                    style={[
                      styles.cityCountBadge,
                      isSelected && styles.cityCountBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.cityCountText,
                        isSelected && styles.cityCountTextActive,
                      ]}
                    >
                      {item.totalListings}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* KPI Comparison Cards Row */}
      <View style={styles.metricsGrid}>
        {/* Portfolio Average */}
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>Portfolio Avg</Text>
          <Text style={styles.metricBoxValue}>
            ${portfolioPricePerSqft.toLocaleString()}
          </Text>
          <Text style={styles.metricBoxUnit}>per sq.ft.</Text>
        </View>

        {/* Divider */}
        <View style={styles.metricBoxDivider} />

        {/* Market Median */}
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>Market Median</Text>
          <Text style={styles.metricBoxValue}>
            ${marketMedianPricePerSqft.toLocaleString()}
          </Text>
          <Text style={styles.metricBoxUnit}>per sq.ft.</Text>
        </View>

        {/* Divider */}
        <View style={styles.metricBoxDivider} />

        {/* Variance */}
        <View style={styles.metricBox}>
          <Text style={styles.metricBoxLabel}>Competitiveness</Text>
          <View style={styles.varianceRow}>
            <Text
              style={[
                styles.varianceValue,
                diffPct > 0 ? styles.variancePositive : styles.varianceNegative,
              ]}
            >
              {diffPct >= 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`}
            </Text>
          </View>
          <Text style={styles.metricBoxUnit}>vs. comps</Text>
        </View>
      </View>

      {/* Visual Competitiveness Gauge Bar */}
      <View style={styles.gaugeWrapper} onLayout={onGaugeLayout}>
        <View style={styles.gaugeHeaderRow}>
          <Text style={styles.gaugeLabel}>PRICING POSITION GAUGE</Text>
          <Text style={styles.gaugePositionIndicator}>
            {isOptimal
              ? 'Market Fair Value (Optimal)'
              : isBelowMarket
              ? 'Below Market (High Velocity)'
              : 'Premium Above Market'}
          </Text>
        </View>

        {/* SVG Gauge Track with Pointer */}
        <Svg width={gaugeWidth} height={42}>
          <Defs>
            {/* Zone 1: Below Market Blue */}
            <LinearGradient id="zoneBelow" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
            </LinearGradient>

            {/* Zone 2: Optimal Emerald */}
            <LinearGradient id="zoneOptimal" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#34d399" stopOpacity="1" />
              <Stop offset="100%" stopColor="#059669" stopOpacity="1" />
            </LinearGradient>

            {/* Zone 3: Premium Amber */}
            <LinearGradient id="zonePremium" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#d97706" stopOpacity="0.9" />
            </LinearGradient>
          </Defs>

          {/* Zone 1: Below Market */}
          <Rect
            x={0}
            y={12}
            width={zone1EndX}
            height={12}
            rx={6}
            fill="url(#zoneBelow)"
          />

          {/* Zone 2: Optimal Fair Value */}
          <Rect
            x={zone1EndX + 3}
            y={12}
            width={Math.max(zone2EndX - zone1EndX - 6, 10)}
            height={12}
            rx={6}
            fill="url(#zoneOptimal)"
          />

          {/* Zone 3: Premium Above */}
          <Rect
            x={zone2EndX}
            y={12}
            width={Math.max(gaugeWidth - zone2EndX, 10)}
            height={12}
            rx={6}
            fill="url(#zonePremium)"
          />

          {/* Dynamic Pointer Marker */}
          {/* Vertical marker line */}
          <Line
            x1={pointerX}
            y1={4}
            x2={pointerX}
            y2={32}
            stroke="#0f172a"
            strokeWidth={2.5}
          />

          {/* Top Pointer Triangle */}
          <Polygon
            points={`${pointerX - 5},2 ${pointerX + 5},2 ${pointerX},9`}
            fill="#0f172a"
          />

          {/* Bottom Pointer Circle */}
          <Circle
            cx={pointerX}
            cy={33}
            r={4}
            fill="#0f172a"
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        </Svg>

        {/* 3 Zone Labels */}
        <View style={styles.gaugeLabelsRow}>
          <Text style={[styles.zoneText, styles.zoneBelowText]}>
            Below Market{'\n'}(High Velocity)
          </Text>
          <Text style={[styles.zoneText, styles.zoneOptimalText]}>
            Market Fair Value{'\n'}(Optimal)
          </Text>
          <Text style={[styles.zoneText, styles.zonePremiumText]}>
            Premium Above{'\n'}Market
          </Text>
        </View>
      </View>

      {/* Strategy Footnote / Insight */}
      <View style={styles.footerNote}>
        <Ionicons
          name={isOptimal ? 'shield-checkmark-outline' : 'bulb-outline'}
          size={14}
          color={isOptimal ? '#059669' : '#d97706'}
          style={styles.footerNoteIcon}
        />
        <Text style={styles.footerNoteText}>
          {currentMetric.note ||
            'Your listings are competitively calibrated to maximize qualified showings.'}
        </Text>
      </View>
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
    alignItems: 'flex-start',
    marginBottom: 14,
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
  optimalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 5,
  },
  optimalPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  velocityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  velocityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    gap: 4,
  },
  premiumPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d97706',
  },
  cityScrollView: {
    marginBottom: 14,
    marginHorizontal: -2,
  },
  cityScrollContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  cityPillActive: {
    backgroundColor: '#0f172a',
  },
  cityPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  cityPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cityCountBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  cityCountBadgeActive: {
    backgroundColor: '#334155',
  },
  cityCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  cityCountTextActive: {
    color: '#94a3b8',
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricBoxLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricBoxValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  metricBoxUnit: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  metricBoxDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e2e8f0',
  },
  varianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  varianceValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  variancePositive: {
    color: '#059669',
  },
  varianceNegative: {
    color: '#2563eb',
  },
  gaugeWrapper: {
    marginBottom: 12,
  },
  gaugeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gaugeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.7,
  },
  gaugePositionIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  gaugeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  zoneText: {
    fontSize: 9.5,
    fontWeight: '600',
    lineHeight: 12,
  },
  zoneBelowText: {
    color: '#0284c7',
    textAlign: 'left',
  },
  zoneOptimalText: {
    color: '#059669',
    textAlign: 'center',
    fontWeight: '700',
  },
  zonePremiumText: {
    color: '#d97706',
    textAlign: 'right',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  footerNoteIcon: {
    marginTop: 1,
  },
  footerNoteText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: '#475569',
    lineHeight: 15,
  },
});

export default MarketPriceComparisonCard;
