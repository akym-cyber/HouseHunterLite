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
        console.log('[useProperties] OWNER MODE - currentUser.uid:', user.uid);
        console.log('[useProperties] OWNER MODE - user.role:', user.role);
        console.log('[useProperties] OWNER MODE - Firestore query: getPropertiesByOwner with ownerId =', user.uid);
        result = await propertyHelpers.getPropertiesByOwner(user.uid);
        console.log('[useProperties] OWNER MODE - Query result:', result?.data?.length || 0, 'properties found');
      } else {
        // If user is tenant, show approved/available properties
        console.log('[useProperties] TENANT MODE - currentUser.uid:', user.uid);
        console.log('[useProperties] TENANT MODE - user.role:', user.role);
        console.log('[useProperties] TENANT MODE - Firestore query: searchProperties with status = available');
        result = await propertyHelpers.searchProperties({ status: 'available' });
        console.log('[useProperties] TENANT MODE - Query result:', result?.data?.length || 0, 'properties found');
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

      let result;

      // Role-based search filtering
      if (user?.role === 'owner') {
        // Owners search only their own properties
        console.log('[searchProperties] OWNER MODE - currentUser.uid:', user.uid);
        console.log('[searchProperties] OWNER MODE - user.role:', user.role);
        console.log('[searchProperties] OWNER MODE - Firestore query: getPropertiesByOwner (no additional filters applied to owner properties)');
        result = await propertyHelpers.getPropertiesByOwner(user.uid);
        console.log('[searchProperties] OWNER MODE - Query result:', result?.data?.length || 0, 'properties found');

        // Apply client-side filtering for owner properties (since we can't filter owner's properties by status in Firestore easily)
        if (result.data) {
          let filteredData = result.data;

          // Apply location filter
          if (filters.location) {
            filteredData = filteredData.filter(property =>
              property.city?.toLowerCase().includes(filters.location!.toLowerCase()) ||
              property.state?.toLowerCase().includes(filters.location!.toLowerCase()) ||
              property.county?.toLowerCase().includes(filters.location!.toLowerCase())
            );
          }

          // Apply price filters
          if (filters.minPrice) {
            filteredData = filteredData.filter(property => property.price >= filters.minPrice!);
          }
          if (filters.maxPrice) {
            filteredData = filteredData.filter(property => property.price <= filters.maxPrice!);
          }

          // Apply property type filter
          if (filters.propertyType && filters.propertyType.length > 0) {
            filteredData = filteredData.filter(property => filters.propertyType!.includes(property.propertyType));
          }

          // Apply bedroom filter
          if (filters.bedrooms) {
            filteredData = filteredData.filter(property => property.bedrooms === filters.bedrooms);
          }

          // Apply other filters
          if (filters.petFriendly !== undefined) {
            filteredData = filteredData.filter(property => property.petFriendly === filters.petFriendly);
          }
          if (filters.furnished !== undefined) {
            filteredData = filteredData.filter(property => property.furnished === filters.furnished);
          }
          if (filters.parking !== undefined) {
            filteredData = filteredData.filter(property => property.parkingAvailable === filters.parking);
          }

          result.data = filteredData;
        }
      } else {
        // Tenants search available properties with filters
        console.log('[searchProperties] TENANT MODE - currentUser.uid:', user?.uid);
        console.log('[searchProperties] TENANT MODE - user.role:', user?.role);

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

        console.log('[searchProperties] TENANT MODE - Firestore query: searchProperties with filters:', searchFilters);
        result = await propertyHelpers.searchProperties(searchFilters);
        console.log('[searchProperties] TENANT MODE - Query result:', result?.data?.length || 0, 'properties found');
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
        ownerId: user.uid,
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