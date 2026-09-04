export type UserRole = 'USER' | 'OWNER' | 'ADMIN' | 'SUPER_ADMIN';
export type PropertyType = 'APARTMENT' | 'HOUSE' | 'VILLA' | 'COMMERCIAL';
export type ListingType = 'SALE' | 'RENT';
export type FurnishingStatus = 'FURNISHED' | 'SEMI_FURNISHED' | 'UNFURNISHED';
export type PropertyStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'PAUSED' | 'UNPUBLISHED' | 'REJECTED' | 'SOLD_RENTED';
export type MediaType = 'IMAGE' | 'VIDEO';
export type EnquiryStatus = 'NEW' | 'READ' | 'RESPONDED' | 'CLOSED';

export interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  prop_type: PropertyType;
  list_type: ListingType;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  furnishing: FurnishingStatus | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: PropertyStatus;
  is_approved?: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyMedia {
  id: string;
  property_id: string;
  url: string;
  type: MediaType;
  is_featured: boolean;
  display_order: number;
  created_at: string;
}

export interface Enquiry {
  id: string;
  property_id: string;
  user_id?: string | null;
  owner_id?: string | null;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  message: string;
  status: EnquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface SavedProperty {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  is_read?: boolean;
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
    address?: string | null;
    price?: number | string | null;
    property_media?: { url: string }[] | null;
  } | null;
  buyer?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
    phone_number?: string | null;
  } | null;
  owner?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
    phone_number?: string | null;
  } | null;
}
