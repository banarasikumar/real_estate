export type UserRole = 'USER' | 'OWNER' | 'ADMIN' | 'SUPER_ADMIN';
export type PropertyType = 'APARTMENT' | 'HOUSE' | 'VILLA' | 'COMMERCIAL';
export type ListingType = 'SALE' | 'RENT';
export type FurnishingStatus = 'FURNISHED' | 'SEMI_FURNISHED' | 'UNFURNISHED';
export type PropertyStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'PUBLISHED' | 'PAUSED' | 'UNPUBLISHED' | 'REJECTED' | 'SOLD_RENTED';
export type MediaType = 'IMAGE' | 'VIDEO';
export type EnquiryStatus = 'NEW' | 'READ' | 'RESPONDED' | 'CLOSED';
export type NotificationFrequency = 'INSTANT' | 'DAILY' | 'NEVER';
export type NotificationType = 'NEW_MATCH' | 'PRICE_DROP' | 'TOUR_REQUEST' | 'MESSAGE' | 'SYSTEM';

export type AvailabilityStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RENTED';

export interface Profile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role: UserRole;
  avatar_url: string | null;
  push_token?: string | null;
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
  is_verified?: boolean | null;
  deed_url?: string | null;
  verification_notes?: string | null;
  deleted_at?: string | null;
  parent_property_id?: string | null;
  is_complex?: boolean;
  complex_name?: string | null;
  total_units?: number | null;
  floor_count?: number | null;
  footprint_polygon?: any | null;
  unit_number?: string | null;
  floor_number?: number | null;
  availability_status?: AvailabilityStatus | null;
  units?: (Property | ComplexUnit)[];
  property_media?: (PropertyMedia | any)[];
  created_at: string;
  updated_at: string;
}

export type UnitAvailability = 'AVAILABLE' | 'RESERVED' | 'SOLD';

export interface ComplexUnit {
  id: string;
  complex_id: string;
  parent_property_id?: string | null;
  unit_number: string;
  floor?: number | string | null;
  floor_number?: number | null;
  floor_name?: string | null;
  bedrooms: number;
  bathrooms: number;
  area_sqft?: number | null;
  price: number;
  listing_type: ListingType | string;
  list_type?: ListingType | string;
  availability: UnitAvailability;
  availability_status?: AvailabilityStatus | null;
  status?: string | null;
  created_at?: string;
  updated_at?: string;
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
  read_at?: string | null;
  delivered_at?: string | null;
  status?: 'sending' | 'sent' | 'delivered' | 'failed';
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

export interface SavedSearch {
  id: string;
  user_id?: string | null;
  name: string;
  search_query?: string | null;
  region_id?: string | null;
  filters?: Record<string, any> | null;
  boundary?: any | null;
  notification_frequency?: NotificationFrequency | string;
  alert_new_listings?: boolean;
  alert_price_drops?: boolean;
  new_matches_count?: number;
  created_at: string;
  updated_at?: string;

  // Compatibility aliases for user app and existing stores
  userId?: string | null;
  query?: string | null;
  polygon?: any | null;
  notificationFrequency?: NotificationFrequency | string;
  alert_new_matches?: boolean;
  alert_price_drop?: boolean;
  alertNewMatches?: boolean;
  alertPriceDrop?: boolean;
  match_count?: number;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  property_id?: string | null;
  saved_search_id?: string | null;
  is_read: boolean;
  data?: Record<string, any> | null;
  created_at: string;
  property?: Property | null;
  saved_search?: SavedSearch | null;
}

export interface SearchRegion {
  id: string;
  slug: string;
  name: string;
  city: string;
  state?: string | null;
  center_lat: number;
  center_lng: number;
  zoom: number;
  boundary_polygon: Array<[number, number]> | any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PropertyView {
  id: string;
  property_id: string;
  viewer_id?: string | null;
  device_type?: string;
  source?: string;
  created_at: string;
}

