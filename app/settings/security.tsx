import React, { useMemo } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, Title } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function SecuritySettingsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleChangePassword = () => {
    Alert.alert('Coming Soon', 'Password change will be available soon.');
  };

  const handleEnable2FA = () => {
    Alert.alert('Coming Soon', 'Two-factor authentication will be available soon.');
  };

  return (
    <SettingsScreen title="Security & Password">
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Security</Title>
          <Text style={styles.helper}>
            Protect your account with a strong password and extra security options.
          </Text>
          <Button mode="contained" onPress={handleChangePassword} style={styles.button}>
            Change Password
          </Button>
          <Button mode="outlined" onPress={handleEnable2FA} style={styles.button}>
            Enable Two-Factor Authentication
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
