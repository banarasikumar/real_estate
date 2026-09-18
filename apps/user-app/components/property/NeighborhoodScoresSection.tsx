import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { NeighborhoodData, SchoolData } from '../../types/propertyDetails';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface NeighborhoodScoresSectionProps {
  neighborhood?: NeighborhoodData;
  schools?: SchoolData[];
  address?: string;
  city?: string;
  onExploreMap?: () => void;
}

const DEFAULT_NEIGHBORHOOD: NeighborhoodData = {
  walkScore: 94,
  walkDescription: "Walker's Paradise — Daily errands do not require a car",
  transitScore: 88,
  transitDescription: "Rider's Paradise — World-class public transportation",
  bikeScore: 82,
  bikeDescription: 'Very Bikeable — Flat terrain with excellent dedicated bike lanes',
  highlights: [
    'Whole Foods & Organic Markets (0.3 mi)',
    'Fine Dining & Artisanal Bakeries',
    'Centennial Park & Botanical Trail',
    'Metro Station & Rapid Transit Line (0.2 mi)',
    'Private Tennis & Wellness Club',
  ],
};

const DEFAULT_SCHOOLS: SchoolData[] = [
  {
    id: 'sch-1',
    name: 'Beverly Vista Middle & Elementary',
    rating: 9,
    type: 'Public',
    distance: '0.4 mi',
    grades: 'K - 8',
  },
  {
    id: 'sch-2',
    name: 'Beverly Hills High School',
    rating: 9,
    type: 'Public',
    distance: '1.1 mi',
    grades: '9 - 12',
  },
  {
    id: 'sch-3',
    name: 'The Buckley School',
    rating: 10,
    type: 'Private',
    distance: '2.4 mi',
    grades: 'PK - 12',
  },
];

export const NeighborhoodScoresSection: React.FC<NeighborhoodScoresSectionProps> = ({
  neighborhood = DEFAULT_NEIGHBORHOOD,
  schools = DEFAULT_SCHOOLS,
  address,
  city = 'Beverly Hills',
  onExploreMap,
}) => {
  const getHighlightIcon = (tag: string) => {
    const lower = tag.toLowerCase();
    if (lower.includes('whole foods') || lower.includes('market') || lower.includes('grocery')) {
      return <Ionicons name="cart-outline" size={15} color="#059669" />;
    }
    if (lower.includes('dining') || lower.includes('restaurant') || lower.includes('bakery') || lower.includes('cafe')) {
      return <Ionicons name="restaurant-outline" size={15} color="#e11d48" />;
    }
    if (lower.includes('park') || lower.includes('trail') || lower.includes('botanical')) {
      return <Ionicons name="leaf-outline" size={15} color="#16a34a" />;
    }
    if (lower.includes('metro') || lower.includes('transit') || lower.includes('station') || lower.includes('subway')) {
      return <Ionicons name="subway-outline" size={15} color="#2563eb" />;
    }
    if (lower.includes('tennis') || lower.includes('fitness') || lower.includes('wellness') || lower.includes('gym')) {
      return <Ionicons name="fitness-outline" size={15} color="#d97706" />;
    }
    return <Ionicons name="sparkles-outline" size={15} color="#6366f1" />;
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    if (score >= 75) return { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' };
    return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
  };

  const getSchoolRatingColor = (rating: number) => {
    if (rating >= 9) return { bg: '#ecfdf5', text: '#059669', ring: '#10b981' };
    if (rating >= 7) return { bg: '#eff6ff', text: '#2563eb', ring: '#3b82f6' };
    return { bg: '#fffbeb', text: '#d97706', ring: '#f59e0b' };
  };

  return (
    <View style={styles.container}>
      {/* Section Title Header */}
      <View style={styles.headerRow}>
        <View>
          <View style={styles.badgeLabelRow}>
            <Ionicons name="navigate-circle-outline" size={16} color="#0284c7" />
            <Text style={styles.badgeLabelText}>LOCAL ACCREDITATION & COMMUTE</Text>
          </View>
          <Text style={styles.mainTitle}>Neighborhood & Scores</Text>
          {address ? (
            <Text style={styles.subAddressText} numberOfLines={1}>
              {address}
            </Text>
          ) : (
            <Text style={styles.subAddressText}>
              Prime {city} Enclave • High Livability Index
            </Text>
          )}
        </View>
      </View>

      {/* 1. Apple Health / iOS Widget-Style Score Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.widgetsScrollContainer}
      >
        {/* Walk Score Widget Card */}
        <View style={[styles.widgetCard, { borderColor: '#a7f3d0', backgroundColor: '#fafdfb' }]}>
          <View style={styles.widgetTopRow}>
            <View style={[styles.widgetIconCircle, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="walk" size={20} color="#059669" />
            </View>
            <View style={[styles.widgetRatingBadge, { backgroundColor: '#ecfdf5' }]}>
              <Text style={[styles.widgetRatingBadgeText, { color: '#059669' }]}>
                Walker's Paradise
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <Text style={[styles.widgetScoreNumber, { color: '#059669' }]}>
              {neighborhood.walkScore}
            </Text>
            <Text style={styles.widgetScoreMax}>/100</Text>
          </View>

          <Text style={styles.widgetTitle}>Walk Score®</Text>

          {/* Meter progress bar */}
          <View style={styles.meterTrack}>
            <View
              style={[
                styles.meterFill,
                { width: `${neighborhood.walkScore}%`, backgroundColor: '#10b981' },
              ]}
            />
          </View>

          <Text style={styles.widgetDescription} numberOfLines={2}>
            {neighborhood.walkDescription}
          </Text>
        </View>

        {/* Transit Score Widget Card */}
        <View style={[styles.widgetCard, { borderColor: '#bfdbfe', backgroundColor: '#fafcff' }]}>
          <View style={styles.widgetTopRow}>
            <View style={[styles.widgetIconCircle, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="bus" size={18} color="#2563eb" />
            </View>
            <View style={[styles.widgetRatingBadge, { backgroundColor: '#eff6ff' }]}>
              <Text style={[styles.widgetRatingBadgeText, { color: '#2563eb' }]}>
                Rider's Paradise
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <Text style={[styles.widgetScoreNumber, { color: '#2563eb' }]}>
              {neighborhood.transitScore}
            </Text>
            <Text style={styles.widgetScoreMax}>/100</Text>
          </View>

          <Text style={styles.widgetTitle}>Transit Score®</Text>

          {/* Meter progress bar */}
          <View style={styles.meterTrack}>
            <View
              style={[
                styles.meterFill,
                { width: `${neighborhood.transitScore}%`, backgroundColor: '#3b82f6' },
              ]}
            />
          </View>

          <Text style={styles.widgetDescription} numberOfLines={2}>
            {neighborhood.transitDescription}
          </Text>
        </View>

        {/* Bike Score Widget Card */}
        <View style={[styles.widgetCard, { borderColor: '#fde68a', backgroundColor: '#fffdfa' }]}>
          <View style={styles.widgetTopRow}>
            <View style={[styles.widgetIconCircle, { backgroundColor: '#fffbeb' }]}>
              <Ionicons name="bicycle" size={20} color="#d97706" />
            </View>
            <View style={[styles.widgetRatingBadge, { backgroundColor: '#fffbeb' }]}>
              <Text style={[styles.widgetRatingBadgeText, { color: '#d97706' }]}>
                Very Bikeable
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <Text style={[styles.widgetScoreNumber, { color: '#d97706' }]}>
              {neighborhood.bikeScore}
            </Text>
            <Text style={styles.widgetScoreMax}>/100</Text>
          </View>

          <Text style={styles.widgetTitle}>Bike Score®</Text>

          {/* Meter progress bar */}
          <View style={styles.meterTrack}>
            <View
              style={[
                styles.meterFill,
                { width: `${neighborhood.bikeScore}%`, backgroundColor: '#f59e0b' },
              ]}
            />
          </View>

          <Text style={styles.widgetDescription} numberOfLines={2}>
            {neighborhood.bikeDescription}
          </Text>
        </View>
      </ScrollView>

      {/* 2. GreatSchools Assigned Rated Schools List */}
      <View style={styles.schoolsSection}>
        <View style={styles.subSectionHeader}>
          <View style={styles.schoolHeaderTitleGroup}>
            <MaterialCommunityIcons name="school-outline" size={20} color="#0f172a" />
            <Text style={styles.subSectionTitle}>GreatSchools™ Assigned Schools</Text>
          </View>
          <View style={styles.verifiedSchoolBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#059669" />
            <Text style={styles.verifiedSchoolBadgeText}>District Assigned</Text>
          </View>
        </View>

        <View style={styles.schoolsList}>
          {schools.map((school) => {
            const ratingColor = getSchoolRatingColor(school.rating);
            return (
              <View key={school.id} style={styles.schoolCard}>
                {/* Rating Badge */}
                <View
                  style={[
                    styles.schoolRatingBadge,
                    { backgroundColor: ratingColor.bg, borderColor: ratingColor.ring },
                  ]}
                >
                  <Text style={[styles.schoolRatingNumber, { color: ratingColor.text }]}>
                    {school.rating}
                  </Text>
                  <Text style={[styles.schoolRatingScale, { color: ratingColor.text }]}>
                    /10
                  </Text>
                </View>

                {/* School Details */}
                <View style={styles.schoolInfo}>
                  <Text style={styles.schoolName} numberOfLines={1}>
                    {school.name}
                  </Text>
                  <View style={styles.schoolMetaRow}>
                    <View style={styles.schoolMetaPill}>
                      <Ionicons
                        name={school.type === 'Public' ? 'business-outline' : 'ribbon-outline'}
                        size={12}
                        color="#64748b"
                      />
                      <Text style={styles.schoolMetaText}>{school.type}</Text>
                    </View>

                    <Text style={styles.metaBullet}>•</Text>

                    <View style={styles.schoolMetaPill}>
                      <Ionicons name="location-outline" size={12} color="#64748b" />
                      <Text style={styles.schoolMetaText}>{school.distance}</Text>
                    </View>

                    <Text style={styles.metaBullet}>•</Text>

                    <View style={styles.schoolMetaPill}>
                      <Ionicons name="book-outline" size={12} color="#64748b" />
                      <Text style={styles.schoolMetaText}>{school.grades}</Text>
                    </View>
                  </View>
                </View>

                {/* Assigned indicator */}
                <View style={styles.schoolRightBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* 3. Local Highlights Tags */}
      <View style={styles.highlightsSection}>
        <View style={styles.subSectionHeader}>
          <View style={styles.schoolHeaderTitleGroup}>
            <Ionicons name="star-outline" size={18} color="#0f172a" />
            <Text style={styles.subSectionTitle}>Local Highlights & Lifestyle</Text>
          </View>
          <Text style={styles.highlightsCountText}>
            {neighborhood.highlights.length} Points of Interest
          </Text>
        </View>

        <View style={styles.highlightsTagsContainer}>
          {neighborhood.highlights.map((tag, idx) => (
            <View key={`highlight-${idx}`} style={styles.highlightChip}>
              {getHighlightIcon(tag)}
              <Text style={styles.highlightChipText}>{tag}</Text>
            </View>
          ))}
        </View>

        {/* Explore Map Button */}
        {onExploreMap && (
          <TouchableOpacity
            style={styles.exploreMapButton}
            onPress={onExploreMap}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={17} color="#0f172a" style={{ marginRight: 6 }} />
            <Text style={styles.exploreMapButtonText}>Explore Area on Interactive Map</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  badgeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  badgeLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  subAddressText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  widgetsScrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  widgetCard: {
    width: 250,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  widgetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  widgetIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetRatingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  widgetRatingBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  widgetScoreNumber: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  widgetScoreMax: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 2,
  },
  widgetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  meterTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  widgetDescription: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  schoolsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  schoolHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  verifiedSchoolBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  verifiedSchoolBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  schoolsList: {
    gap: 10,
  },
  schoolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  schoolRatingBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginRight: 12,
  },
  schoolRatingNumber: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  schoolRatingScale: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  schoolMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  schoolMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  schoolMetaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  metaBullet: {
    fontSize: 10,
    color: '#cbd5e1',
  },
  schoolRightBadge: {
    paddingLeft: 8,
  },
  highlightsSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  highlightsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  highlightsTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  highlightChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  exploreMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exploreMapButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
});
export default NeighborhoodScoresSection;
