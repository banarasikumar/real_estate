export type Role = 'USER' | 'OWNER' | 'ADMIN' | 'SUPER_ADMIN';

export type PropertyStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'PAUSED' | 'REJECTED' | 'SOLD_RENTED';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: Role;
  avatar_url?: string;
  phone_number?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  property_id: string;
  buyer_id: string;
  owner_id: string;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  properties?: {
    id: string;
    title: string;
    address?: string;
    price?: number | string;
    property_media?: { url: string }[];
  } | null;
  buyer?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    phone_number?: string;
  } | null;
  owner?: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    phone_number?: string;
  } | null;
}
