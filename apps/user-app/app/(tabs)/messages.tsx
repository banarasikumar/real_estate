import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@repo/api';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface ConversationThread {
  id: string;
  agentName: string;
  agentRole: string;
  agentAvatar: string;
  isOnline: boolean;
  propertyId: string;
  propertyTitle: string;
  propertyThumb: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

const MOCK_CONVERSATIONS: ConversationThread[] = [
  {
    id: 'thread-1',
    agentName: 'Sarah Jenkins',
    agentRole: 'Premier Listing Agent',
    agentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    isOnline: true,
    propertyId: '1',
    propertyTitle: 'Modern Luxury Penthouse',
    propertyThumb: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=150',
    lastMessage: 'Hi! Yes, Saturday at 2:00 PM works perfectly for the private viewing. I will meet you at the lobby.',
    lastMessageTime: '10:45 AM',
    unreadCount: 2,
    messages: [
      {
        id: 'm1',
        sender: 'user',
        text: 'Hello Sarah, I saw your listing for the Penthouse. Is it available for a viewing this weekend?',
        timestamp: '10:30 AM',
      },
      {
        id: 'm2',
        sender: 'agent',
        text: 'Hi! Yes, Saturday at 2:00 PM works perfectly for the private viewing. I will meet you at the lobby.',
        timestamp: '10:45 AM',
      },
    ],
  },
  {
    id: 'thread-2',
    agentName: 'Marcus Vance',
    agentRole: 'Property Manager',
    agentAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    isOnline: false,
    propertyId: '2',
    propertyTitle: 'Minimalist Contemporary Villa',
    propertyThumb: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=150',
    lastMessage: 'I have attached the floor plans and the latest HOA inspection report for your review.',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    messages: [
      {
        id: 'm3',
        sender: 'user',
        text: 'Could you share details about HOA fees and parking space allocations?',
        timestamp: 'Yesterday 2:15 PM',
      },
      {
        id: 'm4',
        sender: 'agent',
        text: 'I have attached the floor plans and the latest HOA inspection report for your review.',
        timestamp: 'Yesterday 3:00 PM',
      },
    ],
  },
  {
    id: 'thread-3',
    agentName: 'Elena Rostova',
    agentRole: 'Senior Broker',
    agentAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    isOnline: true,
    propertyId: '3',
    propertyTitle: 'Charming Victorian Loft',
    propertyThumb: 'https://images.unsplash.com/photo-1502672260266-1c1cd2cb3668?w=150',
    lastMessage: 'The landlord is happy to accept small pets with a standard $250 refundable deposit!',
    lastMessageTime: '2 days ago',
    unreadCount: 1,
    messages: [
      {
        id: 'm5',
        sender: 'user',
        text: 'Hi Elena, does this rental unit allow small dogs?',
        timestamp: '2 days ago',
      },
      {
        id: 'm6',
        sender: 'agent',
        text: 'The landlord is happy to accept small pets with a standard $250 refundable deposit!',
        timestamp: '2 days ago',
      },
    ],
  },
  {
    id: 'thread-4',
    agentName: 'David Chen',
    agentRole: 'Residential Specialist',
    agentAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    isOnline: false,
    propertyId: '4',
    propertyTitle: 'Scandinavian Studio Downtown',
    propertyThumb: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=150',
    lastMessage: 'Congratulations! Your lease agreement draft has been approved by the owner.',
    lastMessageTime: 'Aug 24',
    unreadCount: 0,
    messages: [
      {
        id: 'm7',
        sender: 'user',
        text: 'We have submitted the lease application documents.',
        timestamp: 'Aug 24 11:00 AM',
      },
      {
        id: 'm8',
        sender: 'agent',
        text: 'Congratulations! Your lease agreement draft has been approved by the owner.',
        timestamp: 'Aug 24 4:30 PM',
      },
    ],
  },
];

type FilterType = 'ALL' | 'UNREAD' | 'ONLINE';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [threads, setThreads] = useState<ConversationThread[]>(MOCK_CONVERSATIONS);
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  const handleOpenThread = (thread: ConversationThread) => {
    // Mark thread as read
    setThreads((prev) =>
      prev.map((t) => (t.id === thread.id ? { ...t, unreadCount: 0 } : t))
    );
    setSelectedThread({ ...thread, unreadCount: 0 });
    setChatModalVisible(true);
  };

  const handleSendMessage = () => {
    if (!replyText.trim() || !selectedThread) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: replyText.trim(),
      timestamp: 'Just now',
    };

    const updatedThread: ConversationThread = {
      ...selectedThread,
      lastMessage: replyText.trim(),
      lastMessageTime: 'Just now',
      messages: [...selectedThread.messages, newMessage],
    };

    setSelectedThread(updatedThread);
    setThreads((prev) =>
      prev.map((t) => (t.id === selectedThread.id ? updatedThread : t))
    );
    setReplyText('');
  };

  const filteredThreads = threads.filter((thread) => {
    const matchesSearch =
      thread.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.propertyTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'UNREAD') return thread.unreadCount > 0;
    if (activeFilter === 'ONLINE') return thread.isOnline;
    return true;
  });

  const renderThreadItem = ({ item }: { item: ConversationThread }) => {
    const isUnread = item.unreadCount > 0;
    return (
      <TouchableOpacity
        style={[styles.threadItem, isUnread && styles.threadItemUnread]}
        onPress={() => handleOpenThread(item)}
        activeOpacity={0.7}
      >
        {/* Avatar with Online Status */}
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.agentAvatar }} style={styles.avatar} />
          {item.isOnline && <View style={styles.onlineDot} />}
        </View>

        {/* Content */}
        <View style={styles.threadContent}>
          <View style={styles.threadHeader}>
            <Text style={[styles.agentName, isUnread && styles.agentNameBold]} numberOfLines={1}>
              {item.agentName}
            </Text>
            <Text style={[styles.timeText, isUnread && styles.timeTextBold]}>
              {item.lastMessageTime}
            </Text>
          </View>

          {/* Property Tag */}
          <View style={styles.propertyTag}>
            <Ionicons name="business-outline" size={11} color="#64748b" style={{ marginRight: 3 }} />
            <Text style={styles.propertyTagText} numberOfLines={1}>
              {item.propertyTitle}
            </Text>
          </View>

          {/* Last Message Preview */}
          <View style={styles.previewRow}>
            <Text
              style={[styles.previewText, isUnread && styles.previewTextUnread]}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            {isUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
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
            placeholder="Search messages or properties..."
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
            All Messages
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'UNREAD' && styles.filterChipActive]}
          onPress={() => setActiveFilter('UNREAD')}
        >
          <Text style={[styles.filterChipText, activeFilter === 'UNREAD' && styles.filterChipTextActive]}>
            Unread
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === 'ONLINE' && styles.filterChipActive]}
          onPress={() => setActiveFilter('ONLINE')}
        >
          <Text style={[styles.filterChipText, activeFilter === 'ONLINE' && styles.filterChipTextActive]}>
            Online Agents
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
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
            <Text style={styles.emptyTitle}>No Messages Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `No messages matched "${searchQuery}".`
                : "You don't have any active conversations. Inquire on a listing to start chatting with verified agents!"}
            </Text>
          </View>
        }
      />

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
                <Text style={styles.modalHeaderName}>{selectedThread.agentName}</Text>
                <Text style={styles.modalHeaderRole}>{selectedThread.agentRole}</Text>
              </View>

              <TouchableOpacity
                style={styles.modalPropLink}
                onPress={() => {
                  setChatModalVisible(false);
                  router.push(`/property/${selectedThread.propertyId}`);
                }}
              >
                <Ionicons name="business-outline" size={20} color="#e11d48" />
              </TouchableOpacity>
            </View>

            {/* Property Banner in Chat */}
            <TouchableOpacity
              style={styles.chatPropertyBanner}
              onPress={() => {
                setChatModalVisible(false);
                router.push(`/property/${selectedThread.propertyId}`);
              }}
            >
              <Image source={{ uri: selectedThread.propertyThumb }} style={styles.chatPropThumb} />
              <View style={styles.chatPropInfo}>
                <Text style={styles.chatPropTitle} numberOfLines={1}>
                  {selectedThread.propertyTitle}
                </Text>
                <Text style={styles.chatPropSub}>Tap to view listing details</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
            </TouchableOpacity>

            {/* Messages ScrollView */}
            <ScrollView
              style={styles.chatMessagesContainer}
              contentContainerStyle={styles.chatMessagesContent}
            >
              <View style={styles.encryptionNotice}>
                <Ionicons name="lock-closed-outline" size={12} color="#94a3b8" style={{ marginRight: 4 }} />
                <Text style={styles.encryptionText}>End-to-end verified real estate enquiry</Text>
              </View>

              {selectedThread.messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <View
                    key={msg.id}
                    style={[styles.messageBubbleWrapper, isUser ? styles.userBubbleWrapper : styles.agentBubbleWrapper]}
                  >
                    {!isUser && (
                      <Image source={{ uri: selectedThread.agentAvatar }} style={styles.smallAvatar} />
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
                        {msg.timestamp}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

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
                  style={[styles.sendButton, !replyText.trim() && styles.sendButtonDisabled]}
                  onPress={handleSendMessage}
                  disabled={!replyText.trim()}
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
  threadItemUnread: {
    backgroundColor: '#fffbfa',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e2e8f0',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
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
  agentNameBold: {
    fontWeight: '700',
  },
  timeText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  timeTextBold: {
    color: '#e11d48',
    fontWeight: '600',
  },
  propertyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  propertyTagText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
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
    marginRight: 8,
  },
  previewTextUnread: {
    color: '#0f172a',
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#e11d48',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
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
    backgroundColor: '#f8fafc',
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
    color: '#94a3b8',
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
    maxWidth: '75%',
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
    color: 'rgba(255,255,255,0.7)',
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#fecdd3',
  },
});
