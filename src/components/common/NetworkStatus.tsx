// src/components/common/NetworkStatus.tsx

import React from 'react';
import { StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const NetworkStatus: React.FC = () => {
  const { isConnected } = useNetworkStatus();

  const showWarning = !isConnected;
  const message = !isConnected ? 'No internet connection' : '';

  return (
    <Snackbar
      visible={showWarning}
      onDismiss={() => {}}
      duration={999999}
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

