import React, { useMemo } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, Title } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function HelpCenterScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleOpenHelp = () => {
    Alert.alert('Coming Soon', 'Help Center will be available soon.');
  };

  return (
    <SettingsScreen title="Help Center / FAQ">
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>How can we help?</Title>
          <Text style={styles.helper}>
            Find answers to common questions and learn how to use HouseHunter.
          </Text>
          <Button mode="contained" onPress={handleOpenHelp} style={styles.button}>
            Open Help Center
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
