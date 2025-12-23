// src/components/common/NetworkStatus.tsx

import React from 'react';
import { StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const NetworkStatus: React.FC = () => {
  const { isConnected, isFirebaseConnected, error, retryConnection } = useNetworkStatus();

  const showWarning = !isConnected || !isFirebaseConnected;
  const message = !isConnected 
    ? 'No internet connection' 
    : !isFirebaseConnected 
    ? 'Firebase connection failed. Some features may be limited.'
    : '';

  return (
    <Snackbar
      visible={showWarning}
      onDismiss={() => {}}
      action={{
        label: isFirebaseConnected ? 'Dismiss' : 'Retry',
        onPress: () => {
          if (!isFirebaseConnected) {
            retryConnection();
          }
        },
      }}
      duration={Snackbar.DURATION_INDEFINITE}
      style={styles.snackbar}
    >
      {message}
    </Snackbar>
  );
};

const styles = StyleSheet.create({
  snackbar: {
    marginBottom: 60,
  },
});

