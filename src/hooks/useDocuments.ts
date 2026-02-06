import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase/firebaseConfig';
import { Document } from '../types/database';
import { useAuth } from './useAuth';

interface DocumentsState {
  documents: Document[];
  loading: boolean;
  error: string | null;
}

const toTime = (value: any) => {
  if (!value) return 0;
  if (value?.toDate) return value.toDate().getTime();
  return new Date(value).getTime();
};

export const useDocuments = () => {
  const { user } = useAuth();
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!user) {
      setState({ documents: [], loading: false, error: null });
      return;
    }

    const documentsRef = collection(db, 'documents');
    const q = query(documentsRef, where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const documents: Document[] = [];
        snapshot.forEach((docSnap) => {
          documents.push({ id: docSnap.id, ...docSnap.data() } as Document);
        });
        documents.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
        setState({ documents, loading: false, error: null });
      },
      (error) => {
        setState({ documents: [], loading: false, error: error.message || 'Failed to load documents' });
      }
    );

    return () => unsubscribe();
  }, [user]);

  return state;
};
