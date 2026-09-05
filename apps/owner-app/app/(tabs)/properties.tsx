import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
} from 'react-native';
import {
  useAuth,
  getOwnerProperties,
  submitPropertyForApproval,
  togglePropertyPublish,
  softDeleteProperty,
  restoreProperty,
  deletePropertyPermanently,
} from '@repo/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PropertiesScreen() {
  const { session } = useAuth();
  const router = useRouter();

  // Tab State: 'active' | 'trash'
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');

  // Properties Lists
  const [activeProperties, setActiveProperties] = useState<any[]>([]);
  const [trashProperties, setTrashProperties] = useState<any[]>([]);

  // Loading & In-Flight Status
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const activeCount = activeProperties.length;
  const trashCount = trashProperties.length;

  const loadProperties = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const [activeData, trashData] = await Promise.all([
          getOwnerProperties(session.user.id, { showDeleted: false }),
          getOwnerProperties(session.user.id, { showDeleted: true }),
        ]);
        setActiveProperties(activeData || []);
        setTrashProperties(trashData || []);
      } catch (e) {
        console.error('Error fetching owner properties:', e);
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.user?.id]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProperties();
  };

  // Submit Draft to Pending Approval
  const handlePublishDraft = async (propertyId: string) => {
    try {
      setUpdatingId(propertyId);
      const { success, error } = await submitPropertyForApproval(propertyId);
      if (success) {
        Alert.alert(
          'Submitted for Review',
          'Your property has been submitted to the Admin team for review.'
        );
        loadProperties();
      } else {
        throw error || new Error('Failed to submit for approval');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not submit property.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle Live / Disabled for approved properties
  const handleTogglePublish = async (propertyId: string, currentStatus: string) => {
    const willPublish = currentStatus !== 'PUBLISHED';
    try {
      setUpdatingId(propertyId);
      const { success, error } = await togglePropertyPublish(propertyId, willPublish);
      if (success) {
        setActiveProperties((prev) =>
          prev.map((p) =>
            p.id === propertyId ? { ...p, status: willPublish ? 'PUBLISHED' : 'UNPUBLISHED' } : p
          )
        );
      } else {
        throw error || new Error('Failed to toggle property visibility');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Soft Delete handler (Move to Trash for 30 Days)
  const handleSoftDelete = async (propertyId: string) => {
    try {
      setUpdatingId(propertyId);
      const { success, error } = await softDeleteProperty(propertyId);
      if (success) {
        Alert.alert(
          'Moved to Trash',
          'This listing has been moved to Trash. It will be retained for 30 days before permanent deletion.'
        );
        loadProperties();
      } else {
        throw error || new Error('Failed to move property to Trash');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not move property to Trash.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Secondary confirmation for permanent deletion
  const confirmPermanentDelete = (propertyId: string) => {
    Alert.alert(
      'Permanently Delete Now?',
      'This cannot be undone. All property records and uploaded photos will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdatingId(propertyId);
              const { success, error } = await deletePropertyPermanently(propertyId);
              if (success) {
                Alert.alert('Deleted', 'Property has been permanently deleted.');
                loadProperties();
              } else {
                throw error || new Error('Failed to permanently delete property');
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not delete property.');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ]
    );
  };

  // Delete Action Press for Active Listings
  const handleDeleteActivePress = (item: any) => {
    Alert.alert(
      'Delete Listing',
      `Choose deletion option for "${item.title || 'this listing'}":`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Trash (30 Days)',
          onPress: () => handleSoftDelete(item.id),
        },
        {
          text: 'Permanently Delete Now',
          style: 'destructive',
          onPress: () => confirmPermanentDelete(item.id),
        },
      ]
    );
  };

  // Restore property from Trash
  const handleRestoreProperty = async (propertyId: string) => {
    try {
      setUpdatingId(propertyId);
      const { success, error } = await restoreProperty(propertyId);
      if (success) {
        Alert.alert('Listing Restored!', 'It is now in Under Admin Review.');
        loadProperties();
      } else {
        throw error || new Error('Failed to restore listing');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not restore listing.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Calculate days remaining before permanent purge
  const calculateDaysRemaining = (deletedAt?: string | null) => {
    if (!deletedAt) return 30;
    const elapsedMs = Date.now() - new Date(deletedAt).getTime();
    const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - elapsedDays);
  };

  const renderStatusBadge = (item: any) => {
    // If viewing trash or item is soft-deleted
    if (activeTab === 'trash' || item.deleted_at) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
          <Ionicons name="trash" size={12} color="#dc2626" />
          <Text style={[styles.statusBadgeText, { color: '#dc2626' }]}>
            In Trash
          </Text>
        </View>
      );
    }

    const { status, is_approved } = item;

    if (status === 'PUBLISHED') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
          <Ionicons name="checkmark-circle" size={12} color="#059669" />
          <Text style={[styles.statusBadgeText, { color: '#059669' }]}>
            Approved · Live
          </Text>
        </View>
      );
    }

    if (status === 'UNPUBLISHED' && is_approved) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9' }]}>
          <Ionicons name="pause-circle" size={12} color="#64748b" />
          <Text style={[styles.statusBadgeText, { color: '#64748b' }]}>
            Approved · Disabled
          </Text>
        </View>
      );
    }

    if (status === 'PENDING_APPROVAL') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
          <Ionicons name="time" size={12} color="#d97706" />
          <Text style={[styles.statusBadgeText, { color: '#d97706' }]}>
            Under Admin Review
          </Text>
        </View>
      );
    }

    if (status === 'REJECTED') {
      return (
        <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
          <Ionicons name="close-circle" size={12} color="#dc2626" />
          <Text style={[styles.statusBadgeText, { color: '#dc2626' }]}>
            Rejected
          </Text>
        </View>
      );
    }

    // Default: DRAFT
    return (
      <View style={[styles.statusBadge, { backgroundColor: '#e2e8f0' }]}>
        <Ionicons name="document-text" size={12} color="#475569" />
        <Text style={[styles.statusBadgeText, { color: '#475569' }]}>
          Draft
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const displayedProperties = activeTab === 'active' ? activeProperties : trashProperties;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Properties</Text>
          <Text style={styles.subtitle}>
            {activeTab === 'active'
              ? `${activeCount} active listing${activeCount === 1 ? '' : 's'}`
              : `${trashCount} in trash (30-day retention)`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/create-property')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Filter Chips */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'active' && styles.filterChipActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="layers-outline"
            size={15}
            color={activeTab === 'active' ? '#059669' : '#64748b'}
          />
          <Text
            style={[styles.filterChipText, activeTab === 'active' && styles.filterChipTextActive]}
          >
            Active Listings ({activeCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'trash' && styles.filterChipTrashActive]}
          onPress={() => setActiveTab('trash')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="trash-outline"
            size={15}
            color={activeTab === 'trash' ? '#dc2626' : '#64748b'}
          />
          <Text
            style={[
              styles.filterChipText,
              activeTab === 'trash' && styles.filterChipTrashTextActive,
            ]}
          >
            Trash ({trashCount})
          </Text>
          {trashCount > 0 && (
            <View
              style={[
                styles.filterBadge,
                activeTab === 'trash' && styles.filterBadgeTrashActive,
              ]}
            >
              <Text
                style={[
                  styles.filterBadgeText,
                  activeTab === 'trash' && styles.filterBadgeTrashTextActive,
                ]}
              >
                {trashCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Property List */}
      <FlatList
        data={displayedProperties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
        }
        ListEmptyComponent={
          activeTab === 'active' ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="home-outline" size={40} color="#059669" />
              </View>
              <Text style={styles.emptyTitle}>No Active Properties</Text>
              <Text style={styles.emptyText}>
                Tap the button below to publish your first property listing!
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/create-property')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.emptyButtonText}>Create Listing</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="trash-outline" size={40} color="#dc2626" />
              </View>
              <Text style={styles.emptyTitle}>Trash is Empty</Text>
              <Text style={styles.emptyText}>
                Deleted properties will be retained here for 30 days before being permanently removed.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const firstImage = item.property_media?.[0]?.url;
          const isApproved =
            item.is_approved || item.status === 'PUBLISHED' || item.status === 'UNPUBLISHED';
          const isLive = item.status === 'PUBLISHED';
          const isBusy = updatingId === item.id;
          const isTrash = activeTab === 'trash' || !!item.deleted_at;

          return (
            <View style={[styles.card, isTrash && styles.trashCard]}>
              {firstImage ? (
                <Image source={{ uri: firstImage }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="image-outline" size={36} color="#94a3b8" />
                  <Text style={styles.placeholderText}>No photo available</Text>
                </View>
              )}

              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  {renderStatusBadge(item)}
                  <Text style={styles.typeTag}>
                    {item.prop_type} • {item.list_type}
                  </Text>
                </View>

                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>

                <Text style={styles.cardPrice}>
                  ${item.price?.toLocaleString()}
                </Text>

                {item.address ? (
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {item.address}
                  </Text>
                ) : null}

                {/* Expiration Warning text for Trash Cards */}
                {isTrash && (
                  <View style={styles.expirationNotice}>
                    <Ionicons name="time-outline" size={15} color="#b91c1c" />
                    <Text style={styles.expirationNoticeText}>
                      {calculateDaysRemaining(item.deleted_at)} days left before permanent deletion
                    </Text>
                  </View>
                )}

                {/* Action Footer */}
                <View style={styles.actionFooter}>
                  {isTrash ? (
                    /* Trash Card Actions: Restore & Permanently Delete */
                    <View style={styles.trashActionsRow}>
                      <TouchableOpacity
                        style={styles.restoreButton}
                        onPress={() => handleRestoreProperty(item.id)}
                        activeOpacity={0.7}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#059669" />
                        ) : (
                          <>
                            <Ionicons name="refresh-outline" size={16} color="#059669" />
                            <Text style={styles.restoreButtonText}>Restore</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.permanentDeleteButton}
                        onPress={() => confirmPermanentDelete(item.id)}
                        activeOpacity={0.7}
                        disabled={isBusy}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#dc2626" />
                        ) : (
                          <>
                            <Ionicons name="trash-bin-outline" size={16} color="#dc2626" />
                            <Text style={styles.permanentDeleteButtonText}>Permanently Delete</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Active Card Actions */
                    <View style={styles.activeCardFooter}>
                      {/* Draft State: Submit for Approval Button */}
                      {item.status === 'DRAFT' && (
                        <TouchableOpacity
                          style={styles.publishActionBtn}
                          onPress={() => handlePublishDraft(item.id)}
                          activeOpacity={0.7}
                          disabled={isBusy}
                        >
                          {isBusy ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <>
                              <Ionicons name="paper-plane-outline" size={15} color="#fff" />
                              <Text style={styles.publishActionBtnText}>Submit for Approval</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {/* Pending Approval notice */}
                      {item.status === 'PENDING_APPROVAL' && (
                        <View style={styles.reviewNotice}>
                          <Ionicons name="information-circle-outline" size={16} color="#d97706" />
                          <Text style={styles.reviewNoticeText}>
                            Waiting for Admin verification before buyers can view
                          </Text>
                        </View>
                      )}

                      {/* Approved: Publish / Disable Toggle */}
                      {isApproved &&
                        item.status !== 'PENDING_APPROVAL' &&
                        item.status !== 'DRAFT' &&
                        item.status !== 'REJECTED' && (
                          <View style={styles.toggleRow}>
                            <View style={styles.toggleTextGroup}>
                              <Text style={styles.toggleTitle}>
                                {isLive ? 'Listing is Live' : 'Listing is Disabled'}
                              </Text>
                              <Text style={styles.toggleDesc}>
                                {isLive
                                  ? 'Visible to all buyers'
                                  : 'Hidden from searches (no re-approval needed)'}
                              </Text>
                            </View>
                            <Switch
                              value={isLive}
                              onValueChange={() => handleTogglePublish(item.id, item.status)}
                              trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                              thumbColor={isLive ? '#059669' : '#94a3b8'}
                              disabled={isBusy}
                            />
                          </View>
                        )}

                      {/* Dedicated Edit & Delete Buttons */}
                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          style={styles.cardEditBtn}
                          onPress={() => router.push(('/edit-property/' + item.id) as any)}
                          activeOpacity={0.7}
                          disabled={isBusy}
                        >
                          <Ionicons name="create-outline" size={16} color="#0f172a" />
                          <Text style={styles.cardEditBtnText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.cardDeleteBtn}
                          onPress={() => handleDeleteActivePress(item)}
                          activeOpacity={0.7}
                          disabled={isBusy}
                        >
                          <Ionicons name="trash-outline" size={16} color="#dc2626" />
                          <Text style={styles.cardDeleteBtnText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Segmented Filter Bar
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  filterChipTrashActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#dc2626',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  filterChipTrashTextActive: {
    color: '#dc2626',
    fontWeight: '700',
  },
  filterBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeTrashActive: {
    backgroundColor: '#fee2e2',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterBadgeTrashTextActive: {
    color: '#dc2626',
  },

  // List & Cards
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  trashCard: {
    borderColor: '#fecaca',
    backgroundColor: '#fffdfd',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#e2e8f0',
  },
  placeholderImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  placeholderText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  cardBody: { padding: 16 },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  typeTag: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardPrice: { fontSize: 18, fontWeight: '800', color: '#059669', marginBottom: 4 },
  cardAddress: { fontSize: 13, color: '#64748b', marginBottom: 12 },

  // Expiration Notice in Trash
  expirationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 12,
  },
  expirationNoticeText: {
    fontSize: 12,
    color: '#b91c1c',
    fontWeight: '600',
    flex: 1,
  },

  // Action Footer
  actionFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  activeCardFooter: {
    gap: 10,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
  },
  cardEditBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  cardDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
  },
  cardDeleteBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  publishActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  publishActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  reviewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  reviewNoticeText: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '500',
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTextGroup: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  toggleDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },

  // Trash Card Actions
  trashActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  restoreButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  restoreButtonText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  permanentDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  permanentDeleteButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty States
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginTop: 4 },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 18,
    gap: 6,
  },
  emptyButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
