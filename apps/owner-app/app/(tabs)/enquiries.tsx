import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth, getOwnerEnquiries } from '@repo/api';

export default function EnquiriesScreen() {
  const { session } = useAuth();
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEnquiries() {
      if (session?.user?.id) {
        const data = await getOwnerEnquiries(session.user.id);
        setEnquiries(data);
      }
      setLoading(false);
    }
    loadEnquiries();
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
      <Text style={styles.title}>Customer Enquiries</Text>
      <Text style={styles.subtitle}>Leads for your properties</Text>

      <FlatList
        data={enquiries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
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
