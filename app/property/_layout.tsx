import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { defaultTheme } from '../../src/styles/theme';

export default function PropertyLayout() {
  const router = useRouter();
  const backButton = () => (
    <IconButton
      icon="chevron-left"
      iconColor={defaultTheme.colors.onPrimary}
      size={28}
      onPress={() => router.back()}
      style={{ margin: -8 }}
    />
  );

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
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{
          title: 'Edit Property',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          title: 'Add Property',
          headerLeft: backButton,
        }}
      />
    </Stack>
  );
} 