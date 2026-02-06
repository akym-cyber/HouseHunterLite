import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import { Viewing } from '../types/database';
import { useAuth } from './useAuth';

interface ViewingsState {
  viewings: Viewing[];
  loading: boolean;
  error: string | null;
}

export const useViewings = (role?: 'owner' | 'tenant') => {
  const { user } = useAuth();
  const [state, setState] = useState<ViewingsState>({
    viewings: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setState({ viewings: [], loading: false, error: null });
      return;
    }

    const roleKey = role || user.role || 'tenant';
    const field = roleKey === 'owner' ? 'ownerId' : 'tenantId';

    const viewingsRef = collection(db, 'viewings');
    const q = query(viewingsRef, where(field, '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const viewings: Viewing[] = [];
        snapshot.forEach((docSnap) => {
          viewings.push({ id: docSnap.id, ...docSnap.data() } as Viewing);
        });
        viewings.sort((a, b) => {
          const aTime = a?.scheduledAt?.toDate ? a.scheduledAt.toDate().getTime() : new Date(a.scheduledAt).getTime();
          const bTime = b?.scheduledAt?.toDate ? b.scheduledAt.toDate().getTime() : new Date(b.scheduledAt).getTime();
          return aTime - bTime;
        });
        setState({ viewings, loading: false, error: null });
      },
      (error) => {
        setState({ viewings: [], loading: false, error: error.message || 'Failed to load viewings' });
      }
    );

    return () => unsubscribe();
  }, [user, role]);

  const upcomingViewings = useMemo(() => {
    const now = new Date().getTime();
    return state.viewings.filter((viewing) => {
      const scheduled = viewing?.scheduledAt?.toDate ? viewing.scheduledAt.toDate().getTime() : new Date(viewing.scheduledAt).getTime();
      return scheduled >= now && !['cancelled', 'declined', 'completed'].includes(viewing.status);
    });
  }, [state.viewings]);

  return {
    ...state,
    upcomingViewings,
  };
};
