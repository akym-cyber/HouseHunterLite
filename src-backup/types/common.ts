// Common types used throughout the application

export interface ApiResponse<T = any> {
  data: T;
  error: string | null;
  success: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface SearchFilters {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string[];
  bedrooms?: number;
  bathrooms?: number;
  petFriendly?: boolean;
  furnished?: boolean;
  parking?: boolean;
  moveInDate?: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ImageUpload {
  uri: string;
  type: string;
  name: string;
  size: number;
}

export interface FormField {
  value: string | number | boolean;
  error?: string;
  touched: boolean;
}

export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  error: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  info: string;
}

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  googleMapsApiKey: string;
  appName: string;
  version: string;
} 