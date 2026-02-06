import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Card, Divider, IconButton, List, Switch, Text } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import SettingsScreen from '../../src/components/settings/SettingsScreen';

export default function ProfileVisibilityScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile, updateProfile } = useUserProfile(user);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showProfile, setShowProfile] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [shareContactInfo, setShareContactInfo] = useState(true);
  const isOwner = profile?.role === 'owner';

  useEffect(() => {
    if (profile?.shareContactInfo !== undefined) {
      setShareContactInfo(profile.shareContactInfo);
    }
  }, [profile?.shareContactInfo]);

  const handleToggleShareContact = async (value: boolean) => {
    setShareContactInfo(value);
    const result = await updateProfile({ shareContactInfo: value });
    if (!result.success) {
      setShareContactInfo((prev) => !prev);
      Alert.alert('Error', result.error || 'Failed to update contact sharing');
    }
  };

  return (
    <SettingsScreen title="Profile Visibility">
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>VISIBILITY</Text>
          <View style={styles.sectionContent}>
            <List.Item
              title="Show Profile to Others"
              description="Allow other users to view your profile"
              left={(props) => <List.Icon {...props} icon="account-eye" />}
              right={() => (
                <Switch value={showProfile} onValueChange={setShowProfile} />
              )}
            />
            <Divider />
            <List.Item
              title="Show Activity Status"
              description="Let others see when you are online"
              left={(props) => <List.Icon {...props} icon="circle-outline" />}
              right={() => (
                <Switch value={showActivity} onValueChange={setShowActivity} />
              )}
            />
            {isOwner && (
              <>
                <Divider />
                <List.Item
                  title="Share Contact Info"
                  description="Allow approved applicants to see your contact details"
                  left={(props) => <List.Icon {...props} icon="account-arrow-right" />}
                  right={() => (
                    <View style={styles.toggleRow}>
                      <IconButton
                        icon="information-outline"
                        size={18}
                        onPress={() =>
                          Alert.alert(
                            'Contact sharing',
                            'When enabled, approved applicants can see your contact information directly.'
                          )
                        }
                      />
                      <Switch value={shareContactInfo} onValueChange={handleToggleShareContact} />
                    </View>
                  )}
                />
              </>
            )}
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
