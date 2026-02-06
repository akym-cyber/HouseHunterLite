import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Divider, List, Switch, Text } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function NotificationSettingsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  return (
    <SettingsScreen title="Notification Settings">
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>PUSH & EMAIL</Text>
          <View style={styles.sectionContent}>
            <List.Item
              title="Push Notifications"
              description="New messages, property updates, and alerts"
              left={(props) => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch value={pushEnabled} onValueChange={setPushEnabled} />
              )}
            />
            <Divider />
            <List.Item
              title="Email Notifications"
              description="Weekly summaries and account activity"
              left={(props) => <List.Icon {...props} icon="email" />}
              right={() => (
                <Switch value={emailEnabled} onValueChange={setEmailEnabled} />
              )}
            />
            <Divider />
            <List.Item
              title="Marketing Updates"
              description="Tips, new features, and offers"
              left={(props) => <List.Icon {...props} icon="star" />}
              right={() => (
                <Switch value={marketingEnabled} onValueChange={setMarketingEnabled} />
              )}
            />
          </View>
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
  sectionTitle: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionContent: {
    borderRadius: 10,
    overflow: 'hidden',
  },
});
