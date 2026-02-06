import React, { useMemo } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, Title } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function ReportProblemScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleReport = () => {
    Alert.alert('Coming Soon', 'Problem reporting will be available soon.');
  };

  return (
    <SettingsScreen title="Report a Problem">
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Found an issue?</Title>
          <Text style={styles.helper}>
            Let us know what went wrong so we can fix it quickly.
          </Text>
          <Button mode="contained" onPress={handleReport} style={styles.button}>
            Report a Problem
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
