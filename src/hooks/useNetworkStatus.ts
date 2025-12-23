// src/hooks/useNetworkStatus.ts

import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { checkFirebaseConnection } from '../services/firebase/firebaseConfig';

export interface NetworkStatus {
  isConnected: boolean;
  isFirebaseConnected: boolean;
  isChecking: boolean;
  error?: string;
}

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isFirebaseConnected: true,
    isChecking: false,
  });

  useEffect(() => {
    // Initial check
    const checkConnection = async () => {
      setStatus(prev => ({ ...prev, isChecking: true }));
      
      const netInfo = await NetInfo.fetch();
      const isConnected = netInfo.isConnected ?? false;
      
      let isFirebaseConnected = false;
      let error: string | undefined;
      
      if (isConnected) {
        const fbCheck = await checkFirebaseConnection();
        isFirebaseConnected = fbCheck.connected;
        error = fbCheck.error;
      } else {
        error = 'No internet connection';
      }
      
      setStatus({
        isConnected,
        isFirebaseConnected,
        isChecking: false,
        error,
      });
    };

    checkConnection();

    // Subscribe to network changes
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      
      setStatus(prev => ({
        ...prev,
        isConnected,
        isFirebaseConnected: isConnected ? prev.isFirebaseConnected : false,
        error: isConnected ? prev.error : 'No internet connection',
      }));

      // Re-check Firebase when connection is restored
      if (isConnected) {
        checkFirebaseConnection().then(result => {
          setStatus(prev => ({
            ...prev,
            isFirebaseConnected: result.connected,
            error: result.error,
          }));
        });
      }
    });

    return () => {
      unsubscribeNetInfo();
    };
  }, []);

  const retryConnection = async () => {
    setStatus(prev => ({ ...prev, isChecking: true }));
    const result = await checkFirebaseConnection();
    setStatus({
      isConnected: true,
      isFirebaseConnected: result.connected,
      isChecking: false,
      error: result.error,
    });
  };

  return {
    ...status,
    retryConnection,
  };
};

