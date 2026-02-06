import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { useTheme } from '../src/theme/useTheme';

export default function Index() {
  const { theme } = useTheme();
  const { user, loading } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.app.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.onBackground,
  },
}); 
