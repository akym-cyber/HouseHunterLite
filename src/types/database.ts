// Database types for Supabase tables
export type UserRole = 'owner' | 'tenant';
export type PropertyType = 'apartment' | 'house' | 'studio' | 'townhouse' | 'condo' | 'loft';
export type PropertyStatus = 'available' | 'rented' | 'unavailable' | 'pending';
export type InquiryStatus = 'pending' | 'responded' | 'accepted' | 'rejected' | 'closed';
export type MessageType = 'text' | 'image' | 'file' | 'location' | 'property_offer' | 'audio';
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type ViewingType = 'in_person' | 'virtual' | 'self_guided';
export type ViewingStatus = AppointmentStatus | 'declined';
export type NotificationType = 'message' | 'inquiry' | 'appointment' | 'property_update' | 'system';
export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'needs_info';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface User {
  id: string;
  uid?: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  photoURL?: string;
  name?: string;
  shareContactInfo?: boolean;
  isOnline?: boolean;
  lastSeen?: any;
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
  viewingDays?: number[];
  viewingTimeSlots?: ViewingTimeSlotRange[] | string[];
  blockedDates?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ViewingTimeSlotRange {
  start: string; // 24h "HH:MM"
  end: string; // 24h "HH:MM"
  days?: WeekdayKey[];
}

export interface Application {
  id: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  message?: string;
  status: ApplicationStatus;
  decisionDate?: any;
  decisionNotes?: string;
  createdAt: any;
  updatedAt: any;
}

export interface Payment {
  id: string;
  propertyId?: string;
  tenantId: string;
  ownerId: string;
  amount: number;
  currency?: string;
  status: PaymentStatus;
  dueDate?: string;
  paidAt?: any;
  createdAt: any;
  updatedAt: any;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  type: 'lease' | 'id' | 'contract' | 'other';
  url: string;
  createdAt: any;
  updatedAt: any;
}

export interface SavedProperty {
  id: string;
  userId: string;
  propertyId: string;
  createdAt: any;
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
  property_offer_id?: string;
  // Enhanced fields for advanced messaging
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  reply_to?: string; // Message ID being replied to
  reactions?: { [emoji: string]: string[] }; // emoji -> user IDs
  edited_at?: string;
  deleted_at?: string;
  deleted_for?: string[]; // user IDs who deleted for me
  deleted_for_everyone?: boolean;
  deleted_by?: string;
  local_uri?: string;
  upload_status?: 'uploading' | 'uploaded' | 'failed';
  upload_progress?: number; // 0-1
  retry_count?: number;
  // Media and rich content fields
  media?: MessageMedia[];
  link_preview?: LinkPreview;
  location?: LocationData;
  contact?: ContactData;
  poll?: PollData;
  mentions?: string[]; // User IDs mentioned in message
}

export interface MessageMedia {
  id: string;
  type: 'image' | 'video' | 'audio' | 'voice' | 'document';
  url: string;
  thumbnail_url?: string;
  filename?: string;
  file_size?: number;
  mime_type?: string;
  format?: 'm4a' | 'webm';
  width?: number;
  height?: number;
  duration?: number; // for video/audio/voice
  waveform?: number[]; // for voice messages
}

export interface VoiceMessageData {
  duration: number;
  waveform: number[];
  sample_rate?: number;
  channels?: number;
}

export interface VoiceUploadPayload extends VoiceMessageData {
  uri: string;
  format: 'm4a' | 'webm';
  mimeType: string;
  blob?: Blob;
}

export interface SearchFilter {
  text: boolean;
  images: boolean;
  voice: boolean;
  files: boolean;
}

export interface MessageSecurity {
  encrypted: boolean;
  self_destruct?: number; // seconds until auto-delete
  screenshot_warning: boolean;
}

export interface ModerationAction {
  type: 'block' | 'unblock' | 'report' | 'delete' | 'archive' | 'star';
  reason?: string;
  category?: 'spam' | 'harassment' | 'inappropriate' | 'other';
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  site_name?: string;
  favicon?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  place_name?: string;
}

export interface ContactData {
  name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
}

export interface PollData {
  question: string;
  options: PollOption[];
  multiple_choice: boolean;
  expires_at?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // User IDs who voted
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  timestamp: string;
}

export interface Conversation {
  id: string;
  property_id?: string;
  ownerId?: string;
  propertyReferences?: string[];
  participants: string[]; // Array of Firebase Auth UID strings
  participant1_id?: string; // Legacy support
  participant2_id?: string; // Legacy support
  last_message_at: string;
  created_at: string;
  createdBy?: string; // For debugging legacy conversations
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

export interface Viewing {
  id: string;
  propertyId: string;
  tenantId: string;
  ownerId: string;
  scheduledAt: any;
  timeSlot: string;
  viewingType: ViewingType;
  status: ViewingStatus;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
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
