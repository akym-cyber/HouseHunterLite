import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Divider, List, Switch, Text } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function SearchPreferencesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showOnlyVerified, setShowOnlyVerified] = useState(false);
  const [saveRecentFilters, setSaveRecentFilters] = useState(true);

  return (
    <SettingsScreen title="Search Preferences">
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>DEFAULTS</Text>
          <View style={styles.sectionContent}>
            <List.Item
              title="Save Recent Filters"
              description="Reuse the last filters you applied"
              left={(props) => <List.Icon {...props} icon="history" />}
              right={() => (
                <Switch value={saveRecentFilters} onValueChange={setSaveRecentFilters} />
              )}
            />
            <Divider />
            <List.Item
              title="Only Verified Listings"
              description="Show properties verified by HouseHunter"
              left={(props) => <List.Icon {...props} icon="check-decagram" />}
              right={() => (
                <Switch value={showOnlyVerified} onValueChange={setShowOnlyVerified} />
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
