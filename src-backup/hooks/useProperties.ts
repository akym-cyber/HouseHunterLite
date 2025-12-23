import { useState, useEffect } from 'react';
import { propertyHelpers } from '../services/firebase/firebaseHelpers';
import { Property } from '../types/database';
import { useAuth } from './useAuth';

interface PropertiesState {
  properties: Property[];
  loading: boolean;
  error: string | null;
}

interface SearchFilters {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string[];
  bedrooms?: number;
  bathrooms?: number;
  petFriendly?: boolean;
  furnished?: boolean;
  parking?: boolean;
  status?: string;
}

export const useProperties = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PropertiesState>({
    properties: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  const fetchProperties = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      let result;
      
      // If user is owner, show their properties
      if (user?.role === 'owner') {
        result = await propertyHelpers.getPropertiesByOwner(user.id);
      } else {
        // If user is tenant, show available properties
        result = await propertyHelpers.searchProperties({ status: 'available' });
      }

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error,
        }));
        return { success: false, error: result.error };
      }

      setState({
        properties: result.data || [],
        loading: false,
        error: null,
      });

      return { success: true, data: result.data };
    } catch (error: any) {
      const errorMessage = 'Failed to fetch properties';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const searchProperties = async (filters: SearchFilters) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const searchFilters: any = { status: 'available' };

      // Apply filters
      if (filters.location) {
        searchFilters.city = filters.location;
      }
      if (filters.minPrice) {
        searchFilters.minPrice = filters.minPrice;
      }
      if (filters.maxPrice) {
        searchFilters.maxPrice = filters.maxPrice;
      }
      if (filters.propertyType && filters.propertyType.length > 0) {
        searchFilters.propertyType = filters.propertyType[0]; // Firestore doesn't support array queries easily
      }
      if (filters.bedrooms) {
        searchFilters.bedrooms = filters.bedrooms;
      }
      if (filters.petFriendly !== undefined) {
        searchFilters.petFriendly = filters.petFriendly;
      }
      if (filters.furnished !== undefined) {
        searchFilters.furnished = filters.furnished;
      }
      if (filters.parking !== undefined) {
        searchFilters.parkingAvailable = filters.parking;
      }

      const result = await propertyHelpers.searchProperties(searchFilters);

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error,
        }));
        return { success: false, error: result.error };
      }

      setState({
        properties: result.data || [],
        loading: false,
        error: null,
      });

      return { success: true, data: result.data };
    } catch (error: any) {
      const errorMessage = 'Failed to search properties';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const getPropertyById = async (propertyId: string) => {
    try {
      const result = await propertyHelpers.getPropertyById(propertyId);

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to fetch property' };
    }
  };

  const createProperty = async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await propertyHelpers.addProperty({
        ...propertyData,
        ownerId: user.id,
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Refresh properties list
      await fetchProperties();

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to create property' };
    }
  };

  const updateProperty = async (propertyId: string, updates: Partial<Property>) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await propertyHelpers.updateProperty(propertyId, updates);

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Refresh properties list
      await fetchProperties();

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to update property' };
    }
  };

  const deleteProperty = async (propertyId: string) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await propertyHelpers.deleteProperty(propertyId);

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Refresh properties list
      await fetchProperties();

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to delete property' };
    }
  };

  const refreshProperties = async () => {
    return await fetchProperties();
  };

  return {
    properties: state.properties,
    loading: state.loading,
    error: state.error,
    fetchProperties,
    searchProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    refreshProperties,
  };
}; 