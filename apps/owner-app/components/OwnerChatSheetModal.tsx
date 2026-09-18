import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import {
  Conversation,
  ChatMessage,
  getConversationMessages,
  sendChatMessage,
  subscribeToConversationMessages,
  markMessagesAsDelivered,
  markConversationMessagesAsRead,
  markEnquiryAsRead,
} from '@repo/api';
import MessageStatusTicks from './MessageStatusTicks';

export interface OwnerChatSheetModalProps {
  visible: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  currentUserId: string;
  onViewListing?: (propertyId: string) => void;
  onMessageSentSuccess?: () => void;
}

const QUICK_REPLIES = [
  { id: 'tour', label: '📅 Yes, available for tour', text: 'Yes, absolutely! The property is available for a private tour. What date and time works best for you?' },
  { id: 'price', label: '💰 Price is negotiable', text: 'The price is somewhat flexible for qualified buyers with flexible closing terms.' },
  { id: 'floorplan', label: '📐 Floor plan is available', text: 'Yes, full architectural floor plans and specifications are available. Would you like me to share them?' },
  { id: 'call', label: "📞 Let's arrange a call", text: "I'd be glad to discuss the details over a brief phone call. What is your preferred contact number?" },
];

export const OwnerChatSheetModal: React.FC<OwnerChatSheetModalProps> = ({
  visible,
  onClose,
  conversation,
  currentUserId,
  onViewListing,
  onMessageSentSuccess,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const sendButtonScale = useRef(new Animated.Value(1)).current;

  // Auto-scroll helper with spring physics
  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 60);
  }, []);

  // Fetch messages and subscribe to Realtime updates
  useEffect(() => {
    if (!visible || !conversation?.id || !currentUserId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // 1. Immediately mark messages as delivered and read
    markMessagesAsDelivered(conversation.id, currentUserId).catch(console.error);
    markConversationMessagesAsRead(conversation.id, currentUserId).catch(console.error);
    markEnquiryAsRead(conversation.id).catch(console.error);

    // 2. Fetch thread
    getConversationMessages(conversation.id)
      .then((data) => {
        if (isMounted) {
          const mapped: ChatMessage[] = (data || []).map((m) => ({
            ...m,
            status: m.delivered_at ? ('delivered' as const) : ('sent' as const),
          }));
          // Ensure unique message IDs
          const unique = Array.from(new Map(mapped.map((m) => [m.id, m])).values());
          setMessages(unique);
          setLoading(false);
          scrollToBottom(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching conversation messages:', err);
        if (isMounted) setLoading(false);
      });

    // 3. Realtime subscription for INSERT and UPDATE events
    const unsubscribe = subscribeToConversationMessages(
      conversation.id,
      (newMsg) => {
        if (!isMounted) return;

        setMessages((prev) => {
          // If already exists, update
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m));
          }

          // Check if this incoming message satisfies an optimistic temp message
          const optIdx = prev.findIndex(
            (m) =>
              (m.id.startsWith('temp_') || m.id.startsWith('temp-')) &&
              m.sender_id === newMsg.sender_id &&
              m.text === newMsg.text
          );

          if (optIdx !== -1) {
            const updated = [...prev];
            updated[optIdx] = {
              ...newMsg,
              status: newMsg.delivered_at ? 'delivered' : 'sent',
            };
            return updated;
          }

          return [
            ...prev,
            {
              ...newMsg,
              status:
                newMsg.sender_id === currentUserId
                  ? newMsg.delivered_at
                    ? 'delivered'
                    : 'sent'
                  : undefined,
            },
          ];
        });

        // Mark incoming message as delivered and read
        if (newMsg.sender_id !== currentUserId) {
          markMessagesAsDelivered(conversation.id, currentUserId).catch(console.error);
          markConversationMessagesAsRead(conversation.id, currentUserId).catch(console.error);
        }

        scrollToBottom(true);
      },
      (updatedMsg) => {
        if (!isMounted) return;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === updatedMsg.id) {
              return {
                ...m,
                ...updatedMsg,
                status: updatedMsg.delivered_at ? ('delivered' as const) : m.status || ('sent' as const),
              };
            }
            return m;
          })
        );
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [visible, conversation?.id, currentUserId, scrollToBottom]);

  // Send message handler with optimistic rendering
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || !conversation?.id || !currentUserId || sending) return;

    if (!customText) {
      setInputText('');
    }
    setSending(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      text: textToSend,
      is_read: false,
      status: 'sending',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom(true);

    try {
      const res = await sendChatMessage(conversation.id, currentUserId, textToSend);
      if (res.success && res.data) {
        const realMsg: ChatMessage = {
          ...res.data,
          status: 'sent',
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === realMsg.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? realMsg : m));
        });
        onMessageSentSuccess?.();
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
        );
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setSending(false);
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (failedMsg: ChatMessage) => {
    if (!conversation?.id || !currentUserId) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'sending' } : m))
    );

    try {
      const res = await sendChatMessage(conversation.id, currentUserId, failedMsg.text);
      if (res.success && res.data) {
        const realMsg: ChatMessage = {
          ...res.data,
          status: 'sent',
        };
        setMessages((prev) => {
          if (prev.some((m) => m.id === realMsg.id)) {
            return prev.filter((m) => m.id !== failedMsg.id);
          }
          return prev.map((m) => (m.id === failedMsg.id ? realMsg : m));
        });
        onMessageSentSuccess?.();
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'failed' } : m))
        );
      }
    } catch (err) {
      console.error('Error retrying message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'failed' } : m))
      );
    }
  };

  const handleSendPressIn = () => {
    Animated.spring(sendButtonScale, {
      toValue: 0.88,
      useNativeDriver: true,
    }).start();
  };

  const handleSendPressOut = () => {
    Animated.spring(sendButtonScale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  if (!conversation) return null;

  const seeker = conversation.buyer;
  const seekerName = seeker?.full_name || 'Home Seeker';
  const seekerInitials = seekerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const property = conversation.properties;
  const propertyTitle = property?.title || 'Luxury Residence';
  const propertyPrice = property?.price
    ? typeof property.price === 'number'
      ? `$${property.price.toLocaleString()}`
      : `$${property.price}`
    : 'Price upon request';
  const propertyAddress = property?.address || 'Prime Location';
  const propertyThumbnail =
    property?.property_media?.[0]?.url ||
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Glassmorphic Top Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerCloseButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-down" size={26} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.avatarContainer}>
              {seeker?.avatar_url ? (
                <Image source={{ uri: seeker.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{seekerInitials}</Text>
                </View>
              )}
              {/* Online Green Indicator Dot */}
              <View style={styles.onlineIndicatorDot} />
            </View>

            <View style={styles.headerTextGroup}>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {seekerName}
                </Text>
                <Ionicons name="checkmark-circle" size={15} color="#2563eb" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                Active now • Verified Seeker Lead
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => {
              if (seeker?.phone_number) {
                Alert.alert('Seeker Contact', `Phone: ${seeker.phone_number}`);
              } else {
                Alert.alert('Seeker Lead', `${seekerName} is connected via direct in-app messaging.`);
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="call-outline" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Pinned Property Snapshot Card */}
        <View style={styles.propertySnapshotContainer}>
          <View style={styles.propertySnapshotCard}>
            <Image source={{ uri: propertyThumbnail }} style={styles.propertySnapshotThumb} />
            <View style={styles.propertySnapshotDetails}>
              <Text style={styles.propertySnapshotTitle} numberOfLines={1}>
                {propertyTitle}
              </Text>
              <Text style={styles.propertySnapshotAddress} numberOfLines={1}>
                {propertyAddress}
              </Text>
              <Text style={styles.propertySnapshotPrice}>{propertyPrice}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewListingButton}
              onPress={() => {
                if (property?.id && onViewListing) {
                  onViewListing(property.id);
                } else if (property?.id) {
                  Alert.alert('Property Listing', `Listing ID: ${property.id}\n${propertyTitle}`);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.viewListingText}>View</Text>
              <Ionicons name="open-outline" size={13} color="#2563eb" style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Message Thread List */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Syncing Realtime messages...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScrollView}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* End-to-end Realtime Banner */}
            <View style={styles.securityBadge}>
              <Ionicons name="lock-closed" size={12} color="#059669" style={{ marginRight: 5 }} />
              <Text style={styles.securityBadgeText}>
                Live Supabase Realtime synchronized • Direct owner channel
              </Text>
            </View>

            {messages.length === 0 ? (
              <View style={styles.emptyThreadContainer}>
                <Ionicons name="chatbubbles-outline" size={44} color="#94a3b8" />
                <Text style={styles.emptyThreadTitle}>No messages yet</Text>
                <Text style={styles.emptyThreadSubtitle}>
                  Reply to {seekerName} to begin scheduling private tours or answering questions.
                </Text>
              </View>
            ) : (
              messages.map((msg, index) => {
                const isOwner = msg.sender_id === currentUserId;
                const timeStr = msg.created_at
                  ? new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                if (isOwner) {
                  // Outgoing (Owner): Gradient brand blue/rose, right-aligned, white text, timestamp, delivery ticks
                  return (
                    <View key={msg.id || `msg-${index}`} style={styles.outgoingRow}>
                      <View style={styles.outgoingBubbleContainer}>
                        {/* Gradient SVG Background */}
                        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                          <Defs>
                            <LinearGradient
                              id={`ownerGrad-${msg.id || index}`}
                              x1="0%"
                              y1="0%"
                              x2="100%"
                              y2="100%"
                            >
                              <Stop offset="0%" stopColor="#2563eb" />
                              <Stop offset="100%" stopColor="#e11d48" />
                            </LinearGradient>
                          </Defs>
                          <Rect
                            x="0"
                            y="0"
                            width="100%"
                            height="100%"
                            rx={18}
                            ry={18}
                            fill={`url(#ownerGrad-${msg.id || index})`}
                          />
                        </Svg>

                        {/* Bubble Content */}
                        <View style={styles.outgoingBubbleContent}>
                          <Text style={styles.outgoingText}>{msg.text}</Text>
                          <View style={styles.outgoingFooter}>
                            <Text style={styles.outgoingTimestamp}>{timeStr}</Text>
                            <MessageStatusTicks
                              status={msg.status}
                              deliveredAt={msg.delivered_at}
                              isRead={msg.is_read}
                              color="rgba(255, 255, 255, 0.9)"
                              onRetry={() => handleRetryMessage(msg)}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                }

                // Incoming (Seeker): Pure white background, soft shadow, left-aligned, timestamp
                return (
                  <View key={msg.id || `msg-${index}`} style={styles.incomingRow}>
                    <View style={styles.incomingBubble}>
                      <Text style={styles.incomingText}>{msg.text}</Text>
                      <View style={styles.incomingFooter}>
                        <Text style={styles.incomingTimestamp}>{timeStr}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Bottom Input Area with Suggestions and Glassmorphic Bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          {/* Quick Reply Suggestion Pills */}
          <View style={styles.quickRepliesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRepliesContent}
            >
              {QUICK_REPLIES.map((pill) => (
                <TouchableOpacity
                  key={pill.id}
                  style={styles.quickReplyPill}
                  onPress={() => handleSendMessage(pill.text)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickReplyText}>{pill.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Glassmorphic Bottom Input Bar */}
          <View style={styles.inputBar}>
            {/* Attachment Button */}
            <TouchableOpacity
              style={styles.attachmentButton}
              onPress={() => {
                Alert.alert(
                  'Share Media',
                  'Select an attachment for the seeker:',
                  [
                    { text: 'Send Floor Plan PDF', onPress: () => handleSendMessage('Here is the official architectural floor plan for review.') },
                    { text: 'Share 3D Tour Link', onPress: () => handleSendMessage('Explore the 3D Virtual Walkthrough here: https://my.matterport.com/show/?m=sample') },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={24} color="#64748b" />
            </TouchableOpacity>

            {/* Auto-expanding Input Field */}
            <TextInput
              style={styles.textInput}
              placeholder={`Message ${seekerName}...`}
              placeholderTextColor="#94a3b8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />

            {/* Spring Animated Send Button */}
            <Animated.View style={{ transform: [{ scale: sendButtonScale }] }}>
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || sending) && styles.sendButtonDisabled,
                ]}
                onPress={() => handleSendMessage()}
                onPressIn={handleSendPressIn}
                onPressOut={handleSendPressOut}
                disabled={!inputText.trim() || sending}
                activeOpacity={0.9}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="arrow-up" size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default OwnerChatSheetModal;

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : 16,
    paddingBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  headerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e2e8f0',
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  onlineIndicatorDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  headerTextGroup: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertySnapshotContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  propertySnapshotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  propertySnapshotThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#cbd5e1',
    marginRight: 10,
  },
  propertySnapshotDetails: {
    flex: 1,
    marginRight: 8,
  },
  propertySnapshotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  propertySnapshotAddress: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  propertySnapshotPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 2,
  },
  viewListingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  viewListingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  messagesScrollView: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  emptyThreadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyThreadTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 10,
    marginBottom: 4,
  },
  emptyThreadSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  outgoingRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  outgoingBubbleContainer: {
    maxWidth: '80%',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    backgroundColor: '#2563eb',
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  outgoingBubbleContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
  },
  outgoingText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#ffffff',
    fontWeight: '400',
  },
  outgoingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  outgoingTimestamp: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 4,
  },
  incomingRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  incomingBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  incomingText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#0f172a',
  },
  incomingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  incomingTimestamp: {
    fontSize: 10,
    color: '#94a3b8',
  },
  quickRepliesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
  },
  quickRepliesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  quickReplyPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickReplyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  attachmentButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 14,
    color: '#0f172a',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowOpacity: 0,
    elevation: 0,
  },
});
