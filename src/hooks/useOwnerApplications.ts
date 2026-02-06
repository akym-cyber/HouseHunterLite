import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import { Application } from '../types/database';
import { useAuth } from './useAuth';

interface OwnerApplicationsState {
  applications: Application[];
  loading: boolean;
  error: string | null;
}

const toTime = (value: any) => {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  return new Date(value).getTime();
};

export const useOwnerApplications = () => {
  const { user } = useAuth();
  const [state, setState] = useState<OwnerApplicationsState>({
    applications: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user?.uid) {
      setState({ applications: [], loading: false, error: null });
      return;
    }

    const appsRef = collection(db, 'applications');
    const q = query(appsRef, where('ownerId', '==', user.uid));

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
  }, [user?.uid]);

  const stats = useMemo(() => {
    const total = state.applications.length;
    const pending = state.applications.filter((app) => app.status === 'pending').length;
    const approved = state.applications.filter((app) => app.status === 'approved').length;
    const rejected = state.applications.filter((app) => app.status === 'rejected').length;
    const needsInfo = state.applications.filter((app) => app.status === 'needs_info').length;
    return { total, pending, approved, rejected, needsInfo };
  }, [state.applications]);

  return {
    ...state,
    stats,
  };
};
