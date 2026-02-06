import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, List, Divider, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

type SettingsItem = {
  title: string;
  description?: string;
  icon: string;
  route?: string;
  rightText?: string;
};

const appVersion = 'v1.0.0';

export default function SettingsIndexScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const sections: { title: string; items: SettingsItem[] }[] = [
    {
      title: 'Account',
      items: [
        { title: 'Edit Profile', icon: 'account-edit', route: '/settings/edit-profile' },
        { title: 'Email', icon: 'email', route: '/settings/email' },
        { title: 'Security & Password', icon: 'shield-lock', route: '/settings/security' },
        { title: 'Connected Accounts', icon: 'account-multiple', route: '/settings/connected-accounts' },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { title: 'Notification Settings', icon: 'bell', route: '/settings/notifications' },
        { title: 'Search Preferences', icon: 'tune', route: '/settings/search-preferences' },
        { title: 'Appearance', icon: 'theme-light-dark', route: '/settings/appearance' },
      ],
    },
    {
      title: 'Privacy',
      items: [
        { title: 'Profile Visibility', icon: 'eye', route: '/settings/profile-visibility' },
        { title: 'Data Controls', icon: 'database', route: '/settings/data-controls' },
      ],
    },
    {
      title: 'Support',
      items: [
        { title: 'Help Center / FAQ', icon: 'help-circle', route: '/settings/help-center' },
        { title: 'Contact Us', icon: 'message', route: '/settings/contact-us' },
        { title: 'Report a Problem', icon: 'alert-circle', route: '/settings/report-problem' },
      ],
    },
    {
      title: 'About',
      items: [
        { title: 'Terms of Service & Privacy Policy', icon: 'file-document', route: '/settings/terms' },
        { title: 'App Version', icon: 'information', rightText: appVersion },
      ],
    },
  ];

  return (
    <SettingsScreen title="Settings">
      {sections.map((section) => (
        <Card key={section.title} style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, index) => (
                <View key={item.title}>
                  <List.Item
                    title={item.title}
                    description={item.description}
                    left={(props) => <List.Icon {...props} icon={item.icon} />}
                    right={(props) =>
                      item.rightText ? (
                        <Text style={styles.rightText}>{item.rightText}</Text>
                      ) : (
                        <List.Icon {...props} icon="chevron-right" />
                      )
                    }
                    onPress={item.route ? () => router.push(item.route!) : undefined}
                    style={styles.listItem}
                  />
                  {index < section.items.length - 1 && <Divider />}
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      ))}
    </SettingsScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    marginBottom: 16,
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
  listItem: {
    paddingHorizontal: 0,
  },
  rightText: {
    color: theme.colors.onSurfaceVariant,
    alignSelf: 'center',
    paddingRight: 8,
  },
});
