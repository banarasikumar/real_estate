import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Path } from 'react-native-svg';
import { useAuth } from '@repo/api';
import { savedSearchesStore, SavedSearchItem } from '../services/savedSearchesStore';
import { MobileFilterState } from './MobileFilterModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface MobileSaveSearchModalProps {
  visible: boolean;
  onClose: () => void;
  searchQuery?: string;
  regionName?: string;
  modalFilters?: MobileFilterState;
  activeQuickFilter?: string; // 'rent' | 'sale' | 'price' etc.
  drawnPolygon?: Array<{ latitude: number; longitude: number }> | null;
  existingSearchId?: string | null;
  onSaved?: (savedItem: SavedSearchItem) => void;
  onDeleted?: (deletedId: string) => void;
}

type NotificationFreq = 'INSTANT' | 'DAILY' | 'NEVER';

const NAME_SUGGESTIONS = [
  'Dream Villa',
  'High ROI Investments',
  'Family Home',
  'Waterfront Luxury',
  'City Penthouse',
  'Modern Retreat',
];

export const MobileSaveSearchModal: React.FC<MobileSaveSearchModalProps> = ({
  visible,
  onClose,
  searchQuery = '',
  regionName = '',
  modalFilters = {},
  activeQuickFilter = 'sale',
  drawnPolygon = null,
  existingSearchId = null,
  onSaved,
  onDeleted,
}) => {
  const { user } = useAuth();

  // Smart initial name derivation
  const getSmartInitialName = () => {
    if (drawnPolygon && drawnPolygon.length > 0) {
      return regionName ? `${regionName} Custom Area` : 'Custom Boundary Area';
    }
    if (regionName) {
      return `${regionName} Homes`;
    }
    if (searchQuery && searchQuery.trim().length > 0) {
      // Capitalize first letters of words
      return searchQuery
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
    return 'Saved Search';
  };

  const [searchName, setSearchName] = useState(getSmartInitialName);
  const [notificationFrequency, setNotificationFrequency] = useState<NotificationFreq>('INSTANT');
  const [alertNewMatches, setAlertNewMatches] = useState(true);
  const [alertPriceDrop, setAlertPriceDrop] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Animation values for Apple-grade fluid touch feedback
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      setSaveSuccess(false);
      setSaving(false);
      // If editing existing, load its values
      if (existingSearchId) {
        const found = savedSearchesStore.getSearches().find((s) => s.id === existingSearchId);
        if (found) {
          setSearchName(found.name);
          setNotificationFrequency(
            (found.notification_frequency as NotificationFreq) || 'INSTANT'
          );
          setAlertNewMatches(found.alert_new_matches ?? true);
          setAlertPriceDrop(found.alert_price_drop ?? true);
        }
      } else {
        setSearchName(getSmartInitialName());
        setNotificationFrequency('INSTANT');
        setAlertNewMatches(true);
        setAlertPriceDrop(true);
      }

      Animated.spring(sheetTranslateY, {
        toValue: 0,
        damping: 24,
        mass: 0.8,
        stiffness: 220,
        useNativeDriver: true,
      }).start();
    } else {
      sheetTranslateY.setValue(300);
    }
  }, [visible, existingSearchId, regionName, searchQuery, drawnPolygon]);

  // Context subtitle description
  const getContextSubtitle = () => {
    const parts: string[] = [];
    if (regionName) {
      parts.push(regionName);
    } else if (searchQuery) {
      parts.push(searchQuery);
    }

    const isRent =
      modalFilters.list_type === 'RENT' || activeQuickFilter?.toLowerCase() === 'rent';
    parts.push(isRent ? 'For Rent' : 'For Sale');

    if (drawnPolygon && drawnPolygon.length > 0) {
      parts.push(`${drawnPolygon.length} boundary points`);
    }

    return parts.join(' • ');
  };

  // Filter badges list for the HUD summary
  const getActiveFilterBadges = () => {
    const badges: Array<{ label: string; icon: keyof typeof Ionicons.glyphMap }> = [];

    const isRent =
      modalFilters.list_type === 'RENT' || activeQuickFilter?.toLowerCase() === 'rent';
    badges.push({
      label: isRent ? 'For Rent' : 'For Sale',
      icon: isRent ? 'key-outline' : 'home-outline',
    });

    if (modalFilters.prop_type) {
      badges.push({
        label: modalFilters.prop_type.charAt(0) + modalFilters.prop_type.slice(1).toLowerCase(),
        icon: 'business-outline',
      });
    }

    if (modalFilters.bedrooms) {
      badges.push({
        label: `${modalFilters.bedrooms}+ Beds`,
        icon: 'bed-outline',
      });
    }

    if (modalFilters.bathrooms) {
      badges.push({
        label: `${modalFilters.bathrooms}+ Baths`,
        icon: 'water-outline',
      });
    }

    if (modalFilters.priceRange) {
      const priceLabels: Record<string, string> = {
        under_50l: 'Under ₹50L',
        '50l_1cr': '₹50L - ₹1Cr',
        '1cr_3cr': '₹1Cr - ₹3Cr',
        above_3cr: '₹3Cr+',
      };
      badges.push({
        label: priceLabels[modalFilters.priceRange] || modalFilters.priceRange,
        icon: 'pricetag-outline',
      });
    }

    return badges;
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 15,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleSave = async () => {
    if (!searchName.trim()) return;

    setSaving(true);

    try {
      let savedItem: SavedSearchItem;

      if (existingSearchId) {
        await savedSearchesStore.updateSearch(
          existingSearchId,
          {
            name: searchName.trim(),
            notification_frequency: notificationFrequency,
            alert_new_matches: alertNewMatches,
            alert_price_drop: alertPriceDrop,
          },
          user?.id
        );
        const updated = savedSearchesStore.getSearches().find((s) => s.id === existingSearchId);
        savedItem = updated || {
          id: existingSearchId,
          name: searchName.trim(),
          notification_frequency: notificationFrequency,
          created_at: new Date().toISOString(),
        };
      } else {
        savedItem = await savedSearchesStore.saveSearch({
          name: searchName.trim(),
          query: searchQuery || regionName || '',
          filters: {
            ...modalFilters,
            list_type:
              modalFilters.list_type || (activeQuickFilter?.toLowerCase() === 'rent' ? 'RENT' : 'SALE'),
          },
          polygon: drawnPolygon,
          notificationFrequency,
          alertNewMatches,
          alertPriceDrop,
          userId: user?.id || null,
        });
      }

      setSaving(false);
      setSaveSuccess(true);

      setTimeout(() => {
        onSaved?.(savedItem);
        onClose();
      }, 650);
    } catch (err) {
      console.error('Error saving search:', err);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingSearchId) return;
    await savedSearchesStore.removeSearch(existingSearchId, user?.id);
    onDeleted?.(existingSearchId);
    onClose();
  };

  const filterBadges = getActiveFilterBadges();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissOverlay} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            {/* iOS Top Grabber */}
            <View style={styles.grabberContainer}>
              <View style={styles.grabber} />
            </View>

            {/* Header with Title & Circular Close Button */}
            <View style={styles.header}>
              <View style={styles.titleWrap}>
                <Text style={styles.headerTitle}>
                  {existingSearchId ? 'Edit Saved Search' : 'Save Search'}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {getContextSubtitle()}
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={styles.closeIconButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={19} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollBody}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Section 1: Search Name Input */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>SEARCH NAME</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="search" size={17} color="#94a3b8" style={styles.inputSearchIcon} />
                  <TextInput
                    style={styles.textInput}
                    value={searchName}
                    onChangeText={setSearchName}
                    placeholder="e.g. Los Angeles Luxury Homes"
                    placeholderTextColor="#94a3b8"
                    selectionColor="#0f172a"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                  {searchName.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchName('')}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Name Suggestions Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsScroll}
                >
                  {NAME_SUGGESTIONS.map((suggestion) => {
                    const isCurrent = searchName.trim().toLowerCase() === suggestion.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={suggestion}
                        style={[
                          styles.suggestionPill,
                          isCurrent && styles.suggestionPillActive,
                        ]}
                        activeOpacity={0.75}
                        onPress={() => setSearchName(suggestion)}
                      >
                        <Ionicons
                          name="sparkles"
                          size={12}
                          color={isCurrent ? '#ffffff' : '#64748b'}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.suggestionPillText,
                            isCurrent && styles.suggestionPillTextActive,
                          ]}
                        >
                          {suggestion}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Section 2: Search Summary HUD */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>SEARCH CRITERIA</Text>
                <View style={styles.hudCard}>
                  {/* Custom Polygon Boundary Badge if drawn */}
                  {drawnPolygon && drawnPolygon.length > 0 && (
                    <View style={styles.polygonBadge}>
                      <View style={styles.polygonIconWrap}>
                        <Svg width={18} height={18} viewBox="0 0 24 24">
                          <Polygon
                            points="4,6 18,3 21,17 12,21 3,15"
                            fill="rgba(59, 130, 246, 0.2)"
                            stroke="#2563eb"
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                        </Svg>
                      </View>
                      <View style={styles.polygonTextWrap}>
                        <Text style={styles.polygonTitle}>Custom Drawn Boundary</Text>
                        <Text style={styles.polygonSubtitle}>
                          Alerts locked to your {drawnPolygon.length}-point freehand zone
                        </Text>
                      </View>
                      <View style={styles.activePillDot} />
                    </View>
                  )}

                  {/* Active Filter Pills HUD */}
                  <View style={styles.filterPillsRow}>
                    {filterBadges.map((badge, idx) => (
                      <View key={idx} style={styles.criteriaPill}>
                        <Ionicons name={badge.icon} size={13} color="#2563eb" style={{ marginRight: 5 }} />
                        <Text style={styles.criteriaPillText}>{badge.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Section 3: Notification Frequency iOS Segmented Control */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>NOTIFICATION FREQUENCY</Text>
                <View style={styles.segmentedContainer}>
                  {(
                    [
                      { id: 'INSTANT', label: '⚡ Instant' },
                      { id: 'DAILY', label: '📅 Daily Digest' },
                      { id: 'NEVER', label: '🔕 Never' },
                    ] as const
                  ).map((option) => {
                    const isSelected = notificationFrequency === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.segmentButton,
                          isSelected && styles.segmentButtonActive,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => setNotificationFrequency(option.id)}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            isSelected && styles.segmentTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Section 4: Alert Trigger Toggles */}
              <View style={styles.section}>
                <Text style={styles.inputLabel}>ALERT TRIGGERS</Text>
                <View style={styles.togglesCard}>
                  {/* Row 1: New Matching Homes */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleIconContainer}>
                      <Ionicons name="notifications-outline" size={20} color="#2563eb" />
                    </View>
                    <View style={styles.toggleTextContainer}>
                      <Text style={styles.toggleTitle}>New matching homes</Text>
                      <Text style={styles.toggleSubtitle}>
                        Instant alert when a home meets your criteria
                      </Text>
                    </View>
                    <Switch
                      value={alertNewMatches}
                      onValueChange={setAlertNewMatches}
                      trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                      thumbColor="#ffffff"
                      ios_backgroundColor="#e2e8f0"
                    />
                  </View>

                  <View style={styles.toggleDivider} />

                  {/* Row 2: Price Reductions */}
                  <View style={styles.toggleRow}>
                    <View style={styles.toggleIconContainer}>
                      <Ionicons name="pricetag-outline" size={20} color="#e11d48" />
                    </View>
                    <View style={styles.toggleTextContainer}>
                      <Text style={styles.toggleTitle}>Price reductions</Text>
                      <Text style={styles.toggleSubtitle}>
                        Notify if any matching home drops in price
                      </Text>
                    </View>
                    <Switch
                      value={alertPriceDrop}
                      onValueChange={setAlertPriceDrop}
                      trackColor={{ false: '#e2e8f0', true: '#2563eb' }}
                      thumbColor="#ffffff"
                      ios_backgroundColor="#e2e8f0"
                    />
                  </View>
                </View>
              </View>

              {/* Section 5: Action Buttons */}
              <View style={styles.actionSection}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <TouchableOpacity
                    style={[
                      styles.primarySaveButton,
                      saveSuccess && styles.primarySaveButtonSuccess,
                    ]}
                    activeOpacity={0.9}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    onPress={handleSave}
                    disabled={saving || saveSuccess || !searchName.trim()}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : saveSuccess ? (
                      <View style={styles.btnInnerRow}>
                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.primarySaveButtonText}>Search Saved</Text>
                      </View>
                    ) : (
                      <View style={styles.btnInnerRow}>
                        <Ionicons name="bookmark" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.primarySaveButtonText}>
                          {existingSearchId ? 'Update Saved Search' : 'Save Search'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                {/* Destructive Delete Button if editing */}
                {existingSearchId && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                    <Text style={styles.deleteButtonText}>Delete Saved Search</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 20,
  },
  grabberContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  grabber: {
    width: 38,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#cbd5e1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    maxHeight: 520,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
  },
  inputSearchIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 0,
  },
  suggestionsScroll: {
    flexDirection: 'row',
    paddingTop: 10,
    gap: 8,
  },
  suggestionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  suggestionPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  suggestionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  suggestionPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  hudCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  polygonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 10,
    marginBottom: 10,
  },
  polygonIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  polygonTextWrap: {
    flex: 1,
  },
  polygonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
  },
  polygonSubtitle: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
    marginTop: 1,
  },
  activePillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginLeft: 6,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  criteriaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  criteriaPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  togglesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  toggleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  toggleSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '400',
  },
  toggleDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 48,
  },
  actionSection: {
    marginTop: 8,
    gap: 12,
  },
  primarySaveButton: {
    height: 52,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  primarySaveButtonSuccess: {
    backgroundColor: '#059669',
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primarySaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
});
