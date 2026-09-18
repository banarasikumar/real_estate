import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotification } from '../context/NotificationContext';
import type { AppNotification, NotificationType } from '@repo/api';

type FilterType = 'ALL' | 'MATCHES' | 'PRICE_DROPS' | 'TOURS_ENQUIRIES' | 'SYSTEM';
type TimeGroup = 'Today' | 'Yesterday' | 'Earlier This Week' | 'Older';

interface FilterOption {
  id: FilterType;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

const FILTER_OPTIONS: FilterOption[] = [
  { id: 'ALL', label: 'All' },
  { id: 'MATCHES', label: 'Matches', icon: 'sparkles' },
  { id: 'PRICE_DROPS', label: 'Price Drops', icon: 'trending-down' },
  { id: 'TOURS_ENQUIRIES', label: 'Tours & Enquiries', icon: 'home' },
  { id: 'SYSTEM', label: 'System', icon: 'notifications' },
];

interface CategoryStyleConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  bgColor: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
}

function getCategoryConfig(type: NotificationType): CategoryStyleConfig {
  switch (type) {
    case 'NEW_MATCH':
      return {
        label: 'New Match',
        icon: 'sparkles',
        bgColor: '#ecfdf5',
        iconColor: '#059669',
        badgeBg: '#d1fae5',
        badgeText: '#065f46',
      };
    case 'PRICE_DROP':
      return {
        label: 'Price Drop',
        icon: 'trending-down',
        bgColor: '#fff1f2',
        iconColor: '#e11d48',
        badgeBg: '#ffe4e6',
        badgeText: '#9f1239',
      };
    case 'TOUR_REQUEST':
      return {
        label: 'Tour Confirmed',
        icon: 'calendar',
        bgColor: '#fef3c7',
        iconColor: '#d97706',
        badgeBg: '#fde68a',
        badgeText: '#92400e',
      };
    case 'MESSAGE':
      return {
        label: 'Direct Message',
        icon: 'chatbubble-ellipses',
        bgColor: '#eff6ff',
        iconColor: '#2563eb',
        badgeBg: '#dbeafe',
        badgeText: '#1e40af',
      };
    case 'SYSTEM':
    default:
      return {
        label: 'System Alert',
        icon: 'notifications',
        bgColor: '#f1f5f9',
        iconColor: '#475569',
        badgeBg: '#e2e8f0',
        badgeText: '#334155',
      };
  }
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getTimeGroup(dateString: string): TimeGroup {
  const date = new Date(dateString);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'Earlier This Week';
  return 'Older';
}

function formatPrice(price?: number | null, listType?: string): string {
  if (price === undefined || price === null) return '';
  const isRent = listType === 'RENT' || price < 50000;
  if (price >= 1000000) {
    const formatted = (price / 1000000).toFixed(1).replace(/\.0$/, '');
    return `$${formatted}M${isRent ? '/mo' : ''}`;
  }
  return `$${price.toLocaleString('en-US')}${isRent ? '/mo' : ''}`;
}

export default function NotificationCenterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    restoreDemoNotifications,
    refreshNotifications,
    isLoadingNotifications,
  } = useNotification();

  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  }, [refreshNotifications]);

  // Compute category counts for filter bar badges
  const filterCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      ALL: notifications.length,
      MATCHES: 0,
      PRICE_DROPS: 0,
      TOURS_ENQUIRIES: 0,
      SYSTEM: 0,
    };

    for (const notif of notifications) {
      if (notif.type === 'NEW_MATCH') counts.MATCHES++;
      else if (notif.type === 'PRICE_DROP') counts.PRICE_DROPS++;
      else if (notif.type === 'TOUR_REQUEST' || notif.type === 'MESSAGE') counts.TOURS_ENQUIRIES++;
      else if (notif.type === 'SYSTEM') counts.SYSTEM++;
    }

    return counts;
  }, [notifications]);

  // Filtered notifications based on active pill
  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'MATCHES') return notif.type === 'NEW_MATCH';
      if (activeFilter === 'PRICE_DROPS') return notif.type === 'PRICE_DROP';
      if (activeFilter === 'TOURS_ENQUIRIES')
        return notif.type === 'TOUR_REQUEST' || notif.type === 'MESSAGE';
      if (activeFilter === 'SYSTEM') return notif.type === 'SYSTEM';
      return true;
    });
  }, [notifications, activeFilter]);

  // Group filtered notifications chronologically
  const groupedNotifications = useMemo(() => {
    const groupOrder: TimeGroup[] = ['Today', 'Yesterday', 'Earlier This Week', 'Older'];
    const buckets: Record<TimeGroup, AppNotification[]> = {
      'Today': [],
      'Yesterday': [],
      'Earlier This Week': [],
      'Older': [],
    };

    for (const notif of filteredNotifications) {
      const g = getTimeGroup(notif.created_at);
      buckets[g].push(notif);
    }

    return groupOrder
      .filter((g) => buckets[g].length > 0)
      .map((g) => ({
        group: g,
        items: buckets[g],
      }));
  }, [filteredNotifications]);

  // Deep linking and mark read interaction
  const handlePressNotification = async (notification: AppNotification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }

    const propId = notification.property_id || notification.property?.id;
    if (propId) {
      router.push(`/property/${propId}` as any);
      return;
    }

    if (notification.type === 'NEW_MATCH' || notification.saved_search_id) {
      router.push('/(tabs)/saved' as any);
      return;
    }

    if (notification.type === 'TOUR_REQUEST') {
      router.push('/(tabs)/enquiries' as any);
      return;
    }

    if (notification.type === 'MESSAGE') {
      router.push('/(tabs)/messages' as any);
      return;
    }

    // Default fallback: Explore screen
    router.push('/(tabs)' as any);
  };

  const handleConfirmClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to dismiss all notifications? You can restore sample luxury notifications anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => clearAllNotifications(),
        },
      ]
    );
  };

  const handleConfirmDeleteSingle = (notification: AppNotification) => {
    deleteNotification(notification.id);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.push('/(tabs)');
              }
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.titleWrapper}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {unreadNotificationsCount > 0 && (
              <View style={styles.unreadPill}>
                <View style={styles.unreadPillDot} />
                <Text style={styles.unreadPillText}>{unreadNotificationsCount} new</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.headerRightActions}>
          {unreadNotificationsCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={() => markAllNotificationsAsRead()}
              activeOpacity={0.75}
            >
              <Ionicons name="checkmark-done" size={17} color="#2563eb" style={{ marginRight: 4 }} />
              <Text style={styles.markAllText}>Mark Read</Text>
            </TouchableOpacity>
          )}

          {notifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleConfirmClearAll}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={19} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Segmented Horizontal Filter Bar */}
      <View style={styles.filterBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = activeFilter === opt.id;
            const count = filterCounts[opt.id];

            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setActiveFilter(opt.id)}
                activeOpacity={0.82}
              >
                {opt.icon && (
                  <Ionicons
                    name={opt.icon}
                    size={13}
                    color={isActive ? '#ffffff' : '#64748b'}
                    style={{ marginRight: 5 }}
                  />
                )}
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {opt.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.filterCountBadge, isActive && styles.filterCountBadgeActive]}>
                    <Text
                      style={[
                        styles.filterCountBadgeText,
                        isActive && styles.filterCountBadgeTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoadingNotifications}
            onRefresh={onRefresh}
            tintColor="#e11d48"
            colors={['#e11d48', '#2563eb']}
          />
        }
      >
        {/* State A: Completely Empty (All Cleared or 0 Items) */}
        {notifications.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.celebrateGlowRing}>
              <View style={styles.celebrateIconCircle}>
                <Ionicons name="checkmark-done" size={44} color="#10b981" />
              </View>
            </View>

            <Text style={styles.emptyTitle}>You're All Caught Up</Text>
            <Text style={styles.emptySubtitle}>
              No new alerts or price drops right now. Explore luxury residences across Los Angeles,
              New York, and Mumbai.
            </Text>

            <TouchableOpacity
              style={styles.explorePrimaryButton}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.88}
            >
              <Ionicons name="compass-outline" size={19} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.explorePrimaryText}>Explore Homes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.restoreSecondaryButton}
              onPress={restoreDemoNotifications}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={15} color="#64748b" style={{ marginRight: 6 }} />
              <Text style={styles.restoreSecondaryText}>Reset Demo Notifications</Text>
            </TouchableOpacity>
          </View>
        ) : filteredNotifications.length === 0 ? (
          /* State B: Active Filter has 0 Results */
          <View style={styles.filterEmptyContainer}>
            <View style={styles.filterEmptyIconWrap}>
              <Ionicons name="sparkles-outline" size={36} color="#94a3b8" />
            </View>
            <Text style={styles.filterEmptyTitle}>No Notifications in This Filter</Text>
            <Text style={styles.filterEmptySubtitle}>
              You have no active alerts matching this criteria right now.
            </Text>
            <TouchableOpacity
              style={styles.viewAllFilterButton}
              onPress={() => setActiveFilter('ALL')}
              activeOpacity={0.85}
            >
              <Text style={styles.viewAllFilterText}>View All Notifications</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* State C: Grouped Notification Cards */
          groupedNotifications.map((section) => (
            <View key={section.group} style={styles.groupSection}>
              <View style={styles.groupHeaderRow}>
                <Text style={styles.groupHeaderTitle}>{section.group}</Text>
                <View style={styles.groupCountPill}>
                  <Text style={styles.groupCountText}>{section.items.length}</Text>
                </View>
              </View>

              <View style={styles.cardList}>
                {section.items.map((notification) => {
                  const cfg = getCategoryConfig(notification.type);
                  const isUnread = !notification.is_read;
                  const property = notification.property;
                  const propertyImage =
                    property?.property_media?.[0]?.url ||
                    (property as any)?.imageUrl ||
                    (property as any)?.thumbnailUrl;

                  return (
                    <TouchableOpacity
                      key={notification.id}
                      style={[styles.cardContainer, isUnread && styles.cardContainerUnread]}
                      onPress={() => handlePressNotification(notification)}
                      activeOpacity={0.92}
                    >
                      {/* Top Meta Row */}
                      <View style={styles.cardHeaderRow}>
                        {/* Leading Category Squircle Icon */}
                        <View style={[styles.squircleIcon, { backgroundColor: cfg.bgColor }]}>
                          <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
                        </View>

                        {/* Title & Category Info */}
                        <View style={styles.cardHeaderTextCol}>
                          <View style={styles.cardTagRow}>
                            <View style={[styles.categoryBadge, { backgroundColor: cfg.badgeBg }]}>
                              <Text style={[styles.categoryBadgeText, { color: cfg.badgeText }]}>
                                {cfg.label}
                              </Text>
                            </View>

                            <Text style={styles.timeAgoText}>
                              {getRelativeTime(notification.created_at)}
                            </Text>

                            {/* Sapphire Glowing Unread Pip */}
                            {isUnread && (
                              <View style={styles.unreadPipContainer}>
                                <View style={styles.unreadPip} />
                              </View>
                            )}
                          </View>

                          <Text
                            style={[styles.notificationTitle, isUnread && styles.notificationTitleUnread]}
                            numberOfLines={2}
                          >
                            {notification.title}
                          </Text>
                        </View>

                        {/* Dismiss / Delete Button */}
                        <TouchableOpacity
                          style={styles.cardDismissButton}
                          onPress={() => handleConfirmDeleteSingle(notification)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close" size={16} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>

                      {/* Notification Body Text */}
                      {notification.body ? (
                        <Text style={styles.notificationBody} numberOfLines={3}>
                          {notification.body}
                        </Text>
                      ) : null}

                      {/* Embedded Mini Property Preview Card */}
                      {property && (
                        <View style={styles.propertyPreviewCard}>
                          {propertyImage ? (
                            <Image
                              source={{ uri: propertyImage }}
                              style={styles.propertyPreviewImage}
                            />
                          ) : (
                            <View style={[styles.propertyPreviewImage, styles.propertyImageFallback]}>
                              <Ionicons name="home" size={22} color="#94a3b8" />
                            </View>
                          )}

                          <View style={styles.propertyPreviewDetails}>
                            <Text style={styles.propertyPreviewTitle} numberOfLines={1}>
                              {property.title}
                            </Text>
                            <View style={styles.propertyPriceRow}>
                              <Text style={styles.propertyPreviewPrice}>
                                {formatPrice(property.price, property.list_type)}
                              </Text>
                              {property.address && (
                                <Text style={styles.propertyPreviewAddress} numberOfLines={1}>
                                  {' · ' + (property.address.split(',')[1] || property.address).trim()}
                                </Text>
                              )}
                            </View>
                          </View>

                          <View style={styles.viewHomeAction}>
                            <Text style={styles.viewHomeActionText}>View Home</Text>
                            <Ionicons name="chevron-forward" size={13} color="#2563eb" />
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  /* Header Styles */
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  unreadPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginRight: 5,
  },
  unreadPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  clearAllButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Horizontal Filter Bar */
  filterBarContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterCountBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  filterCountBadgeActive: {
    backgroundColor: '#334155',
  },
  filterCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterCountBadgeTextActive: {
    color: '#ffffff',
  },

  /* Scrollable Content */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  /* Group Chronological Sections */
  groupSection: {
    marginBottom: 20,
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  groupHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  groupCountPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  groupCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  cardList: {
    gap: 12,
  },

  /* Card Details */
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardContainerUnread: {
    borderColor: '#dbeafe',
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  squircleIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardHeaderTextCol: {
    flex: 1,
    paddingRight: 4,
  },
  cardTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeAgoText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  unreadPipContainer: {
    marginLeft: 8,
  },
  unreadPip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardDismissButton: {
    padding: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    lineHeight: 20,
  },
  notificationTitleUnread: {
    fontWeight: '700',
    color: '#0f172a',
  },
  notificationBody: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginTop: 8,
    paddingLeft: 56,
  },

  /* Mini Property Preview Card */
  propertyPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 8,
    marginTop: 10,
    marginLeft: 56,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  propertyPreviewImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  propertyImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  propertyPreviewDetails: {
    flex: 1,
    marginLeft: 10,
    marginRight: 6,
  },
  propertyPreviewTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  propertyPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyPreviewPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e11d48',
  },
  propertyPreviewAddress: {
    fontSize: 11,
    color: '#64748b',
    flexShrink: 1,
  },
  viewHomeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  viewHomeActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    marginRight: 2,
  },

  /* Apple-Grade Empty State (All Cleared) */
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  celebrateGlowRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d1fae5',
    ...Platform.select({
      ios: {
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  celebrateIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  explorePrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e11d48',
    paddingVertical: 13,
    paddingHorizontal: 26,
    borderRadius: 24,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#e11d48',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  explorePrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  restoreSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  restoreSecondaryText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },

  /* Filter Empty State */
  filterEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  filterEmptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterEmptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  filterEmptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  viewAllFilterButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  viewAllFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
});
