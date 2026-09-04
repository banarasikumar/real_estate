import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useAuth,
  getUserConversations,
  getConversationMessages,
  sendChatMessage,
  subscribeToConversationMessages,
  subscribeToUserConversations,
  Conversation,
  ChatMessage,
} from '@repo/api';

type FilterType = 'ALL' | 'UNREAD';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [threads, setThreads] = useState<Conversation[]>([]);
  const [selectedThread, setSelectedThread] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Load user conversations
  const loadConversations = useCallback(async () => {
    if (!user?.id) {
      setThreads([]);
      setLoadingThreads(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await getUserConversations(user.id);
      setThreads(data || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoadingThreads(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadConversations();

    if (user?.id) {
      const unsub = subscribeToUserConversations(user.id, () => {
        loadConversations();
      });
      return () => unsub();
    }
  }, [loadConversations, user?.id]);

  // Load messages and subscribe when thread is opened
  useEffect(() => {
    if (!selectedThread?.id) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    getConversationMessages(selectedThread.id)
      .then((data) => {
        if (isMounted) {
          const unique = Array.from(new Map((data || []).map((m) => [m.id, m])).values());
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

    // Realtime subscription
    const unsubscribe = subscribeToConversationMessages(selectedThread.id, (newMsg) => {
      if (isMounted) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;

          // Match pending optimistic message
          const optIdx = prev.findIndex(
            (m) => m.id.startsWith('temp-') && m.sender_id === newMsg.sender_id && m.text === newMsg.text
          );
          if (optIdx !== -1) {
            const updated = [...prev];
            updated[optIdx] = newMsg;
            return updated;
          }

          return [...prev, newMsg];
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [selectedThread?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleOpenThread = (thread: Conversation) => {
    setSelectedThread(thread);
    setChatModalVisible(true);
  };

  const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedThread?.id || !user?.id || sending) return;

    const text = replyText.trim();
    setSending(true);
    setReplyText('');

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversation_id: selectedThread.id,
      sender_id: user.id,
      text,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      const res = await sendChatMessage(selectedThread.id, user.id, text);
      if (res.success && res.data) {
        const realMsg = res.data;
        setMessages((prev) => {
          // If realtime already delivered or replaced the message
          if (prev.some((m) => m.id === realMsg.id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? realMsg : m));
        });
        // Update thread in local list
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedThread.id
              ? { ...t, last_message: text, last_message_at: new Date().toISOString() }
              : t
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const filteredThreads = threads.filter((thread) => {
    const isBuyer = thread.buyer_id === user?.id;
    const otherName = isBuyer
      ? thread.owner?.full_name || 'Property Owner'
      : thread.buyer?.full_name || 'Buyer';
    const propTitle = thread.properties?.title || '';
    const lastMsg = thread.last_message || '';

    const matchesSearch =
      otherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      propTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lastMsg.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="chatbubbles-outline" size={40} color="#e11d48" />
          </View>
          <Text style={styles.emptyTitle}>Sign In to View Messages</Text>
          <Text style={styles.emptySubtitle}>
            Log in to chat directly with property owners and brokers in real time.
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.signInButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isSelectedBuyer = selectedThread?.buyer_id === user.id;
  const selectedOther = isSelectedBuyer ? selectedThread?.owner : selectedThread?.buyer;
  const selectedOtherName = selectedOther?.full_name || (isSelectedBuyer ? 'Property Owner / Agent' : 'Prospective Buyer');
  const selectedOtherAvatar =
    selectedOther?.avatar_url ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

  const renderThreadItem = ({ item }: { item: Conversation }) => {
    const isBuyer = item.buyer_id === user.id;
    const other = isBuyer ? item.owner : item.buyer;
    const name = other?.full_name || (isBuyer ? 'Property Owner' : 'Inquirer');
    const avatar =
      other?.avatar_url ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
    const propThumb = item.properties?.property_media?.[0]?.url;

    const formattedTime = item.last_message_at
      ? new Date(item.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <TouchableOpacity
        style={styles.threadItem}
        onPress={() => handleOpenThread(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: propThumb || avatar }} style={styles.avatar} />
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.threadContent}>
          <View style={styles.threadHeader}>
            <Text style={styles.agentName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.timeText}>{formattedTime}</Text>
          </View>

          <View style={styles.propertyTag}>
            <Ionicons name="business-outline" size={11} color="#e11d48" style={{ marginRight: 3 }} />
            <Text style={styles.propertyTagText} numberOfLines={1}>
              {item.properties?.title || 'Property Inquiry'}
            </Text>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewText} numberOfLines={1}>
              {item.last_message || 'Conversation started'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
          onPress={() => setActiveFilter('ALL')}
        >
          <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>
            All Messages ({threads.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loadingThreads ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      ) : (
        <FlatList
          data={filteredThreads}
          keyExtractor={(item) => item.id}
          renderItem={renderThreadItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e11d48']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubbles-outline" size={40} color="#94a3b8" />
              </View>
              <Text style={styles.emptyTitle}>No Conversations Yet</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No conversations matched "${searchQuery}".`
                  : "You don't have any active chats yet. Inquire on a property listing to chat with verified sellers in real-time!"}
              </Text>
            </View>
          }
        />
      )}

      {/* Conversation Thread Modal */}
      <Modal
        visible={chatModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setChatModalVisible(false)}
      >
        {selectedThread && (
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
                <Text style={styles.modalHeaderName}>{selectedOtherName}</Text>
                <Text style={styles.modalHeaderRole}>
                  {isSelectedBuyer ? 'Listing Owner / Agent' : 'Home Seeker'}
                </Text>
              </View>

              {selectedThread.property_id ? (
                <TouchableOpacity
                  style={styles.modalPropLink}
                  onPress={() => {
                    setChatModalVisible(false);
                    router.push(`/property/${selectedThread.property_id}`);
                  }}
                >
                  <Ionicons name="business-outline" size={20} color="#e11d48" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 32 }} />
              )}
            </View>

            {/* Property Banner in Chat */}
            {selectedThread.properties && (
              <TouchableOpacity
                style={styles.chatPropertyBanner}
                onPress={() => {
                  setChatModalVisible(false);
                  router.push(`/property/${selectedThread.property_id}`);
                }}
              >
                <Image
                  source={{
                    uri:
                      selectedThread.properties.property_media?.[0]?.url ||
                      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=150',
                  }}
                  style={styles.chatPropThumb}
                />
                <View style={styles.chatPropInfo}>
                  <Text style={styles.chatPropTitle} numberOfLines={1}>
                    {selectedThread.properties.title}
                  </Text>
                  <Text style={styles.chatPropSub}>Tap to view listing details</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Messages ScrollView */}
            {loadingMessages ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color="#e11d48" />
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                style={styles.chatMessagesContainer}
                contentContainerStyle={styles.chatMessagesContent}
              >
                <View style={styles.encryptionNotice}>
                  <Ionicons name="shield-checkmark-outline" size={12} color="#10b981" style={{ marginRight: 4 }} />
                  <Text style={styles.encryptionText}>End-to-end verified real-time inquiry</Text>
                </View>

                {messages.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                    <Text style={{ fontSize: 13, color: '#94a3b8' }}>
                      No messages yet. Send a message to start chatting!
                    </Text>
                  </View>
                ) : (
                  messages.map((msg, idx) => {
                    const isUser = msg.sender_id === user.id;
                    const formattedTime = msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '';

                    return (
                      <View
                        key={`${msg.id || 'msg'}-${idx}`}
                        style={[
                          styles.messageBubbleWrapper,
                          isUser ? styles.userBubbleWrapper : styles.agentBubbleWrapper,
                        ]}
                      >
                        {!isUser && (
                          <Image source={{ uri: selectedOtherAvatar }} style={styles.smallAvatar} />
                        )}
                        <View
                          style={[
                            styles.messageBubble,
                            isUser ? styles.userBubble : styles.agentBubble,
                          ]}
                        >
                          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.agentMessageText]}>
                            {msg.text}
                          </Text>
                          <Text style={[styles.messageTimestamp, isUser ? styles.userTimestamp : styles.agentTimestamp]}>
                            {formattedTime}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
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
                  placeholder="Type a message..."
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#e11d48',
  },
  listContent: {
    paddingBottom: 30,
  },
  threadItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  threadContent: {
    flex: 1,
    justifyContent: 'center',
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  agentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  propertyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  propertyTagText: {
    fontSize: 12,
    color: '#e11d48',
    fontWeight: '600',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#e11d48',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
  },
  modalHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalHeaderRole: {
    fontSize: 12,
    color: '#64748b',
  },
  modalPropLink: {
    padding: 6,
    backgroundColor: '#fff1f2',
    borderRadius: 8,
  },
  chatPropertyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chatPropThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  chatPropInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatPropTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  chatPropSub: {
    fontSize: 11,
    color: '#e11d48',
    fontWeight: '500',
  },
  chatMessagesContainer: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: 16,
    gap: 12,
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
    color: '#64748b',
    fontWeight: '500',
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  userBubbleWrapper: {
    justifyContent: 'flex-end',
  },
  agentBubbleWrapper: {
    justifyContent: 'flex-start',
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#e11d48',
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#ffffff',
  },
  agentMessageText: {
    color: '#0f172a',
  },
  messageTimestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  userTimestamp: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'right',
  },
  agentTimestamp: {
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
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
