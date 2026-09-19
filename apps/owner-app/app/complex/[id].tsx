import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Vibration,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getPropertyById,
  getComplexUnits,
  addUnitToComplex,
  updateUnitAvailability,
  ComplexUnit,
  UnitAvailability,
  Property,
} from '@repo/api';

type FilterTab = 'ALL' | 'AVAILABLE' | 'RESERVED' | 'SOLD';

export default function ComplexManagerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [complex, setComplex] = useState<Property | null>(null);
  const [units, setUnits] = useState<ComplexUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  // Add Unit Modal State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newUnitNumber, setNewUnitNumber] = useState('');
  const [newFloor, setNewFloor] = useState('');
  const [newBedrooms, setNewBedrooms] = useState('2');
  const [newBathrooms, setNewBathrooms] = useState('2');
  const [newArea, setNewArea] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newListingType, setNewListingType] = useState<'SALE' | 'RENT'>('SALE');
  const [newAvailability, setNewAvailability] = useState<UnitAvailability>('AVAILABLE');
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false);

  // In-flight status update tracker
  const [togglingUnitId, setTogglingUnitId] = useState<string | null>(null);

  const triggerHaptic = useCallback(() => {
    try {
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      } else {
        Vibration.vibrate(15);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const loadComplexData = useCallback(async () => {
    if (!id) return;
    try {
      const [propData, unitsData] = await Promise.all([
        getPropertyById(id),
        getComplexUnits(id),
      ]);

      if (propData) {
        setComplex(propData);
      } else {
        // Fallback complex metadata if record was created in draft or mock
        setComplex({
          id,
          title: 'Skyline Residences Tower B',
          address: 'Bandra West, Mumbai',
          prop_type: 'COMMERCIAL',
          list_type: 'SALE',
          price: 1250000,
          total_units: 48,
          floor_count: 18,
          complex_name: 'Skyline Residences Tower B',
          is_complex: true,
          status: 'PUBLISHED',
          owner_id: 'mock-owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Property);
      }

      setUnits(unitsData || []);
    } catch (e) {
      console.error('Error loading complex data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadComplexData();
  }, [loadComplexData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadComplexData();
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const total = units.length;
    const available = units.filter((u) => u.availability === 'AVAILABLE').length;
    const reserved = units.filter((u) => u.availability === 'RESERVED').length;
    const sold = units.filter((u) => u.availability === 'SOLD').length;

    const occupancyRate = total > 0 ? Math.round(((reserved + sold) / total) * 100) : 0;

    const prices = units.map((u) => u.price).filter((p) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const formatPriceShort = (val: number) => {
      if (!val) return '₹0';
      if (val >= 10000000) return `₹${(val / 10000000).toFixed(1).replace('.0', '')} Cr`;
      if (val >= 100000) return `₹${(val / 100000).toFixed(1).replace('.0', '')} L`;
      if (val >= 1000) return `₹${Math.round(val / 1000)}k`;
      return `₹${val.toLocaleString('en-IN')}`;
    };

    const priceSpectrum =
      prices.length > 0
        ? minPrice === maxPrice
          ? formatPriceShort(minPrice)
          : `${formatPriceShort(minPrice)} - ${formatPriceShort(maxPrice)}`
        : '₹0';

    return {
      total,
      available,
      reserved,
      sold,
      occupancyRate,
      priceSpectrum,
    };
  }, [units]);

  // Tab Filtering
  const filteredUnits = useMemo(() => {
    if (activeTab === 'ALL') return units;
    return units.filter((u) => u.availability === activeTab);
  }, [units, activeTab]);

  // Inline Quick-Action Toggle (Available ↔ Reserved)
  const handleToggleAvailability = async (unit: ComplexUnit) => {
    triggerHaptic();
    const nextStatus: UnitAvailability =
      unit.availability === 'AVAILABLE' ? 'RESERVED' : 'AVAILABLE';

    setTogglingUnitId(unit.id);
    // Optimistic UI Update
    setUnits((prev) =>
      prev.map((u) => (u.id === unit.id ? { ...u, availability: nextStatus } : u))
    );

    try {
      const res = await updateUnitAvailability(unit.id, nextStatus);
      if (!res.success) {
        // Revert if failed
        setUnits((prev) =>
          prev.map((u) => (u.id === unit.id ? { ...u, availability: unit.availability } : u))
        );
        Alert.alert('Error', 'Could not update unit status.');
      }
    } catch (e) {
      setUnits((prev) =>
        prev.map((u) => (u.id === unit.id ? { ...u, availability: unit.availability } : u))
      );
    } finally {
      setTogglingUnitId(null);
    }
  };

  // Add Unit Form Submission
  const handleAddUnit = async () => {
    if (!newUnitNumber.trim() || !newPrice.trim()) {
      Alert.alert('Missing Info', 'Please provide a Unit Number and Price.');
      return;
    }

    triggerHaptic();
    setIsSubmittingUnit(true);

    try {
      const parsedFloor = parseInt(newFloor, 10) || 1;
      const parsedBeds = parseInt(newBedrooms, 10) || 1;
      const parsedBaths = parseFloat(newBathrooms) || 1;
      const parsedArea = newArea ? parseFloat(newArea) : null;
      const parsedPrice = parseFloat(newPrice) || 0;

      const res = await addUnitToComplex({
        complex_id: id as string,
        unit_number: newUnitNumber.trim(),
        floor: parsedFloor,
        floor_name: `${parsedFloor}${getFloorSuffix(parsedFloor)} Floor`,
        bedrooms: parsedBeds,
        bathrooms: parsedBaths,
        area_sqft: parsedArea,
        price: parsedPrice,
        listing_type: newListingType,
        availability: newAvailability,
      });

      if (res.success && res.data) {
        setUnits((prev) => [...prev, res.data!]);
        setIsAddModalVisible(false);
        resetAddForm();
      } else {
        throw new Error('Could not add unit');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to add unit to complex.');
    } finally {
      setIsSubmittingUnit(false);
    }
  };

  const resetAddForm = () => {
    setNewUnitNumber('');
    setNewFloor('');
    setNewBedrooms('2');
    setNewBathrooms('2');
    setNewArea('');
    setNewPrice('');
    setNewListingType('SALE');
    setNewAvailability('AVAILABLE');
  };

  function getFloorSuffix(floor: number): string {
    const j = floor % 10;
    const k = floor % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  const renderAvailabilityBadge = (status: UnitAvailability) => {
    if (status === 'AVAILABLE') {
      return (
        <View style={styles.badgeAvailable}>
          <View style={styles.dotAvailable} />
          <Text style={styles.badgeTextAvailable}>AVAILABLE</Text>
        </View>
      );
    }
    if (status === 'RESERVED') {
      return (
        <View style={styles.badgeReserved}>
          <View style={styles.dotReserved} />
          <Text style={styles.badgeTextReserved}>RESERVED</Text>
        </View>
      );
    }
    return (
      <View style={styles.badgeSold}>
        <View style={styles.dotSold} />
        <Text style={styles.badgeTextSold}>SOLD</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingLabel}>Loading Complex Units...</Text>
      </SafeAreaView>
    );
  }

  const complexTitle =
    complex?.complex_name || complex?.title || 'Multi-Unit Complex';
  const complexAddress = complex?.address || 'Prime Urban District';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            triggerHaptic();
            router.back();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {complexTitle}
          </Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={13} color="#059669" />
            <Text style={styles.locationText} numberOfLines={1}>
              {complexAddress}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerInfoButton}
          onPress={() => {
            triggerHaptic();
            Alert.alert(
              'Complex Information',
              `Tower: ${complexTitle}\nAddress: ${complexAddress}\nTotal Planned Units: ${complex?.total_units || stats.total}\nTotal Floors: ${complex?.floor_count || '--'}`
            );
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={22} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Main Scrollable Content */}
      <FlatList
        data={filteredUnits}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Overall Complex Stats Card */}
            <View style={styles.statsCard}>
              <View style={styles.statsCardHeader}>
                <View style={styles.statsTitleRow}>
                  <Ionicons name="business" size={18} color="#059669" />
                  <Text style={styles.statsCardTitle}>Tower Inventory Overview</Text>
                </View>
                <View style={styles.occupancyPill}>
                  <Text style={styles.occupancyPillText}>
                    {stats.occupancyRate}% Occupied
                  </Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.total}</Text>
                  <Text style={styles.statLabel}>Total Units</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#059669' }]}>
                    {stats.available}
                  </Text>
                  <Text style={styles.statLabel}>Available</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#d97706' }]}>
                    {stats.reserved}
                  </Text>
                  <Text style={styles.statLabel}>Reserved</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: '#64748b' }]}>
                    {stats.sold}
                  </Text>
                  <Text style={styles.statLabel}>Sold</Text>
                </View>
              </View>

              {/* Price Spectrum Footer Row */}
              <View style={styles.priceSpectrumRow}>
                <View style={styles.priceSpectrumTag}>
                  <Ionicons name="pricetag-outline" size={13} color="#059669" />
                  <Text style={styles.priceSpectrumTagText}>Price Spectrum</Text>
                </View>
                <Text style={styles.priceSpectrumValue}>{stats.priceSpectrum}</Text>
              </View>
            </View>

            {/* Tiered / Floor Segmented Tabs */}
            <View style={styles.segmentedTabBar}>
              {(
                [
                  { key: 'ALL', label: `All (${stats.total})` },
                  { key: 'AVAILABLE', label: `Available (${stats.available})` },
                  { key: 'RESERVED', label: `Reserved (${stats.reserved})` },
                  { key: 'SOLD', label: `Sold (${stats.sold})` },
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.segmentTab, isActive && styles.segmentTabActive]}
                    onPress={() => {
                      triggerHaptic();
                      setActiveTab(tab.key);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.segmentTabText,
                        isActive && styles.segmentTabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="layers-outline" size={36} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>No Units Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'ALL'
                ? 'No units have been added to this complex yet.'
                : `No units with status "${activeTab}" found.`}
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => {
                triggerHaptic();
                setIsAddModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
              <Text style={styles.emptyAddButtonText}>Add First Unit</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const isBusy = togglingUnitId === item.id;
          const floorLabel =
            item.floor_name ||
            (item.floor ? `${item.floor}${getFloorSuffix(Number(item.floor))} Floor` : 'Main Level');

          return (
            <View style={styles.unitCard}>
              {/* Unit Card Header */}
              <View style={styles.unitCardHeader}>
                <View style={styles.unitInfoGroup}>
                  <Text style={styles.unitNumberText}>{item.unit_number}</Text>
                  <View style={styles.floorPill}>
                    <Ionicons name="business-outline" size={11} color="#64748b" />
                    <Text style={styles.floorPillText}>{floorLabel}</Text>
                  </View>
                </View>
                {renderAvailabilityBadge(item.availability)}
              </View>

              {/* Specs Row */}
              <View style={styles.unitSpecsRow}>
                <View style={styles.specItem}>
                  <Ionicons name="bed-outline" size={15} color="#475569" />
                  <Text style={styles.specText}>{item.bedrooms} Beds</Text>
                </View>

                <View style={styles.specItem}>
                  <Ionicons name="water-outline" size={15} color="#475569" />
                  <Text style={styles.specText}>{item.bathrooms} Baths</Text>
                </View>

                {item.area_sqft ? (
                  <View style={styles.specItem}>
                    <Ionicons name="scan-outline" size={15} color="#475569" />
                    <Text style={styles.specText}>{item.area_sqft.toLocaleString()} sqft</Text>
                  </View>
                ) : null}

                <View style={styles.specItem}>
                  <Ionicons name="swap-horizontal-outline" size={15} color="#475569" />
                  <Text style={styles.specText}>{item.listing_type || 'SALE'}</Text>
                </View>
              </View>

              {/* Price & Inline Availability Toggle Row */}
              <View style={styles.unitActionFooter}>
                <View style={styles.unitPriceGroup}>
                  <Text style={styles.unitPriceText}>
                    ₹{item.price?.toLocaleString('en-IN')}
                  </Text>
                  {item.listing_type === 'RENT' && (
                    <Text style={styles.unitPricePeriod}>/mo</Text>
                  )}
                </View>

                {/* Inline Quick-Action Toggle (Available ↔ Reserved) */}
                {item.availability !== 'SOLD' ? (
                  <TouchableOpacity
                    style={[
                      styles.quickToggleBtn,
                      item.availability === 'AVAILABLE'
                        ? styles.quickToggleBtnToReserve
                        : styles.quickToggleBtnToAvailable,
                    ]}
                    onPress={() => handleToggleAvailability(item)}
                    activeOpacity={0.8}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : item.availability === 'AVAILABLE' ? (
                      <>
                        <Ionicons name="time-outline" size={14} color="#b45309" />
                        <Text style={styles.quickToggleBtnTextReserve}>Mark Reserved</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                        <Text style={styles.quickToggleBtnTextAvailable}>Mark Available</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.soldNoticeBadge}>
                    <Ionicons name="lock-closed" size={12} color="#64748b" />
                    <Text style={styles.soldNoticeText}>Finalized</Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
      />

      {/* Floating [ + Add Unit ] Action Button */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={styles.floatingAddButton}
          onPress={() => {
            triggerHaptic();
            setIsAddModalVisible(true);
          }}
          activeOpacity={0.88}
        >
          <Ionicons name="add" size={22} color="#ffffff" />
          <Text style={styles.floatingAddButtonText}>Add Unit</Text>
        </TouchableOpacity>
      </View>

      {/* iOS Bottom Sheet Modal: Add Unit */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeContainer} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalGrabber} />
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={styles.modalTitle}>Add New Unit</Text>
                  <Text style={styles.modalSubtitle}>{complexTitle}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    triggerHaptic();
                    setIsAddModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color="#475569" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Unit Number & Floor Row */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Unit Number *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newUnitNumber}
                    onChangeText={setNewUnitNumber}
                    placeholder="e.g. Suite 1402"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Floor *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newFloor}
                    onChangeText={setNewFloor}
                    placeholder="e.g. 14"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Bedrooms & Bathrooms Row */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Bedrooms</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newBedrooms}
                    onChangeText={setNewBedrooms}
                    placeholder="2"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Bathrooms</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newBathrooms}
                    onChangeText={setNewBathrooms}
                    placeholder="2"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Area & Price Row */}
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Area (Sq Ft)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newArea}
                    onChangeText={setNewArea}
                    placeholder="e.g. 1250"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Price (₹) *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newPrice}
                    onChangeText={setNewPrice}
                    placeholder="e.g. 7500000"
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Listing Type Segment */}
              <Text style={styles.formLabel}>Listing Type</Text>
              <View style={styles.pillSelectorRow}>
                {(['SALE', 'RENT'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.pillSelectorBtn,
                      newListingType === type && styles.pillSelectorBtnActive,
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setNewListingType(type);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.pillSelectorText,
                        newListingType === type && styles.pillSelectorTextActive,
                      ]}
                    >
                      {type === 'SALE' ? 'For Sale' : 'For Rent'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Initial Availability Segment */}
              <Text style={styles.formLabel}>Initial Availability</Text>
              <View style={styles.pillSelectorRow}>
                {(['AVAILABLE', 'RESERVED', 'SOLD'] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.pillSelectorBtn,
                      newAvailability === status && styles.pillSelectorBtnActive,
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setNewAvailability(status);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.pillSelectorText,
                        newAvailability === status && styles.pillSelectorTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Modal Bottom Save Bar */}
            <View style={styles.modalBottomBar}>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleAddUnit}
                activeOpacity={0.88}
                disabled={isSubmittingUnit}
              >
                {isSubmittingUnit ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                    <Text style={styles.modalSubmitButtonText}>Add Unit to Complex</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingLabel: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 12,
    color: '#64748b',
  },
  headerInfoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  // Overall Stats Card
  statsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  occupancyPill: {
    backgroundColor: '#ecfdf5',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  occupancyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  priceSpectrumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
  },
  priceSpectrumTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  priceSpectrumTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  priceSpectrumValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  // Segmented Tabs
  segmentedTabBar: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  // Unit Cards
  unitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  unitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  unitInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitNumberText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  floorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 6,
  },
  floorPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  badgeAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  dotAvailable: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  badgeTextAvailable: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.3,
  },
  badgeReserved: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  dotReserved: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d97706',
  },
  badgeTextReserved: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
    letterSpacing: 0.3,
  },
  badgeSold: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 20,
    gap: 5,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  dotSold: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748b',
  },
  badgeTextSold: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.3,
  },
  unitSpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  unitActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unitPriceGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  unitPriceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  unitPricePeriod: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  quickToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 5,
  },
  quickToggleBtnToReserve: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  quickToggleBtnToAvailable: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  quickToggleBtnTextReserve: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  quickToggleBtnTextAvailable: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  soldNoticeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  soldNoticeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  emptyAddButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  // Floating + Add Unit Button
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  floatingAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderRadius: 28,
    gap: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingAddButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  // Modal Styles
  modalSafeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  modalGrabber: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  formCol: {
    flex: 1,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  pillSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  pillSelectorBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  pillSelectorBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  pillSelectorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  pillSelectorTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  modalBottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  modalSubmitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
