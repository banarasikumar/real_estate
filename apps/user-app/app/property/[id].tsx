import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import {
  getPropertyById,
  checkIfSaved,
  toggleSavedProperty,
  createEnquiry,
  getOrCreateConversation,
  useAuth,
} from '@repo/api';
import { ALL_DEMO_PROPERTIES } from '../../data/mockProperties';
import { getEnrichedPropertyDetails, MediaCategory } from '../../types/propertyDetails';
import {
  PropertyHeroParallaxCarousel,
  FullScreenPhotoGalleryModal,
  InteractiveMortgageCalculator,
  TabbedMediaViewer,
  NeighborhoodScoresSection,
  TourBookingModal,
} from '../../components/property';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Modals state
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);
  const [tourBookingVisible, setTourBookingVisible] = useState(false);
  const [enquiryModalVisible, setEnquiryModalVisible] = useState(false);
  const [enquiryMessage, setEnquiryMessage] = useState('');
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

  // Parallax Scroll Value
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        // 1. Instant local demo listing lookup for 0ms latency
        const demoFound = ALL_DEMO_PROPERTIES.find((p) => p.id === id);
        if (demoFound) {
          setProperty(demoFound);
          setLoading(false);
        }

        // 2. Online database lookup (merges or overrides)
        const propData = await getPropertyById(id);
        if (propData) {
          setProperty(propData);
        } else if (!demoFound) {
          setProperty(FALLBACK_PROPERTY);
        }

        // 3. User saved favorites check
        if (user) {
          const savedStatus = await checkIfSaved(user.id, id);
          setIsSaved(savedStatus);
        }
      } catch (error) {
        console.error('Error fetching property data:', error);
        const demoFound = ALL_DEMO_PROPERTIES.find((p) => p.id === id);
        setProperty(demoFound || FALLBACK_PROPERTY);
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
        if (user?.id && (property as any)?.owner_id) {
          try {
            await getOrCreateConversation(id, user.id, (property as any).owner_id, enquiryMessage.trim());
          } catch (cErr) {
            console.warn('Could not auto-create conversation thread:', cErr);
          }
        }
      }
      setEnquiryModalVisible(false);
      setEnquiryMessage('');
      Alert.alert(
        'Enquiry Sent!',
        'Your message has been delivered to the premier partner agent. You can chat with them in real time in the Messages tab.',
        [
          { text: 'OK' },
          { text: 'Open Live Chat', onPress: () => router.push('/(tabs)/messages') },
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
        <Text style={styles.loadingText}>Loading luxury estate details...</Text>
      </View>
    );
  }

  const prop = property || FALLBACK_PROPERTY;
  const enriched = getEnrichedPropertyDetails(prop);
  const isRent = prop.list_type === 'RENT';
  const priceFormatted = isRent
    ? `$${prop.price?.toLocaleString() || '0'}/mo`
    : `$${prop.price?.toLocaleString() || '0'}`;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Parallax Photo Carousel with Glassmorphic Floating Nav Controls */}
        <PropertyHeroParallaxCarousel
          media={enriched.categorizedMedia}
          title={prop.title}
          price={prop.price}
          formattedPrice={priceFormatted}
          propertyId={id}
          isSaved={isSaved}
          onToggleSave={handleToggleSave}
          onOpenGallery={(idx: number) => {
            setGalleryInitialIndex(idx);
            setGalleryVisible(true);
          }}
          scrollY={scrollY}
        />

        {/* 2. Main Luxury Content Card */}
        <View style={styles.mainCard}>
          {/* Price & Tag */}
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>{isRent ? 'MONTHLY LEASE' : 'LISTING PRICE'}</Text>
              <Text style={styles.price}>{priceFormatted}</Text>
            </View>
            {prop.prop_type && (
              <View style={styles.typeBadge}>
                <Ionicons name="sparkles" size={13} color="#e11d48" style={{ marginRight: 4 }} />
                <Text style={styles.typeBadgeText}>
                  {prop.prop_type.replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{prop.title}</Text>

          {prop.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location" size={16} color="#e11d48" style={{ marginRight: 6 }} />
              <Text style={styles.addressText}>{prop.address}</Text>
            </View>
          )}

          {/* Quick Specs Container */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Ionicons name="bed-outline" size={22} color="#e11d48" style={{ marginBottom: 4 }} />
              <Text style={styles.statValue}>{prop.bedrooms || 0}</Text>
              <Text style={styles.statLabel}>Bedrooms</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="water-outline" size={22} color="#e11d48" style={{ marginBottom: 4 }} />
              <Text style={styles.statValue}>{prop.bathrooms || 0}</Text>
              <Text style={styles.statLabel}>Bathrooms</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="scan-outline" size={22} color="#e11d48" style={{ marginBottom: 4 }} />
              <Text style={styles.statValue}>{(prop.area_sqft || 2150).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Sq Ft</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="car-outline" size={22} color="#e11d48" style={{ marginBottom: 4 }} />
              <Text style={styles.statValue}>{enriched.parkingSpaces || 2}</Text>
              <Text style={styles.statLabel}>Parking</Text>
            </View>
          </View>

          {/* Special Offer or Verified Badge */}
          {prop.badge && (
            <View style={styles.badgeBanner}>
              <Ionicons name="shield-checkmark" size={16} color="#047857" style={{ marginRight: 6 }} />
              <Text style={styles.badgeBannerText}>{prop.badge}</Text>
            </View>
          )}

          {/* 3. Tabbed Media Viewer: [Photos | 2D Floor Plan | 3D Tour] */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>Media & Architectural Layout</Text>
            <TabbedMediaViewer
              categorizedMedia={enriched.categorizedMedia}
              floorPlan={enriched.floorPlan}
              virtualTour={enriched.virtualTour}
              onOpenGallery={(category: MediaCategory) => {
                const targetIdx = enriched.categorizedMedia.findIndex(
                  (m) => category === 'All' || m.category === category
                );
                setGalleryInitialIndex(Math.max(0, targetIdx));
                setGalleryVisible(true);
              }}
              onLaunchVirtualTour={(url: string) => {
                Linking.openURL(url).catch(() =>
                  Alert.alert('3D Virtual Tour', 'Could not open virtual tour link.')
                );
              }}
            />
          </View>

          {/* 4. Description & Key Amenities */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>About this Property</Text>
            <Text style={styles.description}>
              {prop.description ||
                'Experience the pinnacle of luxury living in this custom-designed architectural residence. Boasting floor-to-ceiling glass, custom imported millwork, private elevator access, and a spacious wrap-around terrace.'}
            </Text>

            {/* Key Luxury Amenities Pills */}
            <View style={styles.amenitiesGrid}>
              {[
                { icon: 'snow-outline', label: 'Central AC' },
                { icon: 'shield-checkmark-outline', label: 'Smart Security' },
                { icon: 'fitness-outline', label: 'Private Gym' },
                { icon: 'flame-outline', label: 'Cozy Fireplace' },
                { icon: 'sunny-outline', label: 'Private Terrace' },
                { icon: 'wifi-outline', label: 'High-speed Fiber' },
              ].map((item, idx) => (
                <View key={idx} style={styles.amenityChip}>
                  <Ionicons name={item.icon as any} size={15} color="#475569" style={{ marginRight: 6 }} />
                  <Text style={styles.amenityChipText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 5. Interactive Mortgage / Rental Payment Calculator */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>Monthly Payment & Expenses</Text>
            <InteractiveMortgageCalculator property={prop} />
          </View>

          {/* 6. Neighborhood Scores & GreatSchools Ratings */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>Neighborhood & Local Schools</Text>
            <NeighborhoodScoresSection
              neighborhood={enriched.neighborhood}
              schools={enriched.schools}
              address={prop.address}
              city={prop.city}
              onExploreMap={() => router.push('/(tabs)')}
            />
          </View>

          {/* 7. Premier Partner Agent Profile Card */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionHeader}>Listing Representative</Text>
            <View style={styles.agentCard}>
              <Image source={{ uri: enriched.agent.avatarUrl }} style={styles.agentAvatar} />
              <View style={styles.agentInfo}>
                <View style={styles.agentNameRow}>
                  <Text style={styles.agentName}>{enriched.agent.name}</Text>
                  <View style={styles.superAgentPill}>
                    <Ionicons name="checkmark-circle" size={12} color="#ffffff" style={{ marginRight: 3 }} />
                    <Text style={styles.superAgentText}>Premier Partner</Text>
                  </View>
                </View>
                <Text style={styles.agentAgency}>{enriched.agent.agency}</Text>
                <View style={styles.agentRatingRow}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.agentRatingText}>
                    {enriched.agent.rating} ({enriched.agent.reviewCount} reviews) • {enriched.agent.license}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Fixed Docked Bottom Action Bar */}
      <View style={styles.dockedFooter}>
        <TouchableOpacity
          style={styles.dockedIconButton}
          onPress={() =>
            Linking.openURL(
              `whatsapp://send?phone=1234567890&text=Hi, I am interested in ${encodeURIComponent(
                prop.title
              )}`
            ).catch(() => Alert.alert('Notice', 'WhatsApp is not installed.'))
          }
        >
          <Ionicons name="logo-whatsapp" size={20} color="#16a34a" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dockedSecondaryButton}
          onPress={() => setEnquiryModalVisible(true)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={17} color="#0f172a" style={{ marginRight: 6 }} />
          <Text style={styles.dockedSecondaryText}>Contact</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dockedPrimaryButton}
          onPress={() => setTourBookingVisible(true)}
        >
          <Ionicons name="calendar-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.dockedPrimaryText}>Request a Tour</Text>
        </TouchableOpacity>
      </View>

      {/* Fullscreen Photo Gallery Lightbox */}
      <FullScreenPhotoGalleryModal
        visible={galleryVisible}
        onClose={() => setGalleryVisible(false)}
        media={enriched.categorizedMedia}
        initialIndex={galleryInitialIndex}
      />

      {/* Tour Booking Scheduling Sheet Modal */}
      <TourBookingModal
        visible={tourBookingVisible}
        onClose={() => setTourBookingVisible(false)}
        propertyId={id || 'prop-1'}
        propertyTitle={prop.title}
        agentName={enriched.agent.name}
        agentAvatarUrl={enriched.agent.avatarUrl}
        agentAgency={enriched.agent.agency}
        ownerId={(prop as any)?.owner_id}
        onChatWithAgent={() => {
          setTourBookingVisible(false);
          router.push('/(tabs)/messages');
        }}
      />

      {/* Send Message / Enquiry Modal */}
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
              Send a direct inquiry to {enriched.agent.name} regarding lease conditions, private viewing, or pricing negotiations:
            </Text>

            <TextInput
              style={styles.enquiryInput}
              placeholder="Hi Sarah, I am interested in scheduling a viewing this week..."
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  price: {
    fontSize: 30,
    color: '#0f172a',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  typeBadgeText: {
    color: '#e11d48',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    lineHeight: 28,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  addressText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#e2e8f0',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
  },
  badgeBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
  },
  sectionWrap: {
    marginTop: 26,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    marginBottom: 16,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  amenityChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  agentAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    marginRight: 14,
    backgroundColor: '#e2e8f0',
  },
  agentInfo: {
    flex: 1,
  },
  agentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  superAgentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e11d48',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  superAgentText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  agentAgency: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 4,
  },
  agentRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentRatingText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginLeft: 4,
  },
  dockedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dockedIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockedSecondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    height: 48,
    borderRadius: 24,
  },
  dockedSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dockedPrimaryButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e11d48',
    height: 48,
    borderRadius: 24,
    shadowColor: '#e11d48',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  dockedPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    padding: 20,
  },
  modalPropName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#e11d48',
    marginBottom: 8,
  },
  modalInstruction: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 19,
    marginBottom: 16,
  },
  enquiryInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#0f172a',
    height: 140,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalSubmitButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
