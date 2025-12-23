// Database types for Supabase tables
export type UserRole = 'owner' | 'tenant';
export type PropertyType = 'apartment' | 'house' | 'studio' | 'townhouse' | 'condo' | 'loft';
export type PropertyStatus = 'available' | 'rented' | 'unavailable' | 'pending';
export type InquiryStatus = 'pending' | 'responded' | 'accepted' | 'rejected' | 'closed';
export type MessageType = 'text' | 'image' | 'file' | 'location';
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type NotificationType = 'message' | 'inquiry' | 'appointment' | 'property_update' | 'system';

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  bio?: string;
  preferences?: Record<string, any>;
  notification_settings: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  location_preferences?: Record<string, any>;
  budget_range?: {
    min: number;
    max: number;
  };
  move_in_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  propertyType: PropertyType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  price: number;
  deposit?: number;
  utilitiesIncluded: boolean;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  furnished: boolean;
  petFriendly: boolean;
  parkingAvailable: boolean;
  amenities?: string[];
  status: PropertyStatus;
  availableDate?: string;
  // Kenyan location fields
  county?: string;
  constituency?: string;
  ward?: string;
  estate?: string;
  building?: string;
  // Media
  media?: PropertyMedia[];
  primaryImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyMedia {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string; // for videos and optional image blur/thumbs
  isPrimary?: boolean;
  order: number;
  bytes: number;
  durationMs?: number;
  originalName?: string;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  image_url: string;
  image_order: number;
  is_primary: boolean;
  alt_text?: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export interface Inquiry {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  subject: string;
  message: string;
  status: InquiryStatus;
  move_in_date?: string;
  budget?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  property_id?: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string;
  created_at: string;
}

export interface ViewingAppointment {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  appointment_date: string;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_id?: string;
  reference_type?: string;
  is_read: boolean;
  created_at: string;
}
