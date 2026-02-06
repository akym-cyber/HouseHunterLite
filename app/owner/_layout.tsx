import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';

export default function OwnerStackLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    />
  );
}
