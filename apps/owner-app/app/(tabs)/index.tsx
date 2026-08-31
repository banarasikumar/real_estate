import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth, getOwnerProperties } from '@repo/api';

export default function HomeScreen() {
  const { session } = useAuth();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProperties() {
      if (session?.user?.id) {
        const data = await getOwnerProperties(session.user.id);
        setProperties(data);
      }
      setLoading(false);
    }
    loadProperties();
  }, [session?.user?.id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Owner Dashboard</Text>
      <Text style={styles.subtitle}>Manage your real estate properties</Text>

      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No properties found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardPrice}>${item.price.toLocaleString()}</Text>
            <Text style={styles.cardStatus}>{item.status}</Text>
          </View>
        )}
      />
    </View>
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardPrice: { fontSize: 16, color: 'green', marginVertical: 4 },
  cardStatus: { fontSize: 14, color: '#888', fontWeight: '500' },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 24 },
});
