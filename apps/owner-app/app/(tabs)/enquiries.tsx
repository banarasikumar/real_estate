import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  useAuth,
  getUserConversations,
  getConversationMessages,
  sendChatMessage,
  subscribeToConversationMessages,
  subscribeToUserConversations,
  markConversationMessagesAsRead,
  markEnquiryAsRead,
  Conversation,
  ChatMessage,
} from '@repo/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MessageStatusTicks from '../../components/MessageStatusTicks';
import { useNotification } from '../../context/NotificationContext';

export default function EnquiriesScreen() {
  const { session } = useAuth();
  const { refreshCounts } = useNotification();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  const loadData = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const convs = await getUserConversations(session.user.id);
        setConversations(convs || []);
      } catch (e) {
        console.error('Error loading conversations for owner:', e);
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.user?.id]);

  useEffect(() => {
    loadData();

    if (session?.user?.id) {
      const unsub = subscribeToUserConversations(session.user.id, () => {
        loadData();
      });
      return () => unsub();
    }
  }, [loadData, session?.user?.id]);

  // Load message thread when modal opens
  useEffect(() => {
    if (!selectedConv?.id) {
      setMessages([]);
      return;
    }

    // Immediately mark conversation messages and enquiry as read
    if (session?.user?.id) {
      markConversationMessagesAsRead(selectedConv.id, session.user.id)
        .then(() => refreshCounts())
        .catch((err) => console.error('Error marking messages as read:', err));
      markEnquiryAsRead(selectedConv.id)
        .then(() => refreshCounts())
        .catch((err) => console.error('Error marking enquiry as read:', err));
    }

    let isMounted = true;
    setLoadingMessages(true);

    getConversationMessages(selectedConv.id)
      .then((data) => {
        if (isMounted) {
          const mapped: ChatMessage[] = (data || []).map((m) => ({
            ...m,
            status: m.is_read ? ('read' as const) : ('sent' as const),
          }));
          const unique = Array.from(new Map(mapped.map((m) => [m.id, m])).values());
          setMessages(unique);
          setLoadingMessages(false);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      })
      .catch((err) => {
        console.error('Error loading messages:', err);
        if (isMounted) setLoadingMessages(false);
      });

    // Realtime subscription: handles onMessage AND onMessageUpdate
    const unsubscribe = subscribeToConversationMessages(
      selectedConv.id,
      (newMsg) => {
        if (isMounted) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev.map((m) => (m.id === newMsg.id ? { ...m, ...newMsg } : m));
            }

            // Check if this incoming message matches an optimistic temp message
            const optIdx = prev.findIndex(
              (m) =>
                (m.id.startsWith('temp_') || m.id.startsWith('temp-')) &&
                m.sender_id === newMsg.sender_id &&
                m.text === newMsg.text
            );
            if (optIdx !== -1) {
              const updated = [...prev];
              updated[optIdx] = { ...newMsg, status: 'sent' };
              return updated;
            }

            return [
              ...prev,
              {
                ...newMsg,
                status: newMsg.sender_id === session?.user?.id ? 'sent' : undefined,
              },
            ];
          });

          // If incoming message from counterpart while modal is open, mark as read
          if (session?.user?.id && newMsg.sender_id !== session.user.id) {
            markConversationMessagesAsRead(selectedConv.id, session.user.id)
              .then(() => refreshCounts())
              .catch(console.error);
          }

          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 50);
        }
      },
      (updatedMsg) => {
        // onMessageUpdate: when updated message arrives (e.g. is_read = true), ticks turn sky blue
        if (isMounted) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id === updatedMsg.id) {
                return {
                  ...m,
                  ...updatedMsg,
                  status: updatedMsg.is_read ? ('read' as const) : m.status || ('sent' as const),
                };
              }
              return m;
            })
          );
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [selectedConv?.id, session?.user?.id, refreshCounts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    refreshCounts();
  };

  const handleOpenChat = (conv: Conversation) => {
    setSelectedConv(conv);
    setChatModalVisible(true);

    if (session?.user?.id) {
      markConversationMessagesAsRead(conv.id, session.user.id)
        .then(() => refreshCounts())
        .catch((err) => console.error('Error marking messages as read on open:', err));
      markEnquiryAsRead(conv.id)
        .then(() => refreshCounts())
        .catch((err) => console.error('Error marking enquiry as read on open:', err));
    }
  };

  const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedConv?.id || !session?.user?.id || sending) return;

    const text = replyText.trim();
    setSending(true);
    setReplyText('');

    const tempId = 'temp_' + Date.now();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: selectedConv.id,
      sender_id: session.user.id,
      text,
      is_read: false,
      status: 'sending',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const res = await sendChatMessage(selectedConv.id, session.user.id, text);
      if (res.success && res.data) {
        const realMsg: ChatMessage = {
          ...res.data,
          status: 'sent',
        };
        setMessages((prev) => {
          // If realtime already added or replaced the message with this UUID
          if (prev.some((m) => m.id === realMsg.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? realMsg : m));
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConv.id
              ? { ...c, last_message: text, last_message_at: new Date().toISOString() }
              : c
          )
        );
      } else {
        // If sendChatMessage errors, updates temp message to status: 'failed'
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
        );
      }
    } catch (err) {
      console.error('Error sending reply:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const resendMessage = async (failedMsg: ChatMessage) => {
    if (!selectedConv?.id || !session?.user?.id) return;

    // Immediately update status back to sending
    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'sending' } : m))
    );

    try {
      const res = await sendChatMessage(selectedConv.id, session.user.id, failedMsg.text);
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
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConv.id
              ? { ...c, last_message: failedMsg.text, last_message_at: new Date().toISOString() }
              : c
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'failed' } : m))
        );
      }
    } catch (err) {
      console.error('Error resending message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, status: 'failed' } : m))
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  const buyerName = selectedConv?.buyer?.full_name || 'Prospective Buyer';
  const propTitle = selectedConv?.properties?.title || 'Listing';

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Customer Inquiries & Leads</Text>
      <Text style={styles.subtitle}>Direct live conversations for your listings</Text>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbox-ellipses-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Inquiries Yet</Text>
            <Text style={styles.emptyText}>
              When prospective buyers or renters ask questions about your published properties, they will appear here for instant live chat!
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const leadName = item.buyer?.full_name || 'Home Seeker';
          const propertyName = item.properties?.title || 'Property Listing';
          const formattedDate = item.last_message_at
            ? new Date(item.last_message_at).toLocaleDateString()
            : '';

          return (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.buyerBadge}>
                  <Ionicons name="person-circle-outline" size={20} color="#059669" />
                  <Text style={styles.buyerNameText}>{leadName}</Text>
                </View>
                <Text style={styles.cardDate}>{formattedDate}</Text>
              </View>

              <Text style={styles.cardProperty}>Property: {propertyName}</Text>
              <Text style={styles.cardMessage} numberOfLines={2}>
                "{item.last_message || 'Inquiry initiated'}"
              </Text>

              <TouchableOpacity
                style={styles.replyButton}
                onPress={() => handleOpenChat(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-ellipses" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.replyButtonText}>Reply in Live Chat</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Live Chat Modal */}
      <Modal
        visible={chatModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setChatModalVisible(false)}
      >
        {selectedConv && (
          <SafeAreaView style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setChatModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#0f172a" />
              </TouchableOpacity>

              <View style={styles.modalHeaderCenter}>
                <Text style={styles.modalHeaderName}>{buyerName}</Text>
                <Text style={styles.modalHeaderRole} numberOfLines={1}>
                  Lead for: {propTitle}
                </Text>
              </View>

              <View style={{ width: 32 }} />
            </View>

            {/* Messages ScrollView */}
            {loadingMessages ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color="#059669" />
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatMessagesContainer}
                contentContainerStyle={styles.chatMessagesContent}
              >
                <View style={styles.encryptionNotice}>
                  <Ionicons name="shield-checkmark-outline" size={12} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={styles.encryptionText}>Live Realtime connection active</Text>
                </View>

                {messages.map((msg, idx) => {
                  const isOwner = msg.sender_id === session?.user?.id;
                  const time = msg.created_at
                    ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <View
                      key={`${msg.id || 'msg'}-${idx}`}
                      style={[
                        styles.messageBubbleWrapper,
                        isOwner ? styles.ownerBubbleWrapper : styles.buyerBubbleWrapper,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          isOwner ? styles.ownerBubble : styles.buyerBubble,
                        ]}
                      >
                        <Text style={[styles.messageText, isOwner ? styles.ownerMessageText : styles.buyerMessageText]}>
                          {msg.text}
                        </Text>
                        <View style={[styles.bubbleFooter, isOwner ? styles.ownerFooter : styles.buyerFooter]}>
                          <Text style={[styles.messageTimestamp, isOwner ? styles.ownerTimestamp : styles.buyerTimestamp]}>
                            {time}
                          </Text>
                          {isOwner && (
                            <MessageStatusTicks
                              status={msg.status}
                              isRead={msg.is_read}
                              onRetry={() => resendMessage(msg)}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Input Bar */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Type your reply to the customer..."
                  placeholderTextColor="#94a3b8"
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendButton, (!replyText.trim() || sending) && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={!replyText.trim() || sending}
                >
                  <Ionicons name="send" size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 16, backgroundColor: '#f9f9f9' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4, color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  list: { paddingBottom: 24 },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  buyerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buyerNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardDate: { fontSize: 12, color: '#94a3b8' },
  cardProperty: { fontSize: 13, fontWeight: '600', color: '#059669', marginBottom: 6 },
  cardMessage: { fontSize: 14, fontStyle: 'italic', color: '#334155', marginBottom: 12, lineHeight: 20 },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
  },
  replyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalHeaderCenter: {
    alignItems: 'center',
    flex: 1,
  },
  modalHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalHeaderRole: {
    fontSize: 12,
    color: '#059669',
  },
  chatMessagesContainer: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 16,
    gap: 10,
  },
  encryptionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  encryptionText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  ownerBubbleWrapper: {
    justifyContent: 'flex-end',
  },
  buyerBubbleWrapper: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  ownerBubble: {
    backgroundColor: '#059669',
    borderBottomRightRadius: 4,
  },
  buyerBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ownerMessageText: {
    color: '#ffffff',
  },
  buyerMessageText: {
    color: '#0f172a',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  ownerFooter: {
    justifyContent: 'flex-end',
  },
  buyerFooter: {
    justifyContent: 'flex-start',
  },
  messageTimestamp: {
    fontSize: 10,
  },
  ownerTimestamp: {
    color: 'rgba(255,255,255,0.75)',
  },
  buyerTimestamp: {
    color: '#94a3b8',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    color: '#0f172a',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
