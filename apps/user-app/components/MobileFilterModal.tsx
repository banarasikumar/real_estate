import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export interface MobileFilterState {
  list_type?: string;
  prop_type?: string;
  bedrooms?: number;
  bathrooms?: number;
  priceRange?: string;
  isVerified?: boolean;
}

interface MobileFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: MobileFilterState;
  onApply: (filters: MobileFilterState) => void;
  onReset: () => void;
  totalMatches: number;
}

export const MobileFilterModal: React.FC<MobileFilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
  totalMatches,
}) => {
  const [localFilters, setLocalFilters] = useState<MobileFilterState>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, visible]);

  const setField = (key: keyof MobileFilterState, value: any) => {
    setLocalFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
  };

  const handleReset = () => {
    setLocalFilters({});
    onReset();
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const PRICE_PRESETS = [
    { id: 'under_50l', label: 'Under ₹50L' },
    { id: '50l_1cr', label: '₹50L - ₹1Cr' },
    { id: '1cr_3cr', label: '₹1Cr - ₹3Cr' },
    { id: 'above_3cr', label: '₹3Cr+' },
  ];

  const PROPERTY_TYPES = [
    { id: 'APARTMENT', label: 'Apartment' },
    { id: 'VILLA', label: 'Villa' },
    { id: 'HOUSE', label: 'House' },
    { id: 'PENTHOUSE', label: 'Penthouse' },
  ];

  const BEDS_OPTIONS = [1, 2, 3, 4, 5];
  const BATHS_OPTIONS = [1, 2, 3, 4];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeContainer}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Filters</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Filter Content */}
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Listing Type */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Listing Type</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentTab,
                      !localFilters.list_type && styles.segmentTabActive,
                    ]}
                    onPress={() => setField('list_type', undefined)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        !localFilters.list_type && styles.segmentTextActive,
                      ]}
                    >
                      Any
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentTab,
                      localFilters.list_type === 'SALE' && styles.segmentTabActive,
                    ]}
                    onPress={() => setField('list_type', 'SALE')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        localFilters.list_type === 'SALE' && styles.segmentTextActive,
                      ]}
                    >
                      For Sale
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentTab,
                      localFilters.list_type === 'RENT' && styles.segmentTabActive,
                    ]}
                    onPress={() => setField('list_type', 'RENT')}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        localFilters.list_type === 'RENT' && styles.segmentTextActive,
                      ]}
                    >
                      For Rent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Price Range Presets */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Price Range</Text>
                <View style={styles.chipRow}>
                  {PRICE_PRESETS.map((preset) => {
                    const isSelected = localFilters.priceRange === preset.id;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setField('priceRange', preset.id)}
                      >
                        <Text
                          style={[styles.chipText, isSelected && styles.chipTextActive]}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bedrooms */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bedrooms</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      localFilters.bedrooms === undefined && styles.chipActive,
                    ]}
                    onPress={() => setField('bedrooms', undefined)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        localFilters.bedrooms === undefined && styles.chipTextActive,
                      ]}
                    >
                      Any
                    </Text>
                  </TouchableOpacity>
                  {BEDS_OPTIONS.map((num) => {
                    const isSelected = localFilters.bedrooms === num;
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setField('bedrooms', num)}
                      >
                        <Text
                          style={[styles.chipText, isSelected && styles.chipTextActive]}
                        >
                          {num}+
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Bathrooms */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Bathrooms</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      localFilters.bathrooms === undefined && styles.chipActive,
                    ]}
                    onPress={() => setField('bathrooms', undefined)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        localFilters.bathrooms === undefined && styles.chipTextActive,
                      ]}
                    >
                      Any
                    </Text>
                  </TouchableOpacity>
                  {BATHS_OPTIONS.map((num) => {
                    const isSelected = localFilters.bathrooms === num;
                    return (
                      <TouchableOpacity
                        key={num}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setField('bathrooms', num)}
                      >
                        <Text
                          style={[styles.chipText, isSelected && styles.chipTextActive]}
                        >
                          {num}+
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Property Type */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Property Type</Text>
                <View style={styles.chipRow}>
                  {PROPERTY_TYPES.map((type) => {
                    const isSelected = localFilters.prop_type === type.id;
                    return (
                      <TouchableOpacity
                        key={type.id}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setField('prop_type', type.id)}
                      >
                        <Text
                          style={[styles.chipText, isSelected && styles.chipTextActive]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Verified Homes Only */}
              <View style={[styles.section, styles.switchSection]}>
                <View>
                  <Text style={styles.sectionTitle}>Verified Listings Only</Text>
                  <Text style={styles.switchSubtitle}>
                    Properties inspected and approved by platform admins
                  </Text>
                </View>
                <Switch
                  value={Boolean(localFilters.isVerified)}
                  onValueChange={(val) => setField('isVerified', val ? true : undefined)}
                  trackColor={{ false: '#e2e8f0', true: '#f43f5e' }}
                  thumbColor="#ffffff"
                />
              </View>
            </ScrollView>

            {/* Bottom Apply Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApply}
                activeOpacity={0.88}
              >
                <Text style={styles.applyButtonText}>
                  View {totalMatches} {totalMatches === 1 ? 'Home' : 'Homes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  safeContainer: {
    maxHeight: '88%',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  resetButton: {
    padding: 4,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e11d48',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  segmentTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#fff1f2',
    borderColor: '#e11d48',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#e11d48',
    fontWeight: '700',
  },
  switchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  switchSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 240,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  applyButton: {
    backgroundColor: '#e11d48',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});

export default MobileFilterModal;
