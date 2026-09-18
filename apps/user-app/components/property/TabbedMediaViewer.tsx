import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  CategorizedMediaItem,
  FloorPlanData,
  VirtualTourData,
  MediaCategory,
} from '../../types/propertyDetails';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type MediaTabType = 'photos' | 'floorPlan' | 'virtualTour';

export interface TabbedMediaViewerProps {
  categorizedMedia: CategorizedMediaItem[];
  floorPlan?: FloorPlanData;
  virtualTour?: VirtualTourData;
  onOpenGallery?: (category: MediaCategory) => void;
  onLaunchVirtualTour?: (url: string) => void;
  initialTab?: MediaTabType;
}

const DEFAULT_FLOOR_PLAN: FloorPlanData = {
  url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1400&q=85',
  dimensions: '3 Beds • 2 Baths • 2,150 Sq Ft',
  totalSqft: 2150,
  rooms: [
    { name: 'Grand Living Room', size: "24' × 18'", sqft: 432 },
    { name: 'Primary Suite', size: "20' × 16'", sqft: 320 },
    { name: 'Chef Kitchen & Dining', size: "19' × 14'", sqft: 266 },
    { name: 'Guest Bedroom 2', size: "15' × 13'", sqft: 195 },
    { name: 'Ensuite Primary Bath', size: "14' × 10'", sqft: 140 },
    { name: 'Wrap-around Terrace', size: "32' × 8'", sqft: 256 },
  ],
};

const DEFAULT_VIRTUAL_TOUR: VirtualTourData = {
  tourUrl: 'https://my.matterport.com/show/?m=sample',
  previewImageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=85',
  title: 'Interactive 3D Virtual Walkthrough',
  provider: 'Matterport',
};

const CATEGORY_ORDER: MediaCategory[] = [
  'All',
  'Living Room',
  'Master Suite',
  'Kitchen',
  'Exterior',
  'Bathroom',
  'Views',
];

export const TabbedMediaViewer: React.FC<TabbedMediaViewerProps> = ({
  categorizedMedia = [],
  floorPlan = DEFAULT_FLOOR_PLAN,
  virtualTour = DEFAULT_VIRTUAL_TOUR,
  onOpenGallery,
  onLaunchVirtualTour,
  initialTab = 'photos',
}) => {
  const [activeTab, setActiveTab] = useState<MediaTabType>(initialTab);
  const [isBlueprintZoomed, setIsBlueprintZoomed] = useState(false);
  const [selectedPhotoCategory, setSelectedPhotoCategory] = useState<MediaCategory>('All');
  const [fullscreenModalVisible, setFullscreenModalVisible] = useState(false);
  const [activeModalImage, setActiveModalImage] = useState<string | null>(null);

  const handleLaunch3D = () => {
    const url = virtualTour?.tourUrl || DEFAULT_VIRTUAL_TOUR.tourUrl;
    if (onLaunchVirtualTour) {
      onLaunchVirtualTour(url);
    } else {
      Linking.openURL(url).catch((err) =>
        console.warn('Unable to open 3D virtual tour URL:', err)
      );
    }
  };

  const handleCategoryPress = (category: MediaCategory) => {
    if (onOpenGallery) {
      onOpenGallery(category);
    } else {
      setSelectedPhotoCategory(category);
    }
  };

  const handleThumbnailPress = (item: CategorizedMediaItem) => {
    if (onOpenGallery) {
      onOpenGallery(item.category);
    } else {
      setActiveModalImage(item.url);
      setFullscreenModalVisible(true);
    }
  };

  // Group media by category for the photo grid
  const availableCategories = Array.from(
    new Set(categorizedMedia.map((m) => m.category))
  ).sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));

  const filteredMedia =
    selectedPhotoCategory === 'All'
      ? categorizedMedia
      : categorizedMedia.filter((m) => m.category === selectedPhotoCategory);

  return (
    <View style={styles.container}>
      {/* Segmented iOS Pill Control */}
      <View style={styles.segmentedControlContainer}>
        <View style={styles.segmentedPillBackground}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.segmentButton,
              activeTab === 'photos' && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab('photos')}
          >
            <Ionicons
              name={activeTab === 'photos' ? 'camera' : 'camera-outline'}
              size={16}
              color={activeTab === 'photos' ? '#0f172a' : '#64748b'}
              style={styles.segmentIcon}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'photos' && styles.segmentTextActive,
              ]}
            >
              Photos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.segmentButton,
              activeTab === 'floorPlan' && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab('floorPlan')}
          >
            <MaterialCommunityIcons
              name="floor-plan"
              size={16}
              color={activeTab === 'floorPlan' ? '#0f172a' : '#64748b'}
              style={styles.segmentIcon}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'floorPlan' && styles.segmentTextActive,
              ]}
            >
              Floor Plan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.segmentButton,
              activeTab === 'virtualTour' && styles.segmentButtonActive,
            ]}
            onPress={() => setActiveTab('virtualTour')}
          >
            <Ionicons
              name={activeTab === 'virtualTour' ? 'cube' : 'cube-outline'}
              size={16}
              color={activeTab === 'virtualTour' ? '#0f172a' : '#64748b'}
              style={styles.segmentIcon}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'virtualTour' && styles.segmentTextActive,
              ]}
            >
              3D Tour
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content for Photos Tab */}
      {activeTab === 'photos' && (
        <View style={styles.tabContent}>
          {/* Category Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsContainer}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedPhotoCategory === 'All' && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedPhotoCategory('All')}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedPhotoCategory === 'All' && styles.categoryChipTextActive,
                ]}
              >
                All ({categorizedMedia.length})
              </Text>
            </TouchableOpacity>

            {availableCategories.map((cat) => {
              const count = categorizedMedia.filter((m) => m.category === cat).length;
              const isSelected = selectedPhotoCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => handleCategoryPress(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Visual Grid of Room Preview Thumbnails */}
          <View style={styles.photoGrid}>
            {filteredMedia.map((item, index) => {
              const isFirstLarge = index === 0 && selectedPhotoCategory === 'All';
              return (
                <TouchableOpacity
                  key={item.id || `media-${index}`}
                  activeOpacity={0.85}
                  style={[
                    styles.photoGridItem,
                    isFirstLarge ? styles.photoGridItemLarge : styles.photoGridItemHalf,
                  ]}
                  onPress={() => handleThumbnailPress(item)}
                >
                  <Image
                    source={{ uri: item.url }}
                    style={styles.photoGridImage}
                    resizeMode="cover"
                  />
                  <View style={styles.photoOverlayGradient}>
                    <View style={styles.photoCategoryBadge}>
                      <Text style={styles.photoCategoryBadgeText}>{item.category}</Text>
                    </View>
                    {item.caption ? (
                      <Text style={styles.photoCaption} numberOfLines={1}>
                        {item.caption}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* View Full Gallery CTA */}
          <TouchableOpacity
            style={styles.viewAllGalleryButton}
            onPress={() => onOpenGallery?.('All')}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={18} color="#0f172a" style={{ marginRight: 8 }} />
            <Text style={styles.viewAllGalleryText}>
              Open Full High-Res Gallery ({categorizedMedia.length} Photos)
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#64748b" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content for Floor Plan Tab */}
      {activeTab === 'floorPlan' && (
        <View style={styles.tabContent}>
          {/* Dimension Summary Pill */}
          <View style={styles.dimensionPillCard}>
            <View style={styles.dimensionPillBadge}>
              <MaterialCommunityIcons name="ruler-square" size={18} color="#0284c7" />
              <Text style={styles.dimensionPillText}>
                {floorPlan.dimensions || `${floorPlan.totalSqft} Sq Ft`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.zoomToggleButton}
              onPress={() => setIsBlueprintZoomed((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isBlueprintZoomed ? 'contract-outline' : 'expand-outline'}
                size={16}
                color="#0f172a"
              />
              <Text style={styles.zoomToggleText}>
                {isBlueprintZoomed ? 'Fit Blueprint' : 'Zoom 2D Blueprint'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Architectural 2D Blueprint Preview Card */}
          <View
            style={[
              styles.blueprintWrapper,
              isBlueprintZoomed && styles.blueprintWrapperZoomed,
            ]}
          >
            <Image
              source={{ uri: floorPlan.url }}
              style={[
                styles.blueprintImage,
                isBlueprintZoomed ? styles.blueprintImageZoomed : styles.blueprintImageNormal,
              ]}
              resizeMode="contain"
            />
            <View style={styles.blueprintWatermark}>
              <Ionicons name="checkmark-circle" size={13} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.blueprintWatermarkText}>Architectural CAD • Scale Verified</Text>
            </View>
          </View>

          {/* Room Dimensions Breakdown Grid */}
          <View style={styles.roomBreakdownSection}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Room Dimensions</Text>
                <Text style={styles.sectionSubtitle}>
                  Accredited laser-measured interior room proportions
                </Text>
              </View>
              <View style={styles.totalAreaBadge}>
                <Text style={styles.totalAreaBadgeLabel}>Total Interior</Text>
                <Text style={styles.totalAreaBadgeValue}>{floorPlan.totalSqft} sq ft</Text>
              </View>
            </View>

            <View style={styles.roomDimensionsGrid}>
              {floorPlan.rooms.map((room, idx) => (
                <View key={`room-${idx}`} style={styles.roomDimensionCard}>
                  <View style={styles.roomCardHeader}>
                    <MaterialCommunityIcons
                      name={
                        room.name.toLowerCase().includes('bed') || room.name.toLowerCase().includes('suite')
                          ? 'bed-double-outline'
                          : room.name.toLowerCase().includes('bath')
                          ? 'shower'
                          : room.name.toLowerCase().includes('kitchen')
                          ? 'silverware-fork-knife'
                          : room.name.toLowerCase().includes('terrace') || room.name.toLowerCase().includes('balcony')
                          ? 'balcony'
                          : 'sofa-outline'
                      }
                      size={18}
                      color="#0284c7"
                    />
                    <Text style={styles.roomName} numberOfLines={1}>
                      {room.name}
                    </Text>
                  </View>
                  <View style={styles.roomMetricsRow}>
                    <View style={styles.dimensionTag}>
                      <Text style={styles.dimensionTagText}>{room.size}</Text>
                    </View>
                    <Text style={styles.roomSqftText}>{room.sqft} sq ft</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Content for 3D Tour Tab */}
      {activeTab === 'virtualTour' && (
        <View style={styles.tabContent}>
          {/* Interactive 3D Matterport Preview Card */}
          <TouchableOpacity
            style={styles.virtualTourCard}
            activeOpacity={0.92}
            onPress={handleLaunch3D}
          >
            <Image
              source={{ uri: virtualTour.previewImageUrl }}
              style={styles.virtualTourImage}
              resizeMode="cover"
            />
            {/* Dark gradient / tint */}
            <View style={styles.virtualTourOverlay} />

            {/* 360 Badge */}
            <View style={styles.tour360Badge}>
              <MaterialCommunityIcons name="rotate-3d-variant" size={16} color="#ffffff" />
              <Text style={styles.tour360BadgeText}>360° IMMERSIVE TOUR</Text>
            </View>

            {/* Provider Pill */}
            <View style={styles.tourProviderPill}>
              <Text style={styles.tourProviderText}>{virtualTour.provider}</Text>
            </View>

            {/* Play Button Overlay */}
            <View style={styles.playButtonContainer}>
              <View style={styles.playButtonOuterRing}>
                <View style={styles.playButtonInnerCircle}>
                  <Ionicons name="play" size={28} color="#ffffff" style={{ marginLeft: 3 }} />
                </View>
              </View>
              <Text style={styles.playButtonTitle}>{virtualTour.title}</Text>
              <Text style={styles.playButtonSubtitle}>Tap to explore dollhouse view & walk through</Text>
            </View>
          </TouchableOpacity>

          {/* Interactive Capabilities Grid */}
          <View style={styles.tourFeaturesRow}>
            <View style={styles.tourFeatureItem}>
              <View style={[styles.tourFeatureIconBox, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="cube-outline" size={18} color="#2563eb" />
              </View>
              <Text style={styles.tourFeatureTitle}>Dollhouse 3D</Text>
              <Text style={styles.tourFeatureDesc}>Full architectural layout</Text>
            </View>

            <View style={styles.tourFeatureItem}>
              <View style={[styles.tourFeatureIconBox, { backgroundColor: '#f0fdf4' }]}>
                <MaterialCommunityIcons name="tape-measure" size={18} color="#16a34a" />
              </View>
              <Text style={styles.tourFeatureTitle}>Measure Tool</Text>
              <Text style={styles.tourFeatureDesc}>Check fit for your furniture</Text>
            </View>

            <View style={styles.tourFeatureItem}>
              <View style={[styles.tourFeatureIconBox, { backgroundColor: '#faf5ff' }]}>
                <Ionicons name="glasses-outline" size={18} color="#9333ea" />
              </View>
              <Text style={styles.tourFeatureTitle}>VR Ready</Text>
              <Text style={styles.tourFeatureDesc}>Compatible with headsets</Text>
            </View>
          </View>

          {/* Tour Launcher Button */}
          <TouchableOpacity
            style={styles.tourLaunchButton}
            onPress={handleLaunch3D}
            activeOpacity={0.85}
          >
            <Ionicons name="scan-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.tourLaunchButtonText}>Launch 3D Matterport Experience</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      <Modal
        visible={fullscreenModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setFullscreenModalVisible(false)}
          >
            <Ionicons name="close" size={26} color="#ffffff" />
          </TouchableOpacity>
          {activeModalImage && (
            <Image
              source={{ uri: activeModalImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginVertical: 12,
  },
  segmentedControlContainer: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  segmentedPillBackground: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 20,
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentIcon: {
    marginRight: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  categoryChipsContainer: {
    paddingBottom: 10,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  photoGridItem: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
    position: 'relative',
  },
  photoGridItemLarge: {
    width: '100%',
    height: 200,
    marginBottom: 4,
  },
  photoGridItemHalf: {
    width: (SCREEN_WIDTH - 32 - 10) / 2,
    height: 130,
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlayGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  photoCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 2,
  },
  photoCategoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  photoCaption: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
  viewAllGalleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  viewAllGalleryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  dimensionPillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f9ff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 12,
  },
  dimensionPillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dimensionPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
  },
  zoomToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    gap: 4,
  },
  zoomToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  blueprintWrapper: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  blueprintWrapperZoomed: {
    height: 380,
  },
  blueprintImage: {
    width: '100%',
  },
  blueprintImageNormal: {
    height: 220,
  },
  blueprintImageZoomed: {
    height: 380,
  },
  blueprintWatermark: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blueprintWatermarkText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  roomBreakdownSection: {
    marginTop: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  totalAreaBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'flex-end',
  },
  totalAreaBadgeLabel: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  totalAreaBadgeValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  roomDimensionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roomDimensionCard: {
    width: (SCREEN_WIDTH - 32 - 8) / 2,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  roomName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  roomMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dimensionTag: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  dimensionTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  roomSqftText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  virtualTourCard: {
    width: '100%',
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  virtualTourImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  virtualTourOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  tour360Badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  tour360BadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tourProviderPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tourProviderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  playButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  playButtonOuterRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  playButtonInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  playButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  playButtonSubtitle: {
    fontSize: 12,
    color: '#e2e8f0',
    textAlign: 'center',
  },
  tourFeaturesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
  },
  tourFeatureItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tourFeatureIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tourFeatureTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  tourFeatureDesc: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  tourLaunchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  tourLaunchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 6,
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
});
export default TabbedMediaViewer;
