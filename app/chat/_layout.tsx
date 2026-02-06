import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';

export default function ChatLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        animation: 'slide_from_right',
        gestureEnabled: true, // Enable swipe back gesture on iOS
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Chat',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
