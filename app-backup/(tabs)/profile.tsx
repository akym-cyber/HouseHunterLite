import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Avatar,
  List,
  Divider,
  Switch,
  TextInput,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { defaultTheme } from '../../src/styles/theme';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { 
    profile, 
    loading, 
    updating, 
    error, 
    updateProfile, 
    uploadProfilePicture, 
    deleteProfilePicture,
    clearError 
  } = useUserProfile(user);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    role: 'tenant' as 'owner' | 'tenant'
  });
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [imageKey, setImageKey] = useState(0); // For cache busting

  // Initialize edit data when profile loads
  React.useEffect(() => {
    if (profile) {
      setEditData({
        name: profile.name || '',
        role: profile.role || 'tenant'
      });
    }
  }, [profile]);

  // Refresh profile on screen focus - only when photoURL actually changes
  useFocusEffect(
    useCallback(() => {
      console.log('[Profile] Screen focused');
      // Only force refresh if photoURL changed since last focus
      if (profile?.photoURL) {
        Image.prefetch(profile.photoURL).then(() => {
          console.log('[Profile] Image prefetched successfully');
        }).catch((error) => {
          console.warn('[Profile] Image prefetch failed:', error);
        });
      }
    }, []) // Remove profile?.photoURL dependency to prevent excessive refreshes
  );

  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    console.log('[Profile] Pull-to-refresh triggered');
    setRefreshing(true);
    try {
      // Force image refresh
      setImageKey(prev => prev + 1);
      
      // Reload profile data (this will trigger useUserProfile to reload)
      // The real-time listener should handle the update
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('[Profile] Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Helper function to add cache busting to image URL
  const getImageUrlWithCacheBust = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}&v=${imageKey}`;
  };

  const showSnackbar = (message: string, isError: boolean = false) => {
    setSnackbarMessage(message);
    setSnackbarError(isError);
    setSnackbarVisible(true);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const result = await signOut();
            if (result.success) {
              router.replace('/(auth)/login');
            } else {
              Alert.alert('Error', result.error || 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    const result = await updateProfile(editData);
    if (result.success) {
      setIsEditing(false);
      showSnackbar('Profile updated successfully!');
    } else {
      showSnackbar(result.error || 'Failed to update profile');
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      name: profile?.name || '',
      role: profile?.role || 'tenant'
    });
    setIsEditing(false);
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upload Photo', onPress: handleUploadPhoto },
        { text: 'Remove Photo', onPress: handleRemovePhoto, style: 'destructive' }
      ]
    );
  };

  const handleUploadPhoto = async () => {
    console.log('[Profile] Starting profile picture upload');
    const result = await uploadProfilePicture();
    if (result.success) {
      console.log('[Profile] Profile picture upload successful, refreshing image');
      // Force image refresh after upload
      setImageKey(prev => prev + 1);
      showSnackbar('Profile picture updated successfully!');
    } else {
      console.error('[Profile] Profile picture upload failed:', result.error);
      showSnackbar(result.error || 'Failed to upload profile picture', true);
    }
  };

  const handleRemovePhoto = async () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            console.log('[Profile] Removing profile picture');
            const result = await deleteProfilePicture();
            if (result.success) {
              console.log('[Profile] Profile picture removed successfully');
              // Force image refresh after removal
              setImageKey(prev => prev + 1);
              showSnackbar('Profile picture removed successfully!');
            } else {
              console.error('[Profile] Profile picture removal failed:', result.error);
              showSnackbar(result.error || 'Failed to remove profile picture', true);
            }
          }
        }
      ]
    );
  };

  // Handle refresh image button
  const handleRefreshImage = useCallback(() => {
    console.log('[Profile] Manual image refresh triggered');
    setImageKey(prev => prev + 1);
    showSnackbar('Refreshing image...');
  }, []);

  const handleSettings = () => {
    Alert.alert('Coming Soon', 'Settings functionality will be available soon!');
  };

  const handleHelp = () => {
    Alert.alert('Coming Soon', 'Help functionality will be available soon!');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={defaultTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <Button mode="contained" onPress={() => window.location.reload()}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Profile Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleAvatarPress} disabled={updating}>
          <View style={styles.avatarContainer}>
            {profile.photoURL ? (
              (() => {
                const imageUrl = getImageUrlWithCacheBust(profile.photoURL);
                // LOG: URL being passed to Image component
                console.log('[Profile] Image component - URL:', {
                  original: profile.photoURL,
                  withCacheBust: imageUrl,
                  imageKey: imageKey,
                  timestamp: Date.now(),
                });
                return (
                  <Avatar.Image
                    key={`avatar-image-${profile.photoURL}-${imageKey}`}
                    size={80}
                    source={{
                      uri: imageUrl
                    }}
                    style={styles.avatar}
                    onLoadStart={() => {
                      console.log('[Profile] Avatar image load started:', imageUrl);
                    }}
                    onLoadEnd={() => {
                      console.log('[Profile] Avatar image load completed successfully');
                    }}
                    onError={(error) => {
                      console.error('[Profile] Avatar image load failed:', {
                        error: error,
                        url: imageUrl,
                      });
                    }}
                  />
                );
              })()
            ) : (
              <Avatar.Text
                key={`avatar-text-${profile.uid}-${imageKey}`}
                size={80}
                label={profile.name?.charAt(0) || 'G'}
                style={styles.avatar}
              />
            )}
            {updating && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color={defaultTheme.colors.onPrimary} />
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {isEditing ? (
          <View style={styles.editForm}>
            <TextInput
              label="Full Name"
              value={editData.name}
              onChangeText={(text) => setEditData(prev => ({ ...prev, name: text }))}
              mode="outlined"
              style={styles.editInput}
              disabled={updating}
            />
            <View style={styles.editButtons}>
              <Button
                mode="outlined"
                onPress={handleCancelEdit}
                disabled={updating}
                style={styles.editButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveProfile}
                loading={updating}
                disabled={updating}
                style={styles.editButton}
              >
                Save
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.headerInfo}>
            <Title style={styles.userName}>
              {profile.name || 'Guest'}
            </Title>
            <View style={styles.emailPill}>
              <Text style={styles.userEmail}>{profile.email}</Text>
            </View>
            <Text style={styles.userRole}>
              {profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1) || 'User'}
            </Text>
          </View>
        )}
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={defaultTheme.colors.primary}
            colors={[defaultTheme.colors.primary]}
          />
        }
      >
        {/* Profile Actions */}
        <Card style={styles.card}>
          <Card.Content>
            {!isEditing && (
              <Button
                mode="outlined"
                onPress={handleEditProfile}
                icon="account-edit"
                style={styles.actionButton}
                disabled={updating}
              >
                Edit Profile
              </Button>
            )}
            <Button
              mode="outlined"
              onPress={handleSettings}
              icon="cog"
              style={styles.actionButton}
              disabled={updating}
            >
              Settings
            </Button>
            {profile.photoURL && (
              <Button
                mode="outlined"
                onPress={handleRefreshImage}
                icon="refresh"
                style={styles.actionButton}
                disabled={updating}
              >
                Refresh Image
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Notifications */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Notifications</Title>
            <List.Item
              title="Push Notifications"
              description="Receive notifications about new messages and property updates"
              left={(props) => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                />
              )}
            />
            <Divider />
            <List.Item
              title="Email Notifications"
              description="Receive email updates about your account"
              left={(props) => <List.Icon {...props} icon="email" />}
              right={() => (
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Account Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Account Information</Title>
            <List.Item
              title="Email"
              description={profile.email}
              left={(props) => <List.Icon {...props} icon="email" />}
            />
            <Divider />
            <List.Item
              title="Account Type"
              description={profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1) || 'User'}
              left={(props) => <List.Icon {...props} icon="account" />}
            />
            <Divider />
            <List.Item
              title="Member Since"
              description={profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
              left={(props) => <List.Icon {...props} icon="calendar" />}
            />
          </Card.Content>
        </Card>

        {/* Support */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Support</Title>
            <List.Item
              title="Help & FAQ"
              description="Get help with using the app"
              left={(props) => <List.Icon {...props} icon="help-circle" />}
              onPress={handleHelp}
            />
            <Divider />
            <List.Item
              title="Contact Support"
              description="Get in touch with our support team"
              left={(props) => <List.Icon {...props} icon="message" />}
              onPress={() => Alert.alert('Coming Soon', 'Contact support functionality will be available soon!')}
            />
          </Card.Content>
        </Card>

        {/* Sign Out */}
        <Card style={styles.card}>
          <Card.Content>
            <Button
              mode="contained"
              onPress={handleSignOut}
              icon="logout"
              style={styles.signOutButton}
              buttonColor={defaultTheme.colors.error}
            >
              Sign Out
            </Button>
          </Card.Content>
        </Card>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>HouseHunter v1.0.0</Text>
          <Text style={styles.appCopyright}>© 2024 HouseHunter. All rights reserved.</Text>
        </View>
      </ScrollView>

      {/* Snackbar for notifications */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        <Text style={snackbarError ? styles.snackbarErrorText : undefined}>{snackbarMessage}</Text>
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: defaultTheme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: defaultTheme.colors.onSurface,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: defaultTheme.colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: defaultTheme.colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: defaultTheme.colors.primary,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: defaultTheme.colors.onPrimary,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editForm: {
    width: '100%',
    maxWidth: 300,
  },
  editInput: {
    marginBottom: 12,
    backgroundColor: defaultTheme.colors.surface,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  editButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  userName: {
    color: defaultTheme.colors.onPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  userEmail: {
    color: defaultTheme.colors.primary,
    textAlign: 'center',
    fontSize: 14,
  },
  userRole: {
    color: defaultTheme.colors.onPrimary,
    opacity: 0.6,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    gap: 4,
  },
  emailPill: {
    backgroundColor: defaultTheme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    margin: 20,
    marginTop: 10,
    elevation: 2,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  actionButton: {
    marginBottom: 12,
  },
  signOutButton: {
    marginTop: 8,
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  appVersion: {
    color: defaultTheme.colors.onSurfaceVariant,
    fontSize: 14,
    marginBottom: 4,
  },
  appCopyright: {
    color: defaultTheme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  snackbarErrorText: {
    color: defaultTheme.colors.error,
  },
});
