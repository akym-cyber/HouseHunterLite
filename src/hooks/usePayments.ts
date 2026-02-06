import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import { Payment } from '../types/database';
import { useAuth } from './useAuth';

interface PaymentsState {
  payments: Payment[];
  loading: boolean;
  error: string | null;
}

const toTime = (value: any) => {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  return new Date(value).getTime();
};

export const usePayments = (role?: 'owner' | 'tenant') => {
  const { user } = useAuth();
  const [state, setState] = useState<PaymentsState>({
    payments: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setState({ payments: [], loading: false, error: null });
      return;
    }

    const roleKey = role || 'tenant';
    const field = roleKey === 'owner' ? 'ownerId' : 'tenantId';
    const paymentsRef = collection(db, 'payments');
    const q = query(paymentsRef, where(field, '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const payments: Payment[] = [];
        snapshot.forEach((docSnap) => {
          payments.push({ id: docSnap.id, ...docSnap.data() } as Payment);
        });
        payments.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
        setState({ payments, loading: false, error: null });
      },
      (error) => {
        setState({ payments: [], loading: false, error: error.message || 'Failed to load payments' });
      }
    );

    return () => unsubscribe();
  }, [user, role]);

  const paidTotal = useMemo(() => {
    return state.payments
      .filter((payment) => payment.status === 'paid')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  }, [state.payments]);

  return {
    ...state,
    paidTotal,
  };
};
