import { useState, useEffect } from 'react';
import { propertyHelpers } from '../services/firebase/firebaseHelpers';
import { useAuth } from './useAuth';

export const useProperties = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProperties = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      let result;

      // Role-based filtering
      if (user?.role === 'owner') {
        console.log('[useProperties JS] OWNER MODE - currentUser.uid:', user.uid);
        console.log('[useProperties JS] OWNER MODE - user.role:', user.role);
        console.log('[useProperties JS] OWNER MODE - Firestore query: getPropertiesByOwner with ownerId =', user.uid);
        result = await propertyHelpers.getPropertiesByOwner(user.uid);
        console.log('[useProperties JS] OWNER MODE - Query result:', result?.data?.length || 0, 'properties found');
      } else {
        // Apply filters for tenants, defaulting to available properties
        const searchFilters = { ...filters, status: 'available' };
        console.log('[useProperties JS] TENANT MODE - currentUser.uid:', user?.uid);
        console.log('[useProperties JS] TENANT MODE - user.role:', user?.role);
        console.log('[useProperties JS] TENANT MODE - Firestore query: searchProperties with filters:', searchFilters);
        result = await propertyHelpers.searchProperties(searchFilters);
        console.log('[useProperties JS] TENANT MODE - Query result:', result?.data?.length || 0, 'properties found');
      }

      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }

      setProperties(result.data);
      return { success: true, data: result.data };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProperties = async () => {
    return await fetchProperties();
  };

  const fetchPropertiesByOwner = async (ownerId) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await propertyHelpers.getPropertiesByOwner(ownerId);
      
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      
      setProperties(result.data);
      return { success: true, data: result.data };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertyById = async (propertyId) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await propertyHelpers.getPropertyById(propertyId);
      
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      
      return { success: true, data: result.data };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const addProperty = async (propertyData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await propertyHelpers.addProperty(propertyData);
      
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      
      // Add to local state
      setProperties(prev => [result.data, ...prev]);
      
      return { success: true, data: result.data };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const updateProperty = async (propertyId, updateData) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await propertyHelpers.updateProperty(propertyId, updateData);
      
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      
      // Update in local state
      setProperties(prev => 
        prev.map(property => 
          property.id === propertyId 
            ? { ...property, ...result.data }
            : property
        )
      );
      
      return { success: true, data: result.data };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteProperty = async (propertyId) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await propertyHelpers.deleteProperty(propertyId);
      
      if (result.error) {
        setError(result.error);
        return { success: false, error: result.error };
      }
      
      // Remove from local state
      setProperties(prev => prev.filter(property => property.id !== propertyId));
      
      return { success: true, data: result.data };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const searchProperties = async (filters) => {
    return await fetchProperties(filters);
  };

  return {
    properties,
    loading,
    error,
    fetchAllProperties,
    fetchPropertiesByOwner,
    fetchPropertyById,
    addProperty,
    updateProperty,
    deleteProperty,
    searchProperties
  };
}; 