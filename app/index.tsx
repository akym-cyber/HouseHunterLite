import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { defaultTheme } from '../src/styles/theme';

export default function Index() {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={defaultTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading HouseHunter...</Text>
      </View>
    );
  }

  // Redirect based on authentication status
  if (user) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: defaultTheme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: defaultTheme.colors.onBackground,
  },
}); 