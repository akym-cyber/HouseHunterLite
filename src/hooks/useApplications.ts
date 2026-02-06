import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import { Application } from '../types/database';
import { useAuth } from './useAuth';

interface ApplicationsState {
  applications: Application[];
  loading: boolean;
  error: string | null;
}

const toTime = (value: any) => {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  return new Date(value).getTime();
};

export const useApplications = (role?: 'owner' | 'tenant') => {
  const { user } = useAuth();
  const [state, setState] = useState<ApplicationsState>({
    applications: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setState({ applications: [], loading: false, error: null });
      return;
    }

    const roleKey = role || 'tenant';
    const field = roleKey === 'owner' ? 'ownerId' : 'tenantId';
    const applicationsRef = collection(db, 'applications');
    const q = query(applicationsRef, where(field, '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const applications: Application[] = [];
        snapshot.forEach((docSnap) => {
          applications.push({ id: docSnap.id, ...docSnap.data() } as Application);
        });
        applications.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
        setState({ applications, loading: false, error: null });
      },
      (error) => {
        setState({ applications: [], loading: false, error: error.message || 'Failed to load applications' });
      }
    );

    return () => unsubscribe();
  }, [user, role]);

  const pendingCount = useMemo(
    () => state.applications.filter((app) => app.status === 'pending').length,
    [state.applications]
  );

  return {
    ...state,
    pendingCount,
  };
};
