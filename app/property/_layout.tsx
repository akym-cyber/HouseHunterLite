import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';

export default function PropertyLayout() {
  const router = useRouter();
  const { theme } = useTheme();
  const backButton = () => (
    <IconButton
      icon="chevron-left"
      iconColor={theme.colors.onPrimary}
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
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.onPrimary,
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
