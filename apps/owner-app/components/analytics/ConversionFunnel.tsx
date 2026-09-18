import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Circle,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

export interface FunnelCounts {
  views: number;
  saves: number;
  inquiries: number;
  tours: number;
}

export interface ConversionFunnelProps {
  data?: Partial<FunnelCounts>;
  periodLabel?: string;
  insightText?: string;
  style?: StyleProp<ViewStyle>;
  onStagePress?: (stageId: string) => void;
}

interface FunnelStageConfig {
  id: keyof FunnelCounts;
  name: string;
  emoji: string;
  ionicon: keyof typeof Ionicons.glyphMap;
  gradientStart: string;
  gradientEnd: string;
  bgColor: string;
  textColor: string;
}

const STAGES: FunnelStageConfig[] = [
  {
    id: 'views',
    name: 'Listing Views',
    emoji: '👁️',
    ionicon: 'eye-outline',
    gradientStart: '#059669',
    gradientEnd: '#10b981',
    bgColor: '#ecfdf5',
    textColor: '#059669',
  },
  {
    id: 'saves',
    name: 'Saved Homes',
    emoji: '🤍',
    ionicon: 'heart-outline',
    gradientStart: '#2563eb',
    gradientEnd: '#3b82f6',
    bgColor: '#eff6ff',
    textColor: '#2563eb',
  },
  {
    id: 'inquiries',
    name: 'Inquiries & Chats',
    emoji: '💬',
    ionicon: 'chatbubble-ellipses-outline',
    gradientStart: '#7c3aed',
    gradientEnd: '#8b5cf6',
    bgColor: '#f5f3ff',
    textColor: '#7c3aed',
  },
  {
    id: 'tours',
    name: 'Tours Scheduled',
    emoji: '📅',
    ionicon: 'calendar-outline',
    gradientStart: '#e11d48',
    gradientEnd: '#f43f5e',
    bgColor: '#fff1f2',
    textColor: '#e11d48',
  },
];

const DEFAULT_COUNTS: FunnelCounts = {
  views: 14820,
  saves: 1640,
  inquiries: 312,
  tours: 58,
};

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({
  data,
  periodLabel = 'Last 30 Days',
  insightText = 'Properties with 3D virtual tours convert saves to tour requests 2.4x faster.',
  style,
  onStagePress,
}) => {
  const [trackWidth, setTrackWidth] = useState<number>(300);

  const counts: FunnelCounts = {
    views: Math.max(data?.views ?? DEFAULT_COUNTS.views, 1),
    saves: data?.saves ?? DEFAULT_COUNTS.saves,
    inquiries: data?.inquiries ?? DEFAULT_COUNTS.inquiries,
    tours: data?.tours ?? DEFAULT_COUNTS.tours,
  };

  const baselineViews = counts.views;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - trackWidth) > 2) {
      setTrackWidth(width);
    }
  };

  return (
    <View style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Conversion Funnel</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>Live Pipeline</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Visitor journey from discovery to private viewing
          </Text>
        </View>

        <View style={styles.periodPill}>
          <Ionicons name="time-outline" size={11} color="#64748b" />
          <Text style={styles.periodText}>{periodLabel}</Text>
        </View>
      </View>

      {/* Funnel Stages List */}
      <View style={styles.stagesContainer} onLayout={onTrackLayout}>
        {STAGES.map((stage, index) => {
          const currentCount = counts[stage.id];
          const prevCount = index > 0 ? counts[STAGES[index - 1].id] : baselineViews;

          // % from top of funnel
          const overallPct = (currentCount / baselineViews) * 100;

          // % from previous step
          const stepConversionPct =
            index === 0 ? 100 : (currentCount / Math.max(prevCount, 1)) * 100;

          // Drop-off rate
          const dropOffPct =
            index === 0 ? 0 : Math.max(0, 100 - stepConversionPct);

          // Bar width clamped to min 4% for visual beauty
          const barRatio = Math.max(Math.min(overallPct / 100, 1), 0.04);
          const barPixelWidth = Math.round(trackWidth * barRatio);

          return (
            <TouchableOpacity
              key={stage.id}
              activeOpacity={0.88}
              onPress={() => onStagePress?.(stage.id)}
              style={styles.stageItem}
            >
              {/* Connector line between stages */}
              {index > 0 && (
                <View style={styles.connectorLineContainer}>
                  <View style={styles.connectorLine} />
                  <Ionicons
                    name="chevron-down"
                    size={11}
                    color="#cbd5e1"
                    style={styles.connectorArrow}
                  />
                </View>
              )}

              {/* Stage Top Meta Row */}
              <View style={styles.stageMetaRow}>
                <View style={styles.stageTitleGroup}>
                  <View
                    style={[
                      styles.iconSquircle,
                      { backgroundColor: stage.bgColor },
                    ]}
                  >
                    <Text style={styles.stageEmoji}>{stage.emoji}</Text>
                  </View>
                  <View>
                    <Text style={styles.stageName}>{stage.name}</Text>
                    <Text style={styles.stageSubtext}>
                      {index === 0
                        ? '100% baseline discovery'
                        : `${overallPct.toFixed(1)}% overall conversion`}
                    </Text>
                  </View>
                </View>

                <View style={styles.stageCountGroup}>
                  <Text style={styles.stageCount}>
                    {currentCount.toLocaleString()}
                  </Text>
                  {index > 0 ? (
                    <View style={styles.dropOffPill}>
                      <Text style={styles.dropOffText}>
                        −{dropOffPct.toFixed(0)}% drop-off
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.baselinePill}>
                      <Text style={styles.baselinePillText}>Top of Funnel</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Apple Fitness Style Gradient Progress Bar */}
              <View style={styles.barContainer}>
                <Svg width={trackWidth} height={14}>
                  <Defs>
                    <LinearGradient
                      id={`grad-${stage.id}`}
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <Stop
                        offset="0%"
                        stopColor={stage.gradientStart}
                        stopOpacity="1"
                      />
                      <Stop
                        offset="100%"
                        stopColor={stage.gradientEnd}
                        stopOpacity="1"
                      />
                    </LinearGradient>
                  </Defs>

                  {/* Track background */}
                  <Rect
                    x={0}
                    y={0}
                    width={trackWidth}
                    height={14}
                    rx={7}
                    fill="#f1f5f9"
                  />

                  {/* Colored progress fill */}
                  <Rect
                    x={0}
                    y={0}
                    width={barPixelWidth}
                    height={14}
                    rx={7}
                    fill={`url(#grad-${stage.id})`}
                  />

                  {/* Highlighting pulse dot at end of bar */}
                  <Circle
                    cx={Math.max(barPixelWidth - 7, 7)}
                    cy={7}
                    r={3}
                    fill="#ffffff"
                    fillOpacity={0.85}
                  />
                </Svg>
              </View>

              {/* Conversion Stats Sub-row */}
              <View style={styles.statsSubRow}>
                <Text style={styles.statMetricText}>
                  {index === 0
                    ? '100% Top Baseline'
                    : `${stepConversionPct.toFixed(1)}% step conversion`}
                </Text>

                <Text style={[styles.statAccentText, { color: stage.textColor }]}>
                  {currentCount.toLocaleString()}{' '}
                  {stage.name.toLowerCase()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Luxury Insight Card at Bottom */}
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={styles.insightIconBadge}>
            <Text style={styles.insightIcon}>💡</Text>
          </View>
          <Text style={styles.insightTitle}>LUXURY INSIGHT</Text>
        </View>
        <Text style={styles.insightBody}>{insightText}</Text>
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
    marginBottom: 18,
  },
  headerTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 2,
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  stagesContainer: {
    flexDirection: 'column',
  },
  stageItem: {
    marginBottom: 14,
  },
  connectorLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 18,
    height: 14,
    marginBottom: 4,
  },
  connectorLine: {
    width: 1.5,
    height: '100%',
    backgroundColor: '#e2e8f0',
  },
  connectorArrow: {
    marginLeft: 4,
  },
  stageMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconSquircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageEmoji: {
    fontSize: 18,
  },
  stageName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  stageSubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
  stageCountGroup: {
    alignItems: 'flex-end',
  },
  stageCount: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  dropOffPill: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  dropOffText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
  baselinePill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  baselinePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  barContainer: {
    width: '100%',
    marginVertical: 4,
  },
  statsSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
    paddingHorizontal: 2,
  },
  statMetricText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  statAccentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  insightCard: {
    marginTop: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  insightIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightIcon: {
    fontSize: 12,
  },
  insightTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.8,
  },
  insightBody: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#166534',
    lineHeight: 18,
  },
});

export default ConversionFunnel;
