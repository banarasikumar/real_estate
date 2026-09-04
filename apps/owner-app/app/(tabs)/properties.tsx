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
} from '@repo/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PropertiesScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadProperties = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const data = await getOwnerProperties(session.user.id);
        setProperties(data || []);
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
      Alert.alert('Error', err.message || 'Could not submit property.');
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
        setProperties((prev) =>
          prev.map((p) => (p.id === propertyId ? { ...p, status: willPublish ? 'PUBLISHED' : 'UNPUBLISHED' } : p))
        );
      } else {
        throw error || new Error('Failed to toggle property visibility');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const renderStatusBadge = (item: any) => {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Properties</Text>
          <Text style={styles.subtitle}>{properties.length} listings registered</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/create-property')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Properties Listed</Text>
            <Text style={styles.emptyText}>
              Tap the button below to publish your first property listing!
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/create-property')}
            >
              <Text style={styles.emptyButtonText}>Create Listing</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const firstImage = item.property_media?.[0]?.url;
          const isApproved = item.is_approved || item.status === 'PUBLISHED' || item.status === 'UNPUBLISHED';
          const isLive = item.status === 'PUBLISHED';
          const isBusy = updatingId === item.id;

          return (
            <View style={styles.card}>
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

                {/* Lifecycle Actions Bar */}
                <View style={styles.actionFooter}>
                  {/* Draft State: Publish Button */}
                  {item.status === 'DRAFT' && (
                    <TouchableOpacity
                      style={styles.publishActionBtn}
                      onPress={() => handlePublishDraft(item.id)}
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
                  {isApproved && item.status !== 'PENDING_APPROVAL' && item.status !== 'DRAFT' && item.status !== 'REJECTED' && (
                    <View style={styles.toggleRow}>
                      <View style={styles.toggleTextGroup}>
                        <Text style={styles.toggleTitle}>
                          {isLive ? 'Listing is Live' : 'Listing is Disabled'}
                        </Text>
                        <Text style={styles.toggleDesc}>
                          {isLive ? 'Visible to all buyers' : 'Hidden from searches (no re-approval needed)'}
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
    paddingVertical: 12,
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
  actionFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155', marginTop: 12 },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
