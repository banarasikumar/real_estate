import { supabase } from './client';
import type { Conversation, ChatMessage } from './database.types';

/**
 * Fetches all active conversation threads for a given user (as buyer or owner).
 * Includes associated property details and counterpart user profile.
 */
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        properties (
          id,
          title,
          address,
          price,
          property_media (url)
        ),
        buyer:profiles!buyer_id (
          id,
          full_name,
          avatar_url,
          phone_number
        ),
        owner:profiles!owner_id (
          id,
          full_name,
          avatar_url,
          phone_number
        )
      `)
      .or(`buyer_id.eq.${userId},owner_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.warn('Error fetching detailed conversations, attempting basic fetch:', error.message);
      // Fallback in case of relationship name resolution issues
      const fallback = await supabase
        .from('conversations')
        .select('*, properties(*)')
        .or(`buyer_id.eq.${userId},owner_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      return (fallback.data as any[]) || [];
    }

    return (data as any[]) || [];
  } catch (err) {
    console.error('Unexpected error in getUserConversations:', err);
    return [];
  }
};

/**
 * Retrieves an existing conversation between a buyer and owner for a property,
 * or creates a new conversation and optionally inserts the initial message.
 */
export const getOrCreateConversation = async (
  propertyId: string,
  buyerId: string,
  ownerId: string,
  initialMessage?: string
): Promise<{ success: boolean; data?: Conversation; error?: any }> => {
  try {
    // 1. Check if conversation already exists
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select(`
        *,
        properties (id, title, address, price, property_media(url)),
        buyer:profiles!buyer_id (id, full_name, avatar_url),
        owner:profiles!owner_id (id, full_name, avatar_url)
      `)
      .eq('property_id', propertyId)
      .eq('buyer_id', buyerId)
      .maybeSingle();

    if (existing) {
      if (initialMessage && initialMessage.trim()) {
        await sendChatMessage(existing.id, buyerId, initialMessage.trim());
      }
      return { success: true, data: existing as any };
    }

    // 2. Create new conversation
    const { data: created, error: createError } = await supabase
      .from('conversations')
      .insert([
        {
          property_id: propertyId,
          buyer_id: buyerId,
          owner_id: ownerId,
          last_message: initialMessage ? initialMessage.trim() : 'Inquiry initiated',
          last_message_at: new Date().toISOString(),
        },
      ])
      .select(`
        *,
        properties (id, title, address, price, property_media(url)),
        buyer:profiles!buyer_id (id, full_name, avatar_url),
        owner:profiles!owner_id (id, full_name, avatar_url)
      `)
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      return { success: false, error: createError };
    }

    // 3. Insert initial message if provided
    if (initialMessage && initialMessage.trim() && created?.id) {
      await sendChatMessage(created.id, buyerId, initialMessage.trim());
    }

    return { success: true, data: created as any };
  } catch (err) {
    console.error('Unexpected error in getOrCreateConversation:', err);
    return { success: false, error: err };
  }
};

/**
 * Fetches all chat messages belonging to a conversation ordered chronologically.
 */
export const getConversationMessages = async (conversationId: string): Promise<ChatMessage[]> => {
  if (!conversationId) return [];

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`Error fetching messages for conversation (${conversationId}):`, error);
      return [];
    }

    return (data as ChatMessage[]) || [];
  } catch (err) {
    console.error('Unexpected error in getConversationMessages:', err);
    return [];
  }
};

/**
 * Sends a chat message in a conversation and updates the conversation's last message timestamp.
 */
export const sendChatMessage = async (
  conversationId: string,
  senderId: string,
  text: string
): Promise<{ success: boolean; data?: ChatMessage; error?: any }> => {
  if (!conversationId || !senderId || !text.trim()) {
    return { success: false, error: 'Missing required parameters' };
  }

  const trimmed = text.trim();

  try {
    // 1. Insert message
    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: senderId,
          text: trimmed,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return { success: false, error };
    }

    // 2. Update conversation last_message preview & timestamp
    await supabase
      .from('conversations')
      .update({
        last_message: trimmed,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return { success: true, data: data as ChatMessage };
  } catch (err) {
    console.error('Unexpected error in sendChatMessage:', err);
    return { success: false, error: err };
  }
};

/**
 * Subscribes to Realtime INSERT and UPDATE events on the messages table for a specific conversation.
 * Returns an unsubscribe cleanup function.
 */
export const subscribeToConversationMessages = (
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
  onMessageUpdate?: (message: ChatMessage) => void
): (() => void) => {
  const channelName = `chat-messages-${conversationId}-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new) {
          onMessage(payload.new as ChatMessage);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        if (payload.new && onMessageUpdate) {
          onMessageUpdate(payload.new as ChatMessage);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Subscribes to Realtime updates on conversations for a given user.
 * Triggered whenever a new conversation is created or a last_message is updated.
 */
export const subscribeToUserConversations = (
  userId: string,
  onUpdate: () => void
): (() => void) => {
  const channelName = `user-conversations-${userId}-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

/**
 * Marks undelivered messages in a conversation as delivered (sent by other users).
 */
export const markMessagesAsDelivered = async (
  conversationId: string,
  recipientUserId: string
): Promise<{ success: boolean; count?: number; error?: any }> => {
  if (!conversationId || !recipientUserId) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .update({
        delivered_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', recipientUserId)
      .is('delivered_at', null)
      .select('id');

    if (error) {
      console.error('Error marking messages as delivered:', error);
      return { success: false, error };
    }

    return { success: true, count: data ? data.length : 0 };
  } catch (err: any) {
    console.error('Unexpected error in markMessagesAsDelivered:', err);
    return { success: false, error: err };
  }
};

/**
 * Marks unread messages in a conversation as read (sent by other users).
 */
export const markConversationMessagesAsRead = async (
  conversationId: string,
  currentUserId: string
): Promise<{ success: boolean; count?: number; error?: any }> => {
  if (!conversationId || !currentUserId) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('is_read', false)
      .select('id');

    if (error) {
      console.error('Error marking conversation messages as read:', error);
      return { success: false, error };
    }

    return { success: true, count: data ? data.length : 0 };
  } catch (err: any) {
    console.error('Unexpected error in markConversationMessagesAsRead:', err);
    return { success: false, error: err };
  }
};

/**
 * Counts unread messages for a user across all conversations where they are a participant.
 */
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  if (!userId) return 0;

  try {
    // 1. Fetch conversations the user is part of
    const { data: convs, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${userId},owner_id.eq.${userId}`);

    if (convError || !convs || convs.length === 0) {
      return 0;
    }

    const convIds = convs.map((c: any) => c.id);

    // 2. Count unread messages sent by counterparts
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error counting unread messages:', error);
      return 0;
    }

    return count || 0;
  } catch (err) {
    console.error('Unexpected error in getUnreadMessageCount:', err);
    return 0;
  }
};

/**
 * Returns a map of conversation_id -> unread_count for a user.
 */
export const getConversationUnreadCounts = async (
  userId: string
): Promise<Record<string, number>> => {
  if (!userId) return {};

  try {
    const { data: convs, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`buyer_id.eq.${userId},owner_id.eq.${userId}`);

    if (convError || !convs || convs.length === 0) {
      return {};
    }

    const convIds = convs.map((c: any) => c.id);
    const counts: Record<string, number> = {};
    convIds.forEach((id: string) => {
      counts[id] = 0;
    });

    const { data: messages, error } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching conversation unread counts:', error);
      return counts;
    }

    if (messages) {
      for (const msg of messages as { conversation_id: string }[]) {
        counts[msg.conversation_id] = (counts[msg.conversation_id] || 0) + 1;
      }
    }

    return counts;
  } catch (err) {
    console.error('Unexpected error in getConversationUnreadCounts:', err);
    return {};
  }
};

/**
 * Subscribes to realtime changes on the messages table and calls onUpdate.
 */
export const subscribeToUserUnreadMessages = (
  userId: string,
  onUpdate: (payload?: any) => void
): (() => void) => {
  const channelName = `user-unread-messages-${userId}-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

