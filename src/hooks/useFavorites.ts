import { useEffect, useRef, useState } from 'react';
import { favoriteHelpers, propertyHelpers } from '../services/firebase/firebaseHelpers';
import { Property } from '../types/database';
import { useAuth } from './useAuth';
import { collection, deleteDoc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';

interface FavoritesState {
  favorites: Property[];
  loading: boolean;
  error: string | null;
}

const readFavoritePropertyId = (data: Record<string, unknown>): string | null => {
  const legacy = typeof data.property_id === 'string' ? data.property_id.trim() : '';
  if (legacy) return legacy;

  const modern = typeof data.propertyId === 'string' ? data.propertyId.trim() : '';
  return modern || null;
};

export const useFavorites = () => {
  const { user } = useAuth();
  const [state, setState] = useState<FavoritesState>({
    favorites: [],
    loading: true,
    error: null,
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) {
      setState((prev) => ({ ...prev, favorites: [], loading: false, error: null }));
      return;
    }

    const favoritesPath = `users/${user.uid}/favorites`;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const favoritesRef = collection(db, favoritesPath);
    const q = query(favoritesRef, orderBy('created_at', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const dedupedRows: Array<{ propertyId: string; ref: (typeof snapshot.docs)[number]['ref'] }> = [];
          const duplicateOrInvalidRefs: Array<(typeof snapshot.docs)[number]['ref']> = [];
          const seenPropertyIds = new Set<string>();

          snapshot.forEach((row) => {
            const propertyId = readFavoritePropertyId(row.data() as Record<string, unknown>);
            if (!propertyId) {
              duplicateOrInvalidRefs.push(row.ref);
              return;
            }

            if (seenPropertyIds.has(propertyId)) {
              duplicateOrInvalidRefs.push(row.ref);
              return;
            }

            seenPropertyIds.add(propertyId);
            dedupedRows.push({ propertyId, ref: row.ref });
          });

          const propertyResults = await Promise.all(
            dedupedRows.map(async (row) => ({
              row,
              result: await propertyHelpers.getPropertyById(row.propertyId),
            }))
          );

          const staleRows = propertyResults.filter(
            ({ result }) => !result.data && result.error === 'Property not found'
          );

          if (staleRows.length > 0 && user?.uid) {
            await Promise.allSettled(
              staleRows.map(async ({ row }) => {
                await deleteDoc(row.ref);

                const savedRef = collection(db, 'saved_properties');
                const savedByUser = await getDocs(query(savedRef, where('userId', '==', user.uid)));

                const docsToDelete = new Map<string, (typeof savedByUser.docs)[number]['ref']>();
                savedByUser.forEach((savedDoc) => {
                  const savedData = savedDoc.data() as { propertyId?: string; property_id?: string };
                  const savedPropertyId =
                    (typeof savedData.propertyId === 'string' ? savedData.propertyId.trim() : '') ||
                    (typeof savedData.property_id === 'string' ? savedData.property_id.trim() : '');
                  if (savedPropertyId === row.propertyId) {
                    docsToDelete.set(savedDoc.ref.path, savedDoc.ref);
                  }
                });

                await Promise.allSettled(Array.from(docsToDelete.values()).map((ref) => deleteDoc(ref)));
              })
            );
            return;
          }

          if (duplicateOrInvalidRefs.length > 0) {
            await Promise.allSettled(duplicateOrInvalidRefs.map((ref) => deleteDoc(ref)));
          }

          const properties = propertyResults
            .map(({ result }) => result.data)
            .filter((item): item is Property => !!item);

          setState({
            favorites: properties,
            loading: false,
            error: null,
          });
        } catch (error: any) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'Failed to load favorites',
          }));
        }
      },
      () => {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to listen to favorites',
        }));
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
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
        userId: user.uid,
        propertyId,
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch {
      return { success: false, error: 'Failed to add to favorites' };
    }
  };

  const removeFromFavorites = async (propertyId: string) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const result = await favoriteHelpers.removeFavorite(user.uid, propertyId);

      if (result.error) {
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch {
      return { success: false, error: 'Failed to remove from favorites' };
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    const currentlyFavorite = state.favorites.some((fav) => fav.id === propertyId);
    if (currentlyFavorite) {
      return removeFromFavorites(propertyId);
    }
    return addToFavorites(propertyId);
  };

  const isFavorite = (propertyId: string) => {
    return state.favorites.some((fav) => fav.id === propertyId);
  };

  const refreshFavorites = async () => {
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
