// Application constants and configuration

export const APP_CONFIG = {
  name: 'HouseHunter',
  version: '1.0.0',
  description: 'Find your perfect rental property',
};

export const PROPERTY_TYPES = [
  { label: 'Apartment', value: 'apartment' },
  { label: 'House', value: 'house' },
  { label: 'Studio', value: 'studio' },
  { label: 'Townhouse', value: 'townhouse' },
  { label: 'Condo', value: 'condo' },
  { label: 'Loft', value: 'loft' },
] as const;

export const PROPERTY_STATUS = [
  { label: 'Available', value: 'available' },
  { label: 'Rented', value: 'rented' },
  { label: 'Unavailable', value: 'unavailable' },
  { label: 'Pending', value: 'pending' },
] as const;

export const AMENITIES = [
  'Air Conditioning',
  'Heating',
  'Dishwasher',
  'Washer/Dryer',
  'Balcony',
  'Garden',
  'Gym',
  'Pool',
  'Parking',
  'Security System',
  'Furnished',
  'Pet Friendly',
  'Utilities Included',
  'High-Speed Internet',
  'Storage',
] as const;

export const BEDROOM_OPTIONS = [
  { label: 'Studio', value: 0 },
  { label: '1 Bedroom', value: 1 },
  { label: '2 Bedrooms', value: 2 },
  { label: '3 Bedrooms', value: 3 },
  { label: '4+ Bedrooms', value: 4 },
] as const;

export const BATHROOM_OPTIONS = [
  { label: '1 Bathroom', value: 1 },
  { label: '1.5 Bathrooms', value: 1.5 },
  { label: '2 Bathrooms', value: 2 },
  { label: '2.5 Bathrooms', value: 2.5 },
  { label: '3+ Bathrooms', value: 3 },
] as const;

export const PRICE_RANGES = [
  { label: 'Under $500', value: { min: 0, max: 500 } },
  { label: '$500 - $1,000', value: { min: 500, max: 1000 } },
  { label: '$1,000 - $1,500', value: { min: 1000, max: 1500 } },
  { label: '$1,500 - $2,000', value: { min: 1500, max: 2000 } },
  { label: '$2,000 - $3,000', value: { min: 2000, max: 3000 } },
  { label: '$3,000+', value: { min: 3000, max: null } },
] as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PROFILE: 'user_profile',
  SEARCH_HISTORY: 'search_history',
  FAVORITES: 'favorites',
  NOTIFICATION_SETTINGS: 'notification_settings',
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  PROPERTIES: {
    LIST: '/properties',
    DETAIL: '/properties/:id',
    CREATE: '/properties',
    UPDATE: '/properties/:id',
    DELETE: '/properties/:id',
    SEARCH: '/properties/search',
  },
  MESSAGES: {
    LIST: '/messages',
    SEND: '/messages',
    CONVERSATIONS: '/conversations',
  },
  FAVORITES: {
    LIST: '/favorites',
    ADD: '/favorites',
    REMOVE: '/favorites/:id',
  },
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unknown error occurred.',
} as const;

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  REGISTER_SUCCESS: 'Account created successfully!',
  PROPERTY_CREATED: 'Property listed successfully!',
  PROPERTY_UPDATED: 'Property updated successfully!',
  MESSAGE_SENT: 'Message sent successfully!',
  FAVORITE_ADDED: 'Added to favorites!',
  FAVORITE_REMOVED: 'Removed from favorites!',
} as const;

export const VALIDATION_RULES = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  PASSWORD_MIN_LENGTH: 8,
  TITLE_MIN_LENGTH: 10,
  TITLE_MAX_LENGTH: 255,
  DESCRIPTION_MAX_LENGTH: 1000,
  PRICE_MIN: 0,
  PRICE_MAX: 100000,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  INQUIRY: 'inquiry',
  APPOINTMENT: 'appointment',
  PROPERTY_UPDATE: 'property_update',
  SYSTEM: 'system',
} as const;

// Pre-compiled regex for Kenya location detection (case-insensitive)
const KENYA_LOCATION_REGEX = /\b(kenya|mombasa|nairobi)\b/i;

// Utility functions
export const formatPrice = (price: number, location?: string | null): string => {
  // Handle null/undefined location gracefully
  if (!location) {
    return `$${price.toLocaleString()}/mo`;
  }

  // Check if location contains Kenya-specific keywords using pre-compiled regex
  if (KENYA_LOCATION_REGEX.test(location)) {
    return `KSh ${price.toLocaleString('en-KE')}/mo`;
  } else {
    return `$${price.toLocaleString()}/mo`;
  }
};
