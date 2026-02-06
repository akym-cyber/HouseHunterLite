import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text, Title } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function TermsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SettingsScreen title="Terms & Privacy">
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Terms of Service</Title>
          <Text style={styles.body}>
            Review the rules and responsibilities for using HouseHunter.
          </Text>
          <Title style={styles.title}>Privacy Policy</Title>
          <Text style={styles.body}>
            Learn how we collect, use, and protect your information.
          </Text>
          <Text style={styles.helper}>
            Full documents will be available in a future update.
          </Text>
        </Card.Content>
      </Card>
    </SettingsScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  body: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    marginBottom: 16,
  },
  helper: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
});
