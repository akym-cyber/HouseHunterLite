import React, { useMemo } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, Title } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function ContactUsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleContact = () => {
    Alert.alert('Coming Soon', 'Contact support will be available soon.');
  };

  return (
    <SettingsScreen title="Contact Us">
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Get in touch</Title>
          <Text style={styles.helper}>
            Reach out to our support team for help with your account or listings.
          </Text>
          <Button mode="contained" onPress={handleContact} style={styles.button}>
            Contact Support
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
