import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useAuth, getOwnerProperties } from '@repo/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProperties = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const data = await getOwnerProperties(session.user.id);
        setProperties(data || []);
      } catch (e) {
        console.error(e);
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

  const publishedCount = properties.filter((p) => p.status === 'PUBLISHED').length;
  const pendingCount = properties.filter((p) => p.status === 'PENDING_APPROVAL').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Owner Dashboard</Text>
          <Text style={styles.subtitle}>Portfolio overview & quick actions</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/create-property')}
        >
          <Ionicons name="add" size={18} color="#ffffff" />
          <Text style={styles.addButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{properties.length}</Text>
          <Text style={styles.statLabel}>Total Listings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: '#059669' }]}>{publishedCount}</Text>
          <Text style={styles.statLabel}>Published</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: '#d97706' }]}>{pendingCount}</Text>
          <Text style={styles.statLabel}>In Review</Text>
        </View>
      </View>

      {/* Recent Properties */}
      <Text style={styles.sectionTitle}>Recent Properties</Text>
      <FlatList
        data={properties.slice(0, 5)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No properties added yet.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(tabs)/create-property')}
            >
              <Text style={styles.emptyBtnText}>Create Listing</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.status === 'PUBLISHED'
                        ? '#d1fae5'
                        : item.status === 'PENDING_APPROVAL'
                        ? '#fef3c7'
                        : '#fee2e2',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        item.status === 'PUBLISHED'
                          ? '#065f46'
                          : item.status === 'PENDING_APPROVAL'
                          ? '#92400e'
                          : '#991b1b',
                    },
                  ]}
                >
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
            <Text style={styles.cardPrice}>${item.price.toLocaleString()}</Text>
            {item.address ? <Text style={styles.cardAddress}>{item.address}</Text> : null}
          </View>
        )}
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
    paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#64748b', fontSize: 14, marginBottom: 12 },
  emptyBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', flex: 1, marginRight: 8 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  cardPrice: { fontSize: 16, fontWeight: '800', color: '#059669', marginBottom: 4 },
  cardAddress: { fontSize: 13, color: '#64748b' },
});
