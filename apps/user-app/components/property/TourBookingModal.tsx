import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { createEnquiry, getOrCreateConversation, useAuth } from '@repo/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type TourType = 'IN_PERSON' | 'VIDEO';

export interface TourBookingModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle?: string;
  agentName?: string;
  agentAvatarUrl?: string;
  agentAgency?: string;
  ownerId?: string;
  onTourBooked?: (bookingData: {
    tourType: TourType;
    date: string;
    timeSlot: string;
    notes?: string;
  }) => void;
  onChatWithAgent?: () => void;
}

const TIME_SLOTS = ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '5:00 PM'];

interface DayOption {
  id: string;
  dayOfWeek: string;
  dayNum: number;
  month: string;
  fullDateStr: string;
}

export const TourBookingModal: React.FC<TourBookingModalProps> = ({
  visible,
  onClose,
  propertyId,
  propertyTitle = 'Luxury Architectural Residence',
  agentName = 'Sarah Jenkins',
  agentAvatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=85',
  agentAgency = 'Premier Partner Luxury Estates',
  ownerId,
  onTourBooked,
  onChatWithAgent,
}) => {
  const router = useRouter();
  const { user } = useAuth();

  const [tourType, setTourType] = useState<TourType>('IN_PERSON');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(TIME_SLOTS[1]); // default: 11:00 AM
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate 7 upcoming days
  const upcomingDays: DayOption[] = useMemo(() => {
    const days: DayOption[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayOfWeek =
        i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const fullDateStr = d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        id,
        dayOfWeek,
        dayNum,
        month,
        fullDateStr,
      });
    }
    return days;
  }, []);

  const [selectedDayId, setSelectedDayId] = useState<string>(upcomingDays[0]?.id || '');

  const selectedDay = useMemo(() => {
    return upcomingDays.find((d) => d.id === selectedDayId) || upcomingDays[0];
  }, [upcomingDays, selectedDayId]);

  const handleResetAndClose = () => {
    setIsConfirmed(false);
    setLoading(false);
    setErrorMessage(null);
    setNotes('');
    onClose();
  };

  const handleBookTour = async () => {
    setLoading(true);
    setErrorMessage(null);

    const tourLabel = tourType === 'IN_PERSON' ? 'In-Person Tour' : 'Live Video Walkthrough';
    const enquiryMessage =
      `[TOUR REQUEST - ${tourLabel}]\n` +
      `Property: ${propertyTitle}\n` +
      `Date: ${selectedDay?.fullDateStr || 'Upcoming'}\n` +
      `Time Slot: ${selectedTimeSlot}\n` +
      (notes.trim() ? `Notes: ${notes.trim()}\n` : '');

    try {
      const res = await createEnquiry(propertyId, enquiryMessage, user?.id || null, ownerId || null);

      if (user?.id && ownerId) {
        try {
          await getOrCreateConversation(propertyId, user.id, ownerId, enquiryMessage);
        } catch (convErr) {
          console.warn('Could not initialize conversation:', convErr);
        }
      }

      if (res && res.success === false && res.error) {
        throw res.error;
      }

      onTourBooked?.({
        tourType,
        date: selectedDay?.fullDateStr || selectedDayId,
        timeSlot: selectedTimeSlot,
        notes: notes.trim() || undefined,
      });

      setIsConfirmed(true);
    } catch (err: any) {
      console.error('Error booking tour:', err);
      setErrorMessage(err?.message || 'Failed to submit tour request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = () => {
    handleResetAndClose();
    if (onChatWithAgent) {
      onChatWithAgent();
    } else {
      router.push('/(tabs)/messages');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleResetAndClose}
    >
      <View style={styles.backdropOverlay}>
        <TouchableOpacity
          style={styles.backdropDismissArea}
          activeOpacity={1}
          onPress={handleResetAndClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.bottomSheetCard}
        >
          <SafeAreaView edges={['bottom']} style={styles.sheetSafeContent}>
            {/* iOS Pull Down Pill Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.sheetDragHandle} />
            </View>

            {/* If Confirmed: Celebratory Confirmation View */}
            {isConfirmed ? (
              <View style={styles.confirmedContainer}>
                {/* Celebratory Icon */}
                <View style={styles.celebrateOuterRing}>
                  <View style={styles.celebrateInnerCircle}>
                    <Ionicons name="checkmark" size={38} color="#ffffff" />
                  </View>
                </View>

                <Text style={styles.confirmedTitle}>Tour Scheduled!</Text>
                <Text style={styles.confirmedSubtitle}>
                  Your appointment request has been confirmed with {agentName}.
                </Text>

                {/* Booking Summary Card */}
                <View style={styles.confirmationSummaryCard}>
                  <View style={styles.summaryPropertyRow}>
                    <MaterialCommunityIcons name="home-city-outline" size={20} color="#0f172a" />
                    <Text style={styles.summaryPropertyTitle} numberOfLines={1}>
                      {propertyTitle}
                    </Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryDetailsGrid}>
                    <View style={styles.summaryDetailItem}>
                      <Text style={styles.summaryDetailLabel}>TOUR FORMAT</Text>
                      <View style={styles.summaryDetailValueRow}>
                        <Ionicons
                          name={tourType === 'IN_PERSON' ? 'walk' : 'videocam'}
                          size={15}
                          color="#0284c7"
                        />
                        <Text style={styles.summaryDetailValueText}>
                          {tourType === 'IN_PERSON' ? 'In-Person Tour' : 'Live Video'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.summaryDetailItem}>
                      <Text style={styles.summaryDetailLabel}>DATE & TIME</Text>
                      <View style={styles.summaryDetailValueRow}>
                        <Ionicons name="calendar-outline" size={15} color="#059669" />
                        <Text style={styles.summaryDetailValueText}>
                          {selectedDay?.dayOfWeek}, {selectedTimeSlot}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.summaryDivider} />

                  {/* Agent Info in Summary */}
                  <View style={styles.summaryAgentRow}>
                    <Image source={{ uri: agentAvatarUrl }} style={styles.summaryAgentAvatar} />
                    <View style={styles.summaryAgentInfo}>
                      <Text style={styles.summaryAgentName}>{agentName}</Text>
                      <Text style={styles.summaryAgentAgency}>{agentAgency}</Text>
                    </View>
                    <View style={styles.summaryStatusPill}>
                      <Text style={styles.summaryStatusText}>Pending Confirmation</Text>
                    </View>
                  </View>
                </View>

                {/* Confirmation Notice */}
                <View style={styles.calendarNoticeBox}>
                  <Ionicons name="mail-unread-outline" size={18} color="#0284c7" />
                  <Text style={styles.calendarNoticeText}>
                    A calendar invite and location details have been dispatched to your verified account email.
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.confirmationActionsRow}>
                  <TouchableOpacity
                    style={styles.chatAgentPrimaryButton}
                    onPress={handleOpenChat}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={18}
                      color="#ffffff"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.chatAgentPrimaryText}>Chat with Agent</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.doneSecondaryButton}
                    onPress={handleResetAndClose}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.doneSecondaryText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* Booking Form View */
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.formScrollContent}
              >
                {/* Header Row with Close */}
                <View style={styles.sheetHeader}>
                  <View>
                    <Text style={styles.sheetMainTitle}>Schedule a Tour</Text>
                    <Text style={styles.sheetSubTitle} numberOfLines={1}>
                      {propertyTitle}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleResetAndClose}
                    style={styles.sheetCloseButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={22} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                {/* Error Banner if any */}
                {errorMessage && (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={18} color="#e11d48" />
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                  </View>
                )}

                {/* 1. Tour Type Segmented Control */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>TOUR TYPE</Text>
                  <View style={styles.segmentedContainer}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.segmentButton,
                        tourType === 'IN_PERSON' && styles.segmentButtonActive,
                      ]}
                      onPress={() => setTourType('IN_PERSON')}
                    >
                      <Ionicons
                        name="walk"
                        size={17}
                        color={tourType === 'IN_PERSON' ? '#0f172a' : '#64748b'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.segmentButtonText,
                          tourType === 'IN_PERSON' && styles.segmentButtonTextActive,
                        ]}
                      >
                        In-Person Tour
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[
                        styles.segmentButton,
                        tourType === 'VIDEO' && styles.segmentButtonActive,
                      ]}
                      onPress={() => setTourType('VIDEO')}
                    >
                      <Ionicons
                        name="videocam"
                        size={17}
                        color={tourType === 'VIDEO' ? '#0f172a' : '#64748b'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.segmentButtonText,
                          tourType === 'VIDEO' && styles.segmentButtonTextActive,
                        ]}
                      >
                        Live Video Walkthrough
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.tourTypeDescription}>
                    {tourType === 'IN_PERSON'
                      ? '🚶 Meet with the listing agent on-site for a private 45-minute tour.'
                      : '📹 High-definition live video walkthrough with real-time room Q&A.'}
                  </Text>
                </View>

                {/* 2. Horizontal Scrollable Date Picker Row for Next 7 Days */}
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionLabelRow}>
                    <Text style={styles.sectionLabel}>SELECT DATE</Text>
                    <Text style={styles.selectedDateSub}>
                      {selectedDay ? selectedDay.fullDateStr : ''}
                    </Text>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.datePickerScroll}
                  >
                    {upcomingDays.map((day) => {
                      const isSelected = day.id === selectedDayId;
                      return (
                        <TouchableOpacity
                          key={day.id}
                          activeOpacity={0.8}
                          style={[styles.dateCard, isSelected && styles.dateCardActive]}
                          onPress={() => setSelectedDayId(day.id)}
                        >
                          <Text
                            style={[
                              styles.dateCardDayOfWeek,
                              isSelected && styles.dateCardDayOfWeekActive,
                            ]}
                          >
                            {day.dayOfWeek}
                          </Text>
                          <Text
                            style={[
                              styles.dateCardDayNum,
                              isSelected && styles.dateCardDayNumActive,
                            ]}
                          >
                            {day.dayNum}
                          </Text>
                          <Text
                            style={[
                              styles.dateCardMonth,
                              isSelected && styles.dateCardMonthActive,
                            ]}
                          >
                            {day.month}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 3. Time Slot Pills */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>SELECT TIME SLOT</Text>
                  <View style={styles.timeSlotsGrid}>
                    {TIME_SLOTS.map((slot) => {
                      const isSelected = slot === selectedTimeSlot;
                      return (
                        <TouchableOpacity
                          key={slot}
                          activeOpacity={0.8}
                          style={[
                            styles.timeSlotPill,
                            isSelected && styles.timeSlotPillActive,
                          ]}
                          onPress={() => setSelectedTimeSlot(slot)}
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={isSelected ? '#ffffff' : '#64748b'}
                            style={{ marginRight: 5 }}
                          />
                          <Text
                            style={[
                              styles.timeSlotText,
                              isSelected && styles.timeSlotTextActive,
                            ]}
                          >
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 4. Optional Message / Notes Input */}
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionLabel}>SPECIAL REQUESTS OR QUESTIONS (OPTIONAL)</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="E.g., Inquiring about HOA reserves, parking space access, or mortgage pre-approval status..."
                    placeholderTextColor="#94a3b8"
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* Agent Assurance Bar */}
                <View style={styles.agentAssuranceRow}>
                  <Image source={{ uri: agentAvatarUrl }} style={styles.agentSmallAvatar} />
                  <View style={styles.agentAssuranceTextGroup}>
                    <Text style={styles.agentAssuranceTitle}>Hosted by {agentName}</Text>
                    <Text style={styles.agentAssuranceSubtitle}>
                      {agentAgency} • Verified Tour Host
                    </Text>
                  </View>
                </View>

                {/* Primary CTA Button with Loading State */}
                <TouchableOpacity
                  style={[styles.primaryCTAButton, loading && { opacity: 0.8 }]}
                  onPress={handleBookTour}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryCTAText}>Securing Appointment...</Text>
                    </View>
                  ) : (
                    <View style={styles.ctaRow}>
                      <Ionicons
                        name="calendar"
                        size={18}
                        color="#ffffff"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.primaryCTAText}>
                        Request Tour with {agentName}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  bottomSheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 16,
  },
  sheetSafeContent: {
    paddingBottom: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sheetDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
  },
  formScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sheetMainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  sheetSubTitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
    maxWidth: 260,
  },
  sheetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecdd3',
    marginBottom: 14,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 13,
    color: '#e11d48',
    fontWeight: '600',
    flex: 1,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  selectedDateSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentButtonTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  tourTypeDescription: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  datePickerScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  dateCard: {
    width: 62,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  dateCardActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  dateCardDayOfWeek: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  dateCardDayOfWeekActive: {
    color: '#94a3b8',
  },
  dateCardDayNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 2,
  },
  dateCardDayNumActive: {
    color: '#ffffff',
  },
  dateCardMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  dateCardMonthActive: {
    color: '#cbd5e1',
  },
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeSlotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  timeSlotPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  timeSlotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  timeSlotTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  agentAssuranceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    gap: 10,
  },
  agentSmallAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  agentAssuranceTextGroup: {
    flex: 1,
  },
  agentAssuranceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  agentAssuranceSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  primaryCTAButton: {
    backgroundColor: '#e11d48',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCTAText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmedContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  celebrateOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  celebrateInnerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  confirmedSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  confirmationSummaryCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  summaryPropertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryPropertyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  summaryDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryDetailItem: {
    flex: 1,
  },
  summaryDetailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryDetailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  summaryDetailValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryAgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryAgentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  summaryAgentInfo: {
    flex: 1,
  },
  summaryAgentName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryAgentAgency: {
    fontSize: 11,
    color: '#64748b',
  },
  summaryStatusPill: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  summaryStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#d97706',
  },
  calendarNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: 20,
    gap: 10,
  },
  calendarNoticeText: {
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 16,
    flex: 1,
  },
  confirmationActionsRow: {
    width: '100%',
    gap: 10,
  },
  chatAgentPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  chatAgentPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  doneSecondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  doneSecondaryText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
export default TourBookingModal;
