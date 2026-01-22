import { useState, useEffect, useCallback, useRef } from 'react';
import { favoriteHelpers, propertyHelpers } from '../services/firebase/firebaseHelpers';
import { Property, Favorite } from '../types/database';
import { useAuth } from './useAuth';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';

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

  // Store unsubscribe function for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Real-time favorites listener
  useEffect(() => {
    if (!user) {
      console.log('🔍 useFavorites: No user, skipping favorites listener');
      setState(prev => ({ ...prev, favorites: [], loading: false, error: null }));
      return;
    }

    console.log('🔍 useFavorites: Setting up real-time favorites listener for user:', user.id);
    setState(prev => ({ ...prev, loading: true, error: null }));

    const favoritesRef = collection(db, 'favorites');
    const q = query(
      favoritesRef,
      where('user_id', '==', user.id),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        console.log('🔍 useFavorites: Snapshot received, size:', snapshot.size);

        const favoriteIds: string[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log('🔍 useFavorites: Favorite doc:', doc.id, '-> property_id:', data.property_id);
          favoriteIds.push(data.property_id);
        });

        console.log('🔍 useFavorites: Found favorite property IDs:', favoriteIds);

        // Fetch property details for all favorites
        const properties: Property[] = [];
        for (const propertyId of favoriteIds) {
          const propertyResult = await propertyHelpers.getPropertyById(propertyId);
          if (propertyResult.data) {
            properties.push(propertyResult.data);
          } else {
            console.warn('🔍 useFavorites: Property not found:', propertyId);
          }
        }

        console.log('🔍 useFavorites: Setting favorites state length:', properties.length);
        setState({
          favorites: properties, // Always replace, never mutate
          loading: false,
          error: null,
        });

      } catch (error: any) {
        console.error('🔍 useFavorites: Snapshot error:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load favorites',
        }));
      }
    }, (error) => {
      console.error('🔍 useFavorites: Listener error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to listen to favorites',
      }));
    });

    // Store unsubscribe function for cleanup
    unsubscribeRef.current = unsubscribe;

    // Cleanup function
    return () => {
      console.log('🔍 useFavorites: Cleaning up favorites listener');
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [user]);

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

      // UI will automatically update via onSnapshot listener
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

      // UI will automatically update via onSnapshot listener
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

  // With real-time listeners, manual refresh is not needed
  const refreshFavorites = async () => {
    console.log('🔍 useFavorites: Manual refresh called - UI updates automatically via onSnapshot');
    return { success: true };
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
