// src/hooks/useNetworkStatus.ts

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { checkFirebaseConnection } from '../services/firebase/firebaseConfig';

// Web-safe NetInfo import
let NetInfo: any = null;
if (Platform.OS !== 'web') {
  try {
    NetInfo = require('@react-native-community/netinfo');
  } catch (error) {
    console.warn('NetInfo not available:', error);
  }
}

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
    // Initial check - web-safe
    const checkConnection = async () => {
      setStatus(prev => ({ ...prev, isChecking: true }));

      let isConnected = true; // Assume connected on web by default
      if (NetInfo && NetInfo.fetch) {
        try {
          const netInfo = await NetInfo.fetch();
          isConnected = netInfo.isConnected ?? false;
        } catch (error) {
          console.warn('NetInfo fetch failed:', error);
          isConnected = navigator.onLine ?? true; // Fallback to navigator.onLine
        }
      } else if (Platform.OS === 'web') {
        // Web fallback
        isConnected = navigator.onLine ?? true;
      }

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

    // Subscribe to network changes - web-safe
    let unsubscribeNetInfo: (() => void) | undefined;

    if (NetInfo && NetInfo.addEventListener) {
      try {
        unsubscribeNetInfo = NetInfo.addEventListener(state => {
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
      } catch (error) {
        console.warn('NetInfo event listener failed:', error);
      }
    } else if (Platform.OS === 'web') {
      // Web fallback - listen to online/offline events
      const handleOnline = () => setStatus(prev => ({ ...prev, isConnected: true, error: undefined }));
      const handleOffline = () => setStatus(prev => ({ ...prev, isConnected: false, error: 'No internet connection' }));

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      unsubscribeNetInfo = () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      if (unsubscribeNetInfo) {
        unsubscribeNetInfo();
      }
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
