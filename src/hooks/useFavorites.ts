import { useState, useEffect } from 'react';
import { favoriteHelpers } from '../services/firebase/firebaseHelpers';
import { Property, Favorite } from '../types/database';
import { useAuth } from './useAuth';

interface FavoritesState {
  favorites: Property[];
  loading: boolean;
  error: string | null;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const [state, setState] = useState<FavoritesState>({
    favorites: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const result = await favoriteHelpers.getFavoritesByUser(user!.id);

      if (result.error) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: result.error,
        }));
        return { success: false, error: result.error };
      }

      setState({
        favorites: result.data || [],
        loading: false,
        error: null,
      });

      return { success: true, data: result.data };
    } catch (error: any) {
      const errorMessage = 'Failed to fetch favorites';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  };

  const addToFavorites = async (propertyId: string) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await favoriteHelpers.addFavorite({
        userId: user.id,
        propertyId,
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Refresh favorites list
      await fetchFavorites();

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to add to favorites' };
    }
  };

  const removeFromFavorites = async (propertyId: string) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await favoriteHelpers.removeFavorite(user.id, propertyId);

      if (result.error) {
        return { success: false, error: result.error };
      }

      // Refresh favorites list
      await fetchFavorites();

      return { success: true, data: result.data };
    } catch (error: any) {
      return { success: false, error: 'Failed to remove from favorites' };
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    const isFavorite = state.favorites.some(fav => fav.id === propertyId);
    
    if (isFavorite) {
      return await removeFromFavorites(propertyId);
    } else {
      return await addToFavorites(propertyId);
    }
  };

  const isFavorite = (propertyId: string) => {
    return state.favorites.some(fav => fav.id === propertyId);
  };

  const refreshFavorites = async () => {
    return await fetchFavorites();
  };

  return {
    favorites: state.favorites,
    loading: state.loading,
    error: state.error,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    refreshFavorites,
  };
}; 