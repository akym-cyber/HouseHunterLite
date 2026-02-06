import React, { useMemo } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, Title } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function ConnectedAccountsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleConnect = (provider: string) => {
    Alert.alert('Coming Soon', `${provider} connection will be available soon.`);
  };

  return (
    <SettingsScreen title="Connected Accounts">
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Linked Accounts</Title>
          <Text style={styles.helper}>
            Connect your account to sign in faster and recover access.
          </Text>
          <Button mode="outlined" onPress={() => handleConnect('Google')} style={styles.button}>
            Connect Google
          </Button>
          <Button mode="outlined" onPress={() => handleConnect('Apple')} style={styles.button}>
            Connect Apple
          </Button>
          <Button mode="outlined" onPress={() => handleConnect('Facebook')} style={styles.button}>
            Connect Facebook
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
  helper: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});
