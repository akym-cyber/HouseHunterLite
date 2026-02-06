import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Divider, List, Switch, Text } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function AppearanceSettingsScreen() {
  const { theme, scheme, systemScheme, schemeOverride, setSchemeOverride } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isUsingSystemTheme = schemeOverride === null;
  const isDarkMode = scheme === 'dark';

  const handleToggleUseSystemTheme = (value: boolean) => {
    if (value) {
      setSchemeOverride(null);
      return;
    }
    setSchemeOverride(isDarkMode ? 'dark' : 'light');
  };

  const handleToggleDarkMode = (value: boolean) => {
    setSchemeOverride(value ? 'dark' : 'light');
  };

  return (
    <SettingsScreen title="Appearance">
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>THEME</Text>
          <View style={styles.sectionContent}>
            <List.Item
              title="Use System Theme"
              description={`Follow device setting (${systemScheme})`}
              left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
              right={() => (
                <Switch
                  value={isUsingSystemTheme}
                  onValueChange={handleToggleUseSystemTheme}
                />
              )}
            />
            <Divider />
            <List.Item
              title="Dark Mode"
              description={isUsingSystemTheme ? 'Using system theme' : isDarkMode ? 'On' : 'Off'}
              left={(props) => <List.Icon {...props} icon="weather-night" />}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={handleToggleDarkMode}
                  disabled={isUsingSystemTheme}
                />
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
