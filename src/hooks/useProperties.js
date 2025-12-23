import { useState, useEffect } from 'react';
import { propertyHelpers } from '../services/firebase/firebaseHelpers';

export const useProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProperties = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await propertyHelpers.searchProperties(filters);
      
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