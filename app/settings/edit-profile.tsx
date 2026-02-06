import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, TextInput, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { useTheme } from '../../src/theme/useTheme';

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile, loading, updating, updateProfile } = useUserProfile(user);
  const [fullName, setFullName] = useState('');
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (profile?.name) {
      setFullName(profile.name);
    }
  }, [profile]);

  const handleCancel = () => {
    router.back();
  };

  const handleSave = async () => {
    if (!profile) return;
    const trimmed = fullName.trim();
    if (!trimmed) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return;
    }

    const result = await updateProfile({ name: trimmed });
    if (result.success) {
      Alert.alert('Saved', 'Your profile was updated.');
      router.back();
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          mode="text"
          onPress={handleCancel}
          textColor={theme.colors.onPrimary}
          disabled={updating}
          style={styles.headerAction}
        >
          Cancel
        </Button>
        <Title style={styles.headerTitle}>Edit Profile</Title>
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={updating || !fullName.trim()}
          loading={updating}
          style={styles.headerAction}
          buttonColor={theme.colors.onPrimary}
          textColor={theme.colors.primary}
        >
          Save
        </Button>
      </View>

      <SafeAreaView style={styles.content} edges={[]}>
        <View style={styles.formWrapper}>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                mode="outlined"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                textColor={theme.colors.onSurface}
                style={styles.input}
                disabled={loading || updating}
              />
            </Card.Content>
          </Card>

          <Text style={styles.helperText}>
            This name will be shown on your profile and in messages.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 40,
    paddingBottom: 12,
    backgroundColor: theme.colors.primary,
  },
  headerAction: {
    minWidth: 84,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  formWrapper: {
    padding: 20,
  },
  card: {
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  label: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  helperText: {
    marginTop: 12,
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
  },
});
