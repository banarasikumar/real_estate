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
} from 'react-native';
import { useAuth, getOwnerProperties } from '@repo/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PropertiesScreen() {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return '#059669';
      case 'PENDING_APPROVAL':
        return '#d97706';
      case 'REJECTED':
        return '#dc2626';
      default:
        return '#64748b';
    }
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
          return (
            <View style={styles.card}>
              {firstImage ? (
                <Image source={{ uri: firstImage }} style={styles.cardImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="image-outline" size={32} color="#94a3b8" />
                </View>
              )}
              <View style={styles.cardBody}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(item.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColor(item.status) },
                      ]}
                    >
                      {item.status.replace('_', ' ')}
                    </Text>
                  </View>
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
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardImage: { width: '100%', height: 160, backgroundColor: '#e2e8f0' },
  placeholderImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { padding: 14 },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  typeTag: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardPrice: { fontSize: 17, fontWeight: '800', color: '#059669', marginBottom: 4 },
  cardAddress: { fontSize: 13, color: '#64748b' },
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
