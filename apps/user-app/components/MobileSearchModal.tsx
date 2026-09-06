import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  SearchRegion,
  SEARCH_REGIONS,
  RECENT_SEARCH_HISTORY,
  SUGGESTED_SEARCHES,
  getSearchSuggestions,
  findRegionByNameOrCity,
  getRegionById,
  SearchHistoryItem,
  SearchSuggestionItem,
} from '../data/searchRegions';

export interface MobileSearchModalProps {
  visible: boolean;
  initialQuery?: string;
  initialListType?: 'SALE' | 'RENT' | string;
  onClose: () => void;
  onSelectRegion: (region: SearchRegion, listType: string) => void;
  onSelectQuery: (query: string, listType: string) => void;
  onListTypeChange?: (listType: 'SALE' | 'RENT') => void;
}

type TabType = 'SALE' | 'RENT' | 'SOLD';

export const MobileSearchModal: React.FC<MobileSearchModalProps> = ({
  visible,
  initialQuery = '',
  initialListType = 'SALE',
  onClose,
  onSelectRegion,
  onSelectQuery,
  onListTypeChange,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<TabType>(
    initialListType === 'RENT' ? 'RENT' : 'SALE'
  );

  // Sync state when modal is opened or props change
  useEffect(() => {
    if (visible) {
      setQuery(initialQuery);
      setActiveTab(initialListType === 'RENT' ? 'RENT' : 'SALE');
    }
  }, [visible, initialQuery, initialListType]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'SALE') {
      onListTypeChange?.('SALE');
    } else if (tab === 'RENT') {
      onListTypeChange?.('RENT');
    } else {
      onListTypeChange?.('SALE');
    }
  };

  const getPlaceholder = () => {
    if (activeTab === 'RENT') {
      return 'Try "Rentals with patios"';
    }
    if (activeTab === 'SALE') {
      return 'Try "Homes with pools"';
    }
    return 'Try "Recently sold homes"';
  };

  const handleSelectItem = (text: string, regionId?: string) => {
    if (regionId) {
      const region = getRegionById(regionId);
      if (region) {
        onSelectRegion(region, activeTab);
        onClose();
        return;
      }
    }

    const matchedRegion = findRegionByNameOrCity(text);
    if (matchedRegion) {
      onSelectRegion(matchedRegion, activeTab);
      onClose();
      return;
    }

    onSelectQuery(text, activeTab);
    onClose();
  };

  const handleSearchSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    handleSelectItem(trimmed);
  };

  const handleCurrentLocation = () => {
    onSelectQuery('Current location', activeTab);
    onClose();
  };

  // Filter live suggestions when user types in search box
  const liveSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    return getSearchSuggestions(query);
  }, [query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Top Search Input Capsule Bar */}
          <View style={styles.header}>
            <View style={styles.searchBar}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={22} color="#0f172a" />
              </TouchableOpacity>

              <TextInput
                style={styles.input}
                placeholder={getPlaceholder()}
                placeholderTextColor="#64748b"
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                autoFocus
                autoCorrect={false}
                clearButtonMode="never"
              />

              {query.length > 0 ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setQuery('')}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search text"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color="#0f172a" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionButton}
                  accessibilityRole="button"
                  accessibilityLabel="Voice search"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="mic" size={22} color="#0f172a" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Tab Switcher: [ For sale | For rent | Sold ] */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabChange('SALE')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'SALE' && styles.tabTextActive,
                ]}
              >
                For sale
              </Text>
              {activeTab === 'SALE' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabChange('RENT')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'RENT' && styles.tabTextActive,
                ]}
              >
                For rent
              </Text>
              {activeTab === 'RENT' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => handleTabChange('SOLD')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'SOLD' && styles.tabTextActive,
                ]}
              >
                Sold
              </Text>
              {activeTab === 'SOLD' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Quick Action: Current location */}
            <TouchableOpacity
              style={styles.locationRow}
              onPress={handleCurrentLocation}
              activeOpacity={0.65}
            >
              <Ionicons name="navigate-sharp" size={20} color="#0f172a" />
              <Text style={styles.locationText}>Current location</Text>
            </TouchableOpacity>

            {/* Gray band separator */}
            <View style={styles.sectionBand} />

            {/* When query is empty, show Search History & Suggested Searches */}
            {query.trim().length === 0 ? (
              <>
                {/* Search history Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Search history</Text>
                  {RECENT_SEARCH_HISTORY.map((item, index) => (
                    <TouchableOpacity
                      key={item.id || `hist-${index}`}
                      style={styles.rowItem}
                      onPress={() => handleSelectItem(item.text, item.regionId)}
                      activeOpacity={0.65}
                    >
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color="#64748b"
                        style={styles.rowIcon}
                      />
                      <View style={styles.rowTextWrap}>
                        <Text style={styles.rowText}>{item.text}</Text>
                        {item.subtext ? (
                          <Text style={styles.rowSubtext}>{item.subtext}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Gray band separator */}
                <View style={styles.sectionBand} />

                {/* Suggested searches Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionHeader}>Suggested searches</Text>
                  {SUGGESTED_SEARCHES.map((item, index) => (
                    <TouchableOpacity
                      key={item.id || `sugg-${index}`}
                      style={styles.rowItem}
                      onPress={() => handleSelectItem(item.text, item.regionId)}
                      activeOpacity={0.65}
                    >
                      <Ionicons
                        name="search-outline"
                        size={18}
                        color="#64748b"
                        style={styles.rowIcon}
                      />
                      <View style={styles.rowTextWrap}>
                        <Text style={styles.rowText}>{item.text}</Text>
                        {item.subtitle ? (
                          <Text style={styles.rowSubtext}>{item.subtitle}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              /* Live Dynamic Search Results */
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Locations & Suggestions</Text>
                {liveSuggestions.map((item, index) => (
                  <TouchableOpacity
                    key={item.id || `live-${index}`}
                    style={styles.rowItem}
                    onPress={() => handleSelectItem(item.text, item.regionId)}
                    activeOpacity={0.65}
                  >
                    <Ionicons
                      name={item.regionId ? 'location-outline' : 'search-outline'}
                      size={20}
                      color="#64748b"
                      style={styles.rowIcon}
                    />
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowText}>{item.text}</Text>
                      {item.subtitle ? (
                        <Text style={styles.rowSubtext}>{item.subtitle}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    height: 48,
    paddingHorizontal: 12,
  },
  backButton: {
    padding: 6,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  actionButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#334155',
  },
  tabTextActive: {
    fontWeight: '700',
    color: '#2563eb',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#2563eb',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  scrollContent: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 52,
  },
  locationText: {
    marginLeft: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  sectionBand: {
    height: 8,
    backgroundColor: '#f8fafc',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#f1f5f9',
  },
  section: {
    backgroundColor: '#ffffff',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  rowIcon: {
    width: 24,
    textAlign: 'center',
  },
  rowTextWrap: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '400',
  },
  rowSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
