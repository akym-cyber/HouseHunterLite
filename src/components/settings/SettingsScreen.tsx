import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { IconButton, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';

type SettingsScreenProps = {
  title: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
};

export default function SettingsScreen({ title, children, rightAction }: SettingsScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-left"
          size={28}
          iconColor={theme.colors.onPrimary}
          onPress={() => router.back()}
          style={styles.headerButton}
        />
        <Title style={styles.headerTitle}>{title}</Title>
        <View style={styles.headerRight}>
          {rightAction ?? <View style={styles.headerSpacer} />}
        </View>
      </View>

      <SafeAreaView style={styles.content} edges={[]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
    backgroundColor: theme.colors.primary,
  },
  headerButton: {
    margin: -8,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  headerRight: {
    minWidth: 48,
    alignItems: 'flex-end',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
});
