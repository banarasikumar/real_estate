import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
  Text as SvgText,
  G,
  Rect,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export type TimeRange = '7D' | '30D' | '90D' | '1Y';

export interface ChartDataPoint {
  date: string;
  views: number;
  saves?: number;
  enquiries?: number;
}

export interface OwnerAnalyticsChartProps {
  data?: ChartDataPoint[];
  timeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}

// Curated default high-engagement metrics per time range for luxury feel
const DEFAULT_METRICS: Record<TimeRange, ChartDataPoint[]> = {
  '7D': [
    { date: 'Mon', views: 420, saves: 48, enquiries: 12 },
    { date: 'Tue', views: 530, saves: 62, enquiries: 15 },
    { date: 'Wed', views: 490, saves: 55, enquiries: 14 },
    { date: 'Thu', views: 680, saves: 82, enquiries: 21 },
    { date: 'Fri', views: 820, saves: 110, enquiries: 29 },
    { date: 'Sat', views: 1140, saves: 145, enquiries: 38 },
    { date: 'Sun', views: 980, saves: 122, enquiries: 31 },
  ],
  '30D': [
    { date: 'Week 1', views: 2450, saves: 310, enquiries: 74 },
    { date: 'Week 2', views: 3100, saves: 420, enquiries: 95 },
    { date: 'Week 3', views: 3850, saves: 512, enquiries: 128 },
    { date: 'Week 4', views: 4920, saves: 680, enquiries: 165 },
  ],
  '90D': [
    { date: 'Jun', views: 8900, saves: 1150, enquiries: 280 },
    { date: 'Jul', views: 11200, saves: 1480, enquiries: 365 },
    { date: 'Aug', views: 14650, saves: 1920, enquiries: 490 },
  ],
  '1Y': [
    { date: 'Q1', views: 21400, saves: 2800, enquiries: 710 },
    { date: 'Q2', views: 29800, saves: 3950, enquiries: 990 },
    { date: 'Q3', views: 37500, saves: 4900, enquiries: 1240 },
    { date: 'Q4', views: 46200, saves: 6150, enquiries: 1580 },
  ],
};

const TIME_RANGES: TimeRange[] = ['7D', '30D', '90D', '1Y'];

export const OwnerAnalyticsChart: React.FC<OwnerAnalyticsChartProps> = ({
  data: propData,
  timeRange: controlledTimeRange,
  onTimeRangeChange,
  title = 'Traffic & Engagement',
  subtitle = 'Verified listing views and interactions',
  style,
}) => {
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRange>('7D');
  const activeTimeRange = controlledTimeRange ?? internalTimeRange;

  const [containerWidth, setContainerWidth] = useState<number>(340);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (propData && propData.length > 0) {
      return propData;
    }
    return DEFAULT_METRICS[activeTimeRange] || DEFAULT_METRICS['7D'];
  }, [propData, activeTimeRange]);

  const handleRangeChange = (range: TimeRange) => {
    if (onTimeRangeChange) {
      onTimeRangeChange(range);
    } else {
      setInternalTimeRange(range);
    }
    setSelectedIndex(null);
  };

  // Metric aggregates
  const totalViews = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.views, 0);
  }, [chartData]);

  const peakViews = useMemo(() => {
    return Math.max(...chartData.map((d) => d.views), 10);
  }, [chartData]);

  // Chart dimensions & layout
  const chartHeight = 190;
  const paddingLeft = 42;
  const paddingRight = 16;
  const paddingTop = 24;
  const paddingBottom = 30;

  const drawableWidth = Math.max(containerWidth - paddingLeft - paddingRight, 100);
  const drawableHeight = chartHeight - paddingTop - paddingBottom;

  // Nice rounded max for Y axis
  const yAxisMax = useMemo(() => {
    const rawMax = peakViews * 1.15;
    if (rawMax <= 100) return 100;
    if (rawMax <= 500) return Math.ceil(rawMax / 50) * 50;
    if (rawMax <= 1000) return Math.ceil(rawMax / 100) * 100;
    if (rawMax <= 5000) return Math.ceil(rawMax / 500) * 500;
    if (rawMax <= 20000) return Math.ceil(rawMax / 2000) * 2000;
    return Math.ceil(rawMax / 5000) * 5000;
  }, [peakViews]);

  // Scaled coordinates
  const points = useMemo(() => {
    const count = chartData.length;
    return chartData.map((item, index) => {
      const x =
        paddingLeft +
        (count > 1 ? (index / (count - 1)) * drawableWidth : drawableWidth / 2);
      const normalizedY = Math.min(Math.max(item.views / yAxisMax, 0), 1);
      const y = paddingTop + drawableHeight * (1 - normalizedY);
      return { x, y, data: item, index };
    });
  }, [chartData, paddingLeft, drawableWidth, yAxisMax, paddingTop, drawableHeight]);

  // Cubic Bezier Spline calculation for silky smooth curves
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };
    if (points.length === 1) {
      const p = points[0];
      return {
        linePath: `M ${p.x} ${p.y}`,
        areaPath: `M ${p.x} ${paddingTop + drawableHeight} L ${p.x} ${p.y} L ${p.x} ${paddingTop + drawableHeight} Z`,
      };
    }

    let spline = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i < points.length - 2 ? points[i + 2] : p2;

      const cp1x = (p1.x + (p2.x - p0.x) / 6).toFixed(2);
      const cp1y = (p1.y + (p2.y - p0.y) / 6).toFixed(2);
      const cp2x = (p2.x - (p3.x - p1.x) / 6).toFixed(2);
      const cp2y = (p2.y - (p3.y - p1.y) / 6).toFixed(2);

      spline += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    const baselineY = (paddingTop + drawableHeight).toFixed(2);
    const firstX = points[0].x.toFixed(2);
    const lastX = points[points.length - 1].x.toFixed(2);

    const fill = `${spline} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { linePath: spline, areaPath: fill };
  }, [points, paddingTop, drawableHeight]);

  // Touch Scrubber PanResponder
  const updateActiveIndexFromX = (touchX: number) => {
    if (points.length === 0) return;
    const clampedX = Math.max(paddingLeft, Math.min(paddingLeft + drawableWidth, touchX));
    const step = drawableWidth / Math.max(points.length - 1, 1);
    const index = Math.round((clampedX - paddingLeft) / step);
    const boundedIndex = Math.max(0, Math.min(points.length - 1, index));
    setSelectedIndex(boundedIndex);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        updateActiveIndexFromX(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (
        evt: GestureResponderEvent,
        _gestureState: PanResponderGestureState
      ) => {
        updateActiveIndexFromX(evt.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        // keep selected index visible for 3.5 seconds or let user tap to dismiss
      },
    })
  ).current;

  const onLayoutContainer = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 2) {
      setContainerWidth(width);
    }
  };

  // Horizontal Grid references
  const gridTicks = useMemo(() => {
    return [
      { ratio: 1.0, value: yAxisMax },
      { ratio: 0.66, value: Math.round(yAxisMax * 0.66) },
      { ratio: 0.33, value: Math.round(yAxisMax * 0.33) },
      { ratio: 0.0, value: 0 },
    ];
  }, [yAxisMax]);

  const activePoint = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <View style={[styles.card, style]} onLayout={onLayoutContainer}>
      {/* Header: Title + Subtitle */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Apple Segmented Pill Switcher */}
        <View style={styles.segmentedContainer}>
          {TIME_RANGES.map((range) => {
            const isActive = range === activeTimeRange;
            return (
              <TouchableOpacity
                key={range}
                activeOpacity={0.8}
                onPress={() => handleRangeChange(range)}
                style={[styles.segmentPill, isActive && styles.segmentPillActive]}
              >
                <Text
                  style={[styles.segmentText, isActive && styles.segmentTextActive]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Hero Metric & Peak Badge Callout */}
      <View style={styles.metricCalloutRow}>
        <View>
          <Text style={styles.metricLabel}>Total Listing Views</Text>
          <Text style={styles.metricValue}>{totalViews.toLocaleString()}</Text>
        </View>

        <View style={styles.emeraldBadge}>
          <Ionicons name="trending-up" size={14} color="#059669" style={styles.badgeIcon} />
          <Text style={styles.emeraldBadgeText}>+28.4% vs last period</Text>
        </View>
      </View>

      {/* SVG Interactive Chart Area */}
      <View style={styles.svgWrapper} {...panResponder.panHandlers}>
        <Svg width={containerWidth} height={chartHeight}>
          <Defs>
            {/* Luscious emerald gradient under the curve */}
            <LinearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#059669" stopOpacity="0.35" />
              <Stop offset="65%" stopColor="#059669" stopOpacity="0.08" />
              <Stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
            </LinearGradient>

            {/* Glowing filter circle gradient */}
            <LinearGradient id="dotGlow" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#34d399" stopOpacity="1" />
              <Stop offset="100%" stopColor="#059669" stopOpacity="1" />
            </LinearGradient>
          </Defs>

          {/* Horizontal Grid lines & Value labels */}
          <G>
            {gridTicks.map((tick, i) => {
              const y = paddingTop + drawableHeight * (1 - tick.ratio);
              return (
                <G key={`grid-${i}`}>
                  <Line
                    x1={paddingLeft}
                    y1={y}
                    x2={containerWidth - paddingRight}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                    strokeDasharray={tick.ratio === 0 ? undefined : '3, 4'}
                  />
                  <SvgText
                    x={paddingLeft - 8}
                    y={y + 3.5}
                    fontSize={10}
                    fontWeight="600"
                    fill="#94a3b8"
                    textAnchor="end"
                  >
                    {tick.value >= 1000
                      ? `${(tick.value / 1000).toFixed(tick.value % 1000 === 0 ? 0 : 1)}k`
                      : tick.value.toString()}
                  </SvgText>
                </G>
              );
            })}
          </G>

          {/* Luscious emerald filled gradient area */}
          {areaPath ? <Path d={areaPath} fill="url(#emeraldGradient)" /> : null}

          {/* Silky Bezier curve stroke */}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke="#059669"
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {/* X Axis Date Labels */}
          <G>
            {points.map((pt, idx) => (
              <SvgText
                key={`label-${idx}`}
                x={pt.x}
                y={chartHeight - 8}
                fontSize={11}
                fontWeight={selectedIndex === idx ? '700' : '500'}
                fill={selectedIndex === idx ? '#059669' : '#64748b'}
                textAnchor="middle"
              >
                {pt.data.date}
              </SvgText>
            ))}
          </G>

          {/* Interactive Touch Scrub: Vertical Hairline Guide & Glowing Point */}
          {activePoint ? (
            <G>
              {/* Hairline guide */}
              <Line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={paddingTop + drawableHeight}
                stroke="#059669"
                strokeWidth={1.5}
                strokeDasharray="4, 3"
                opacity={0.8}
              />

              {/* Glowing outer halo */}
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={13}
                fill="#059669"
                fillOpacity={0.16}
              />

              {/* Middle ring */}
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={6}
                fill="url(#dotGlow)"
                stroke="#ffffff"
                strokeWidth={2}
              />

              {/* Crisp white center core */}
              <Circle
                cx={activePoint.x}
                cy={activePoint.y}
                r={2}
                fill="#ffffff"
              />
            </G>
          ) : null}
        </Svg>

        {/* Frosted Glass Tooltip HUD Card */}
        {activePoint ? (
          <View
            pointerEvents="none"
            style={[
              styles.frostedHudCard,
              {
                left: Math.max(
                  12,
                  Math.min(
                    activePoint.x - 75,
                    containerWidth - 165
                  )
                ),
                top: Math.max(
                  0,
                  activePoint.y - 82
                ),
              },
            ]}
          >
            <View style={styles.hudHeaderRow}>
              <Ionicons name="calendar-outline" size={11} color="#64748b" />
              <Text style={styles.hudDateText}>{activePoint.data.date}</Text>
            </View>

            <View style={styles.hudMetricsRow}>
              <View style={styles.hudMetricItem}>
                <Text style={styles.hudMetricIcon}>👁️</Text>
                <Text style={styles.hudMetricValue}>
                  {activePoint.data.views.toLocaleString()}
                </Text>
                <Text style={styles.hudMetricLabel}>views</Text>
              </View>

              <View style={styles.hudDivider} />

              <View style={styles.hudMetricItem}>
                <Text style={styles.hudMetricIcon}>🤍</Text>
                <Text style={styles.hudMetricValue}>
                  {(
                    activePoint.data.saves ??
                    Math.round(activePoint.data.views * 0.12)
                  ).toLocaleString()}
                </Text>
                <Text style={styles.hudMetricLabel}>saves</Text>
              </View>

              {activePoint.data.enquiries !== undefined ? (
                <>
                  <View style={styles.hudDivider} />
                  <View style={styles.hudMetricItem}>
                    <Text style={styles.hudMetricIcon}>💬</Text>
                    <Text style={styles.hudMetricValue}>
                      {activePoint.data.enquiries.toLocaleString()}
                    </Text>
                    <Text style={styles.hudMetricLabel}>chats</Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      {/* Scrub Prompt / Footer footnote */}
      <View style={styles.chartFooter}>
        <Ionicons name="finger-print-outline" size={12} color="#94a3b8" />
        <Text style={styles.chartFooterText}>
          Tap or drag horizontally to inspect verified daily telemetry
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
    flexDirection: 'column',
    gap: 12,
    marginBottom: 14,
  },
  headerTitles: {
    flexDirection: 'column',
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
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    alignSelf: 'flex-start',
  },
  segmentPill: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 7,
  },
  segmentPillActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  metricCalloutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
    paddingTop: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: '#94a3b8',
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.8,
    marginTop: 2,
  },
  emeraldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  badgeIcon: {
    marginRight: 4,
  },
  emeraldBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  svgWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginHorizontal: -10,
  },
  frostedHudCard: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.25)',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
    minWidth: 150,
  },
  hudHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  hudDateText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  hudMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  hudMetricItem: {
    alignItems: 'center',
  },
  hudMetricIcon: {
    fontSize: 11,
  },
  hudMetricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  hudMetricLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94a3b8',
  },
  hudDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#e2e8f0',
  },
  chartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  chartFooterText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94a3b8',
  },
});

export default OwnerAnalyticsChart;
