import React from 'react';
import { Stack } from 'expo-router';
import { defaultTheme } from '../../src/styles/theme';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: defaultTheme.colors.primary,
        },
        headerTintColor: defaultTheme.colors.onPrimary,
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
          headerLeft: () => null, // Let the ChatRoom component handle its own header
        }}
      />
    </Stack>
  );
}
