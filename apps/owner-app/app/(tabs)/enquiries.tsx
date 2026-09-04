import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useAuth, getOwnerEnquiries } from '@repo/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EnquiriesScreen() {
  const { session } = useAuth();
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEnquiries = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const data = await getOwnerEnquiries(session.user.id);
        setEnquiries(data || []);
      } catch (e) {
        console.error(e);
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.user?.id]);

  useEffect(() => {
    loadEnquiries();
  }, [loadEnquiries]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEnquiries();
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
      <Text style={styles.title}>Customer Enquiries</Text>
      <Text style={styles.subtitle}>Direct leads & questions for your listings</Text>

      <FlatList
        data={enquiries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No enquiries yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardMessage}>"{item.message}"</Text>
            {item.properties?.title && (
              <Text style={styles.cardProperty}>Property: {item.properties.title}</Text>
            )}
            <Text style={styles.cardDate}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 16 },
  list: { paddingBottom: 16 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: 'green',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardMessage: { fontSize: 16, fontStyle: 'italic', marginBottom: 8, color: '#333' },
  cardProperty: { fontSize: 14, fontWeight: '600', color: '#555' },
  cardDate: { fontSize: 12, color: '#888', marginTop: 8 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 24 },
});
