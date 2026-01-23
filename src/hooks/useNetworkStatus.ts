// src/hooks/useNetworkStatus.ts

import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

export interface NetworkStatus {
  isConnected: boolean;
  isChecking: boolean;
  error?: string;
}

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isChecking: false,
  });

  const updateFromState = useCallback((state: any) => {
    const isConnected = state.isConnected ?? false;

    setStatus({
      isConnected,
      isChecking: false,
      error: isConnected ? undefined : 'No internet connection',
    });
  }, []);

  const retryConnection = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true }));
    const state = await NetInfo.fetch();
    updateFromState(state);
  }, [updateFromState]);

  useEffect(() => {
    // Initial check
    retryConnection();

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener(updateFromState);

    return unsubscribe;
  }, [retryConnection, updateFromState]);

  return {
    ...status,
    retryConnection, 
  };
};
