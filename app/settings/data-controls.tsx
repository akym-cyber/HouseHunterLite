import React, { useMemo } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, Title } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function DataControlsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleDownload = () => {
    Alert.alert('Coming Soon', 'Data export will be available soon.');
  };

  const handleDelete = () => {
    Alert.alert('Coming Soon', 'Account deletion will be available soon.');
  };

  return (
    <SettingsScreen title="Data Controls">
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Your Data</Title>
          <Text style={styles.helper}>
            Manage the data associated with your account.
          </Text>
          <Button mode="outlined" onPress={handleDownload} style={styles.button}>
            Download My Data
          </Button>
          <Button
            mode="contained"
            onPress={handleDelete}
            style={styles.button}
            buttonColor={theme.colors.error}
          >
            Delete Account
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
