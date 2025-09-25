import React from 'react';
import { Stack } from 'expo-router';
import { defaultTheme } from '../../src/styles/theme';

export default function PropertyLayout() {
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
      }}
    >
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Property Details',
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Add Property',
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: 'Edit Property',
        }}
      />
    </Stack>
  );
} 