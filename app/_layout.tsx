import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { Platform } from 'react-native';
import { defaultTheme } from '../src/styles/theme';
import { useAuth } from '../src/hooks/useAuth';

// Conditional imports for native-only components
let SafeAreaProvider: any = null;
let GestureHandlerRootView: any = null;
let StatusBar: any = null;
let NetworkStatus: any = null;

if (Platform.OS !== 'web') {
  // Only import native components when not on web
  try {
    SafeAreaProvider = require('react-native-safe-area-context').SafeAreaProvider;
    GestureHandlerRootView = require('react-native-gesture-handler').GestureHandlerRootView;
    StatusBar = require('expo-status-bar').StatusBar;
    NetworkStatus = require('../src/components/common/NetworkStatus').NetworkStatus;
    require('react-native-gesture-handler'); // Must be first import for native
  } catch (error) {
    console.warn('Failed to load native components:', error);
  }
}

// Initialize Firebase lazily on web to avoid crashes
if (Platform.OS === 'web') {
  // Delay Firebase initialization to avoid blocking initial render
  setTimeout(() => {
    try {
      require('../src/services/firebase/firebaseConfig');
    } catch (error) {
      console.warn('Firebase initialization delayed:', error);
    }
  }, 100);
} else {
  // For native, initialize immediately
  require('../src/services/firebase/firebaseConfig');
}

export default function RootLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  // Web-safe render with fallbacks
  const RootContainer = GestureHandlerRootView || React.Fragment;
  const SafeArea = SafeAreaProvider || React.Fragment;
  const Status = StatusBar ? <StatusBar style="auto" /> : null;
  const Network = NetworkStatus ? <NetworkStatus /> : null;

  return (
    <RootContainer style={{ flex: 1 }}>
      <PaperProvider theme={defaultTheme}>
        <SafeArea>
          {Status}
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
          {Network}
        </SafeArea>
      </PaperProvider>
    </RootContainer>
  );
}
