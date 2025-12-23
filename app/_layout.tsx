import 'react-native-gesture-handler'; // Must be first import
import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { defaultTheme } from '../src/styles/theme';
import { NetworkStatus } from '../src/components/common/NetworkStatus';
// Import Firebase config to ensure initialization at app startup
import '../src/services/firebase/firebaseConfig';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={defaultTheme}>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="property" options={{ headerShown: false }} />
          </Stack>
          <NetworkStatus />
        </SafeAreaProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
