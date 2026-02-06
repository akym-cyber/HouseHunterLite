import React, { useMemo } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, Title } from 'react-native-paper';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function EmailSettingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleChangeEmail = () => {
    Alert.alert('Coming Soon', 'Email change will be available soon.');
  };

  return (
    <SettingsScreen title="Email">
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Current Email</Title>
          <Text style={styles.value}>{user?.email || 'Unknown'}</Text>
          <Text style={styles.helper}>
            Your email is used for account access and important notifications.
          </Text>
          <Button mode="contained" onPress={handleChangeEmail} style={styles.button}>
            Change Email
          </Button>
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
  value: {
    color: theme.colors.onSurface,
    fontSize: 15,
    marginBottom: 8,
  },
  helper: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    marginBottom: 16,
  },
  button: {
    marginTop: 4,
  },
});
