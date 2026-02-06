import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';

export default function ProfileStackLayout() {
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
        headerShown: false,
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="applications"
        options={{
          headerShown: true,
          headerBackTitleVisible: false,
          headerLeft: backButton,
        }}
      />
      <Stack.Screen
        name="documents"
        options={{
          headerShown: true,
          headerBackTitleVisible: false,
          headerLeft: backButton,
        }}
      />
      <Stack.Screen
        name="payments"
        options={{
          headerShown: true,
          headerBackTitleVisible: false,
          headerLeft: backButton,
        }}
      />
      <Stack.Screen
        name="tenant-directory"
        options={{
          headerShown: true,
          headerBackTitleVisible: false,
          headerLeft: backButton,
        }}
      />
    </Stack>
  );
}
