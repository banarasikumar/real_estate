import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPropertyById, checkIfSaved, toggleSavedProperty, createEnquiry, useAuth } from '@repo/api';

const FALLBACK_PROPERTY = {
  id: '1',
  title: 'Modern Luxury Penthouse with City Views',
  price: 850000,
  prop_type: 'APARTMENT',
  list_type: 'SALE',
  bedrooms: 3,
  bathrooms: 2,
  area_sqft: 2200,
  address: '1420 Ocean Avenue, Miami, FL',
  description:
    'Experience extraordinary luxury and panoramic city and skyline views from this stunning modern penthouse. Featuring expansive floor-to-ceiling windows, open-concept chef kitchen with Italian marble countertops, custom smart-home lighting, private elevator access, and a spacious wrap-around terrace.',
  property_media: [{ url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750' }],
};

export default function PropertyDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enquiryModalVisible, setEnquiryModalVisible] = useState(false);
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        const propData = await getPropertyById(id);
        if (propData) {
          setProperty(propData);
        } else {
          setProperty(FALLBACK_PROPERTY);
        }

        if (user) {
          const savedStatus = await checkIfSaved(user.id, id);
          setIsSaved(savedStatus);
        }
      } catch (error) {
        console.error('Error fetching property data:', error);
        setProperty(FALLBACK_PROPERTY);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, user]);

  const handleToggleSave = async () => {
    if (!user) {
      setIsSaved(!isSaved);
      return;
    }
    if (saving || !id) return;

    setSaving(true);
    try {
      const result = await toggleSavedProperty(user.id, id);
      if (result.success) {
        setIsSaved(result.isSaved);
      } else {
        setIsSaved(!isSaved);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendEnquiry = async () => {
    if (!enquiryMessage.trim()) {
      Alert.alert('Message Required', 'Please enter your message or questions for the agent.');
      return;
    }

    setSubmittingEnquiry(true);
    try {
      if (id) {
        await createEnquiry(id, enquiryMessage.trim());
      }
      setEnquiryModalVisible(false);
      setEnquiryMessage('');
      Alert.alert(
        'Enquiry Sent!',
        'Your enquiry has been delivered to the listing broker. You can track its status in the Enquiries tab.',
        [
          { text: 'OK' },
          { text: 'View Enquiries', onPress: () => router.push('/(tabs)/enquiries') },
        ]
      );
    } catch (err) {
      console.error('Error submitting enquiry:', err);
      Alert.alert('Error', 'Failed to submit enquiry. Please try again.');
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#e11d48" />
      </View>
    );
  }

  const prop = property || FALLBACK_PROPERTY;
  const imageUrl = prop.property_media?.[0]?.url || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750';
  const isRent = prop.list_type === 'RENT';
  const priceFormatted = isRent
    ? `$${prop.price?.toLocaleString() || '0'}/mo`
    : `$${prop.price?.toLocaleString() || '0'}`;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: prop.title || 'Property Details',
          headerBackTitle: 'Back',
          headerTintColor: '#0f172a',
          headerRight: () => (
            <TouchableOpacity onPress={handleToggleSave} disabled={saving} style={styles.headerButton}>
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={24}
                color={isSaved ? '#e11d48' : '#0f172a'}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: imageUrl }} style={styles.headerImage} />

        <View style={styles.content}>
          {/* Price & Tag */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{priceFormatted}</Text>
            {prop.prop_type && (
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{prop.prop_type}</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{prop.title}</Text>

          {prop.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.addressText}>{prop.address}</Text>
            </View>
          )}

          {/* Stats Box */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Ionicons name="bed-outline" size={20} color="#e11d48" style={{ marginBottom: 4 }} />
              <Text style={styles.statValue}>{prop.bedrooms || 0}</Text>
              <Text style={styles.statLabel}>Bedrooms</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="water-outline" size={20} color="#e11d48" style={{ marginBottom: 4 }} />
              <Text style={styles.statValue}>{prop.bathrooms || 0}</Text>
              <Text style={styles.statLabel}>Bathrooms</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="scan-outline" size={20} color="#e11d48" style={{ marginBottom: 4 }} />
              <Text style={styles.statValue}>{prop.area_sqft || 0}</Text>
              <Text style={styles.statLabel}>Sq Ft</Text>
            </View>
          </View>

          {/* Description Section */}
          <Text style={styles.sectionTitle}>About this Property</Text>
          <Text style={styles.description}>
            {prop.description || 'No description available for this property.'}
          </Text>

          {/* Agent Info Card */}
          <View style={styles.agentCard}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' }}
              style={styles.agentAvatar}
            />
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>Sarah Jenkins</Text>
              <Text style={styles.agentAgency}>Premier Partner Broker</Text>
              <View style={styles.agentRatingRow}>
                <Ionicons name="star" size={14} color="#f59e0b" />
                <Text style={styles.agentRatingText}>4.9 (42 reviews)</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() =>
            Linking.openURL(
              `whatsapp://send?phone=1234567890&text=Hi, I am interested in ${encodeURIComponent(
                prop.title
              )}`
            ).catch(() => Alert.alert('Notice', 'WhatsApp is not installed.'))
          }
        >
          <Ionicons name="logo-whatsapp" size={20} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.whatsappButtonText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.enquireButton}
          onPress={() => setEnquiryModalVisible(true)}
        >
          <Ionicons name="paper-plane-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.enquireButtonText}>Send Enquiry</Text>
        </TouchableOpacity>
      </View>

      {/* Send Enquiry Modal */}
      <Modal
        visible={enquiryModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEnquiryModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Inquire About Property</Text>
            <TouchableOpacity onPress={() => setEnquiryModalVisible(false)}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.modalPropName} numberOfLines={1}>
              {prop.title}
            </Text>
            <Text style={styles.modalInstruction}>
              Ask about tour availability, floor plans, lease conditions, or pricing details:
            </Text>

            <TextInput
              style={styles.enquiryInput}
              placeholder="Hi, I am interested in scheduling a viewing this week..."
              placeholderTextColor="#94a3b8"
              value={enquiryMessage}
              onChangeText={setEnquiryMessage}
              multiline
              numberOfLines={5}
            />

            <TouchableOpacity
              style={[styles.modalSubmitButton, submittingEnquiry && { opacity: 0.7 }]}
              onPress={handleSendEnquiry}
              disabled={submittingEnquiry}
            >
              <Text style={styles.modalSubmitText}>
                {submittingEnquiry ? 'Sending...' : 'Submit Enquiry'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerButton: { marginRight: 12 },
  scrollContent: { paddingBottom: 110 },
  headerImage: { width: '100%', height: 280, backgroundColor: '#e2e8f0' },
  content: { padding: 20 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  price: { fontSize: 26, color: '#e11d48', fontWeight: '800' },
  typeBadge: {
    backgroundColor: '#fff1f2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '700',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  addressText: { fontSize: 14, color: '#64748b' },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statBox: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: '#e2e8f0' },
  statValue: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#64748b' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 22, color: '#475569', marginBottom: 24 },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  agentAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 14 },
  agentInfo: { flex: 1 },
  agentName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  agentAgency: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  agentRatingRow: { flexDirection: 'row', alignItems: 'center' },
  agentRatingText: { fontSize: 12, color: '#475569', fontWeight: '600', marginLeft: 4 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -3 },
    flexDirection: 'row',
    gap: 12,
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  whatsappButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  enquireButton: {
    flex: 1.4,
    backgroundColor: '#e11d48',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  enquireButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalBody: { padding: 20 },
  modalPropName: { fontSize: 15, fontWeight: '700', color: '#e11d48', marginBottom: 8 },
  modalInstruction: { fontSize: 13, color: '#64748b', lineHeight: 18, marginBottom: 16 },
  enquiryInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#0f172a',
    height: 140,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalSubmitButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSubmitText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
