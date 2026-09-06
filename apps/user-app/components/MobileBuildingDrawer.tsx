import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MultiUnitBuildingMarker } from '../utils/markerClustering';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface MobileBuildingDrawerProps {
  visible: boolean;
  building: MultiUnitBuildingMarker | null;
  onClose: () => void;
  onSelectUnit: (unit: any) => void;
  onToggleSaved: (propertyId: string) => void;
  isSaved: (propertyId: string) => boolean;
}

const DEFAULT_BUILDING_PHOTO =
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80';

const DEFAULT_UNIT_PHOTO =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80';

/**
 * Formats a numeric price into Indian currency format (e.g. ₹45k, ₹1.5 L, ₹2.4 Cr)
 */
function formatPricePill(price: number): string {
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

/**
 * Formats property specifications (bedrooms, bathrooms, area_sqft)
 */
function formatSpecs(unit: any): string {
  const specs: string[] = [];
  if (unit.bedrooms !== undefined && unit.bedrooms !== null) {
    specs.push(`${unit.bedrooms} bed${unit.bedrooms === 1 ? '' : 's'}`);
  }
  if (unit.bathrooms !== undefined && unit.bathrooms !== null) {
    specs.push(`${unit.bathrooms} bath${unit.bathrooms === 1 ? '' : 's'}`);
  }
  if (unit.area_sqft) {
    specs.push(`${Number(unit.area_sqft).toLocaleString()} sqft`);
  }
  return specs.length > 0 ? specs.join(' · ') : (unit.prop_type || 'Residential');
}

export const MobileBuildingDrawer: React.FC<MobileBuildingDrawerProps> = ({
  visible,
  building,
  onClose,
  onSelectUnit,
  onToggleSaved,
  isSaved,
}) => {
  if (!building) {
    return null;
  }

  const priceSuffix = building.list_type === 'RENT' ? '/mo' : '/sale';
  const rawPriceStr = formatPricePill(building.startingPrice);
  const cleanPrice = rawPriceStr.startsWith('₹') ? rawPriceStr.slice(1) : rawPriceStr;
  const startingPriceFormatted = `Starting from ₹${cleanPrice}${priceSuffix}`;

  const renderUnitItem = ({ item }: { item: any }) => {
    const photo =
      item.property_media?.[0]?.url ||
      building.featuredPhoto ||
      DEFAULT_UNIT_PHOTO;
    const saved = isSaved(item.id);
    const bhkLabel = item.bedrooms ? `${item.bedrooms} BHK` : '';
    const unitTitle = item.title || (bhkLabel ? `${bhkLabel} Suite` : 'Residential Unit');
    const unitSpecs = formatSpecs(item);
    const unitPriceFormatted = formatPricePill(item.price);
    const unitPriceSuffix = item.list_type === 'RENT' ? '/mo' : '';

    return (
      <TouchableOpacity
        style={styles.unitCard}
        activeOpacity={0.88}
        onPress={() => onSelectUnit(item)}
      >
        {/* 1:1 Square Photo Thumbnail (70x70px) */}
        <Image
          source={{ uri: photo }}
          style={styles.unitThumbnail}
          resizeMode="cover"
        />

        {/* Unit Details */}
        <View style={styles.unitDetails}>
          {/* Title / BHK with Verified Check */}
          <View style={styles.unitTitleRow}>
            <Text style={styles.unitTitle} numberOfLines={1}>
              {unitTitle}
            </Text>
            {item.isVerified && (
              <View style={styles.verifiedCheckBadge}>
                <Ionicons name="checkmark-circle" size={15} color="#10b981" />
              </View>
            )}
          </View>

          {/* Price formatted pill */}
          <View style={styles.unitPriceBadge}>
            <Text style={styles.unitPriceText}>
              {unitPriceFormatted}
              {unitPriceSuffix}
            </Text>
          </View>

          {/* Specs row (beds · baths · sqft) */}
          <Text style={styles.unitSpecsText} numberOfLines={1}>
            {unitSpecs}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.unitActions}>
          {/* Heart favorite button */}
          <TouchableOpacity
            style={styles.heartButton}
            onPress={(e) => {
              e.stopPropagation();
              onToggleSaved(item.id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={22}
              color={saved ? '#e11d48' : '#94a3b8'}
            />
          </TouchableOpacity>

          {/* View Unit chevron button */}
          <View style={styles.chevronButton}>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Dismissable backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropTouchArea} />
        </TouchableWithoutFeedback>

        {/* Bottom Sheet Modal */}
        <View style={styles.sheetContainer}>
          <SafeAreaView edges={['bottom']} style={styles.safeContainer}>
            {/* Top Drag indicator bar */}
            <View style={styles.dragIndicatorContainer}>
              <View style={styles.dragIndicator} />
            </View>

            {/* Header: Building Exterior Image & Details */}
            <View style={styles.headerImageContainer}>
              <Image
                source={{ uri: building.featuredPhoto || DEFAULT_BUILDING_PHOTO }}
                style={styles.headerImage}
                resizeMode="cover"
              />

              {/* Dark gradient overlay */}
              <View style={styles.imageDarkOverlay}>
                {/* Top Overlay Row: Units Badge & Close Button */}
                <View style={styles.overlayTopRow}>
                  <View style={styles.unitsBadge}>
                    <Text style={styles.unitsBadgeText}>
                      🏢 {building.unitsCount} units available
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={onClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {/* Bottom Overlay Area: Building Name & Address */}
                <View style={styles.overlayBottomArea}>
                  <Text style={styles.buildingName} numberOfLines={1}>
                    {building.buildingName}
                  </Text>
                  {building.address ? (
                    <View style={styles.addressRow}>
                      <Ionicons
                        name="location-sharp"
                        size={13}
                        color="#cbd5e1"
                        style={{ marginRight: 3 }}
                      />
                      <Text style={styles.buildingAddress} numberOfLines={1}>
                        {building.address}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Starting Price Pill in Brand Rose */}
            <View style={styles.pricePillRow}>
              <View style={styles.startingPricePill}>
                <Ionicons
                  name="pricetag"
                  size={14}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.startingPriceText}>
                  {startingPriceFormatted}
                </Text>
              </View>

              {building.isVerified && (
                <View style={styles.verifiedBuildingBadge}>
                  <Ionicons
                    name="shield-checkmark"
                    size={14}
                    color="#e11d48"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.verifiedBuildingText}>Verified</Text>
                </View>
              )}
            </View>

            {/* Section Header */}
            <View style={styles.unitsSectionHeader}>
              <Text style={styles.unitsSectionTitle}>Units in this building</Text>
              <Text style={styles.unitsCountSubtext}>
                {building.units.length} unit{building.units.length === 1 ? '' : 's'}
              </Text>
            </View>

            {/* Scrollable list of units */}
            <FlatList
              data={building.units}
              keyExtractor={(item, index) => item.id || `unit-${index}`}
              renderItem={renderUnitItem}
              ItemSeparatorComponent={() => <View style={styles.unitSeparator} />}
              contentContainerStyle={styles.unitsListContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No units currently listed in this building
                  </Text>
                </View>
              }
            />
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTouchArea: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.82,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  safeContainer: {
    maxHeight: '100%',
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragIndicator: {
    width: 42,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  headerImageContainer: {
    height: 140,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageDarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    padding: 12,
    justifyContent: 'space-between',
  },
  overlayTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitsBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  unitsBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  overlayBottomArea: {
    gap: 3,
  },
  buildingName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.3,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buildingAddress: {
    fontSize: 12,
    color: '#e2e8f0',
    flex: 1,
  },
  pricePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  startingPricePill: {
    backgroundColor: '#e11d48',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 5,
    elevation: 3,
  },
  startingPriceText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  verifiedBuildingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  verifiedBuildingText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
  },
  unitsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  unitsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unitsCountSubtext: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  unitsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  unitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 10,
  },
  unitThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  unitDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  unitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  verifiedCheckBadge: {
    marginLeft: 5,
  },
  unitPriceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    marginBottom: 4,
  },
  unitPriceText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#e11d48',
  },
  unitSpecsText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  unitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heartButton: {
    padding: 6,
  },
  chevronButton: {
    padding: 4,
  },
  unitSeparator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 4,
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
});

export default MobileBuildingDrawer;
