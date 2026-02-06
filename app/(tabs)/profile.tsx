import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Avatar,
  List,
  Divider,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { useProperties } from '../../src/hooks/useProperties';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useViewings } from '../../src/hooks/useViewings';
import { useApplications } from '../../src/hooks/useApplications';
import { usePayments } from '../../src/hooks/usePayments';
import { useDocuments } from '../../src/hooks/useDocuments';
import { useTheme } from '../../src/theme/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import UpcomingViewings from '../../src/components/viewings/UpcomingViewings';
import { viewingHelpers } from '../../src/services/firebase/firebaseHelpers';
import { Viewing } from '../../src/types/database';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const { profile, loading, updating, uploadProfilePicture, deleteProfilePicture } = useUserProfile(user);
  const { properties } = useProperties();
  const { favorites } = useFavorites();
  const role = (profile?.role || 'tenant') as 'owner' | 'tenant';
  const { upcomingViewings } = useViewings(role);
  const { applications } = useApplications(role);
  const { payments } = usePayments(role);
  const { documents } = useDocuments();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarError, setSnackbarError] = useState(false);
  const [imageKey, setImageKey] = useState(0);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isOwner = role === 'owner';

  const tenantDirectoryCount = useMemo(() => {
    if (!isOwner) return 0;
    return new Set(applications.map(app => app.tenantId)).size;
  }, [applications, isOwner]);

  const approvedTenantsCount = useMemo(() => {
    if (!isOwner) return 0;
    return new Set(applications.filter(app => app.status === 'approved').map(app => app.tenantId)).size;
  }, [applications, isOwner]);

  const monthlyRevenue = useMemo(() => {
    if (!isOwner) return 0;
    const now = new Date();
    return payments
      .filter(payment => payment.status === 'paid')
      .filter(payment => {
        const time = payment.paidAt?.toDate ? payment.paidAt.toDate() : payment.paidAt ? new Date(payment.paidAt) : null;
        if (!time) return false;
        return time.getMonth() === now.getMonth() && time.getFullYear() === now.getFullYear();
      })
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  }, [payments, isOwner]);

  const ownerStats = [
    { label: 'Properties Listed', value: `${properties.length}` },
    { label: 'Active Tenants', value: `${approvedTenantsCount}` },
    { label: 'Monthly Revenue', value: monthlyRevenue > 0 ? `KES ${monthlyRevenue.toLocaleString()}` : 'KES 0' },
  ];

  const tenantStats = [
    { label: 'Saved Properties', value: `${favorites.length}` },
    { label: 'Tours Scheduled', value: `${upcomingViewings.length}` },
    { label: 'Applications', value: `${applications.length}` },
  ];

  const showSnackbar = (message: string, isError: boolean = false) => {
    setSnackbarMessage(message);
    setSnackbarError(isError);
    setSnackbarVisible(true);
  };

  const getImageUrlWithCacheBust = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}&v=${imageKey}`;
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
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

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleApplications = () => {
    router.push('/profile/applications');
  };

  const handleDocuments = () => {
    router.push('/profile/documents');
  };

  const handlePayments = () => {
    router.push('/profile/payments');
  };

  const handleTenantDirectory = () => {
    router.push('/profile/tenant-directory');
  };

  const handleManageProperties = () => {
    router.push('/(tabs)/index');
  };

  const handleScheduleNew = () => {
    router.push('/(tabs)/search');
  };

  const handleReschedule = (viewing: Viewing) => {
    router.push({
      pathname: '/schedule-viewing/[propertyId]',
      params: { propertyId: viewing.propertyId, viewingId: viewing.id }
    });
  };

  const handleCancelViewing = (viewing: Viewing) => {
    Alert.alert('Cancel Viewing', 'Are you sure you want to cancel this viewing?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          await viewingHelpers.updateViewing(viewing.id, { status: 'cancelled' });
          showSnackbar('Viewing cancelled');
        }
      }
    ]);
  };

  const handleApproveViewing = (viewing: Viewing) => {
    Alert.alert('Approve Viewing', 'Approve this viewing request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          await viewingHelpers.updateViewing(viewing.id, { status: 'confirmed' });
          showSnackbar('Viewing approved');
        }
      }
    ]);
  };

  const handleDeclineViewing = (viewing: Viewing) => {
    Alert.alert('Decline Viewing', 'Decline this viewing request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          await viewingHelpers.updateViewing(viewing.id, { status: 'declined' });
          showSnackbar('Viewing declined');
        }
      }
    ]);
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
    const result = await uploadProfilePicture();
    if (result.success) {
      setImageKey(prev => prev + 1);
      showSnackbar('Profile picture updated successfully!');
    } else {
      showSnackbar(result.error || 'Failed to upload profile picture', true);
    }
  };

  const handleRemovePhoto = async () => {
    const result = await deleteProfilePicture();
    if (result.success) {
      setImageKey(prev => prev + 1);
      showSnackbar('Profile picture removed successfully!');
    } else {
      showSnackbar(result.error || 'Failed to remove profile picture', true);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <Button mode="contained" onPress={() => router.replace('/(tabs)/profile')}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleAvatarPress} disabled={updating}>
          <View style={styles.avatarContainer}>
            {profile.photoURL ? (
              <Avatar.Image
                key={`avatar-image-${profile.photoURL}-${imageKey}`}
                size={86}
                source={{ uri: getImageUrlWithCacheBust(profile.photoURL) }}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Text
                key={`avatar-text-${profile.uid}-${imageKey}`}
                size={86}
                label={profile.name?.charAt(0) || 'G'}
                style={styles.avatar}
              />
            )}
            {updating && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Title style={styles.userName}>{profile.name || 'Guest'}</Title>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {isOwner ? 'Property Owner' : 'Tenant'}
            </Text>
          </View>
        </View>
      </View>

      <SafeAreaView style={styles.content} edges={[]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Card style={styles.card}>
            <Card.Content>
              <Button
                mode="contained"
                onPress={handleSettings}
                icon="cog"
                style={styles.primaryButton}
              >
                Settings
              </Button>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Overview</Title>
              <View style={styles.statsGrid}>
                {(isOwner ? ownerStats : tenantStats).map((stat) => (
                  <View key={stat.label} style={styles.statItem}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Quick Actions</Title>
              {isOwner ? (
                <>
                  <List.Item
                    title="Add Listing"
                    description="Create a new property listing"
                    left={(props) => <List.Icon {...props} icon="plus-box" />}
                    onPress={() => router.push('/property/create')}
                  />
                  <Divider />
                  <List.Item
                    title={`Manage Properties (${properties.length})`}
                    description="Edit and update your listings"
                    left={(props) => <List.Icon {...props} icon="home-city" />}
                    onPress={handleManageProperties}
                  />
                  <Divider />
                  <List.Item
                    title={`Tenant Directory (${tenantDirectoryCount})`}
                    description="View your tenant list"
                    left={(props) => <List.Icon {...props} icon="account-multiple" />}
                    onPress={handleTenantDirectory}
                  />
                  <Divider />
                  <List.Item
                    title={`Payments (${payments.length})`}
                    description="Track rent payments"
                    left={(props) => <List.Icon {...props} icon="credit-card" />}
                    onPress={handlePayments}
                  />
                </>
              ) : (
                <>
                  <List.Item
                    title={`My Applications (${applications.length})`}
                    description="Track your rental applications"
                    left={(props) => <List.Icon {...props} icon="clipboard-text" />}
                    onPress={handleApplications}
                  />
                  <Divider />
                  <List.Item
                    title={`Saved Properties (${favorites.length})`}
                    description="View your saved listings"
                    left={(props) => <List.Icon {...props} icon="heart" />}
                    onPress={() => router.push('/(tabs)/favorites')}
                  />
                  <Divider />
                  <List.Item
                    title={`Documents (${documents.length})`}
                    description="Manage your leasing documents"
                    left={(props) => <List.Icon {...props} icon="file-document" />}
                    onPress={handleDocuments}
                  />
                  <Divider />
                  <List.Item
                    title={`Payments (${payments.length})`}
                    description="Track rent payments"
                    left={(props) => <List.Icon {...props} icon="credit-card" />}
                    onPress={handlePayments}
                  />
                </>
              )}
            </Card.Content>
          </Card>

          <UpcomingViewings
            viewings={upcomingViewings}
            role={isOwner ? 'owner' : 'tenant'}
            onScheduleNew={handleScheduleNew}
            onReschedule={handleReschedule}
            onCancel={handleCancelViewing}
            onApprove={handleApproveViewing}
            onDecline={handleDeclineViewing}
            cardStyle={styles.card}
          />

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Recent Activity</Title>
              {isOwner ? (
                <>
                  <List.Item
                    title={`${properties.length} listing${properties.length === 1 ? '' : 's'} active`}
                    description="Keep listings updated for more inquiries"
                    left={(props) => <List.Icon {...props} icon="home" />}
                  />
                  <Divider />
                  {applications.length === 0 ? (
                    <List.Item
                      title="No new applications yet"
                      description="Share your listings to get more leads"
                      left={(props) => <List.Icon {...props} icon="account-search" />}
                    />
                  ) : (
                    <List.Item
                      title={`${applications.length} application${applications.length === 1 ? '' : 's'} received`}
                      description="Review applications in My Applications"
                      left={(props) => <List.Icon {...props} icon="account-search" />}
                    />
                  )}
                </>
              ) : (
                <>
                  <List.Item
                    title={`${favorites.length} saved propert${favorites.length === 1 ? 'y' : 'ies'}`}
                    description="Review your saved listings anytime"
                    left={(props) => <List.Icon {...props} icon="heart" />}
                  />
                  <Divider />
                  {applications.length === 0 ? (
                    <List.Item
                      title="No applications yet"
                      description="Apply to a property to get started"
                      left={(props) => <List.Icon {...props} icon="clipboard-text" />}
                    />
                  ) : (
                    <List.Item
                      title={`${applications.length} application${applications.length === 1 ? '' : 's'} submitted`}
                      description="Track them in My Applications"
                      left={(props) => <List.Icon {...props} icon="clipboard-text" />}
                    />
                  )}
                  <Divider />
                  {upcomingViewings.length === 0 ? (
                    <List.Item
                      title="No upcoming tours"
                      description="Book a tour from any property page"
                      left={(props) => <List.Icon {...props} icon="calendar" />}
                    />
                  ) : (
                    <List.Item
                      title={`${upcomingViewings.length} upcoming tour${upcomingViewings.length === 1 ? '' : 's'}`}
                      description="View details in Upcoming Viewings"
                      left={(props) => <List.Icon {...props} icon="calendar" />}
                    />
                  )}
                </>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Account Actions</Title>
              <Button
                mode="contained"
                onPress={handleSignOut}
                icon="logout"
                style={styles.signOutButton}
                buttonColor={theme.colors.error}
              >
                Log Out
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>HouseHunter v1.0.0</Text>
            <Text style={styles.appCopyright}>© 2024 HouseHunter. All rights reserved.</Text>
          </View>
        </ScrollView>

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
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.app.background,
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.onSurface,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.app.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
    backgroundColor: theme.colors.primary,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: theme.colors.onPrimary,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.app.overlayDark,
    borderRadius: 43,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    gap: 4,
  },
  roleBadge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: theme.colors.onPrimary,
  },
  roleBadgeText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  userName: {
    color: theme.colors.onPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  userRole: {
    color: theme.colors.onPrimary,
    opacity: 0.7,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    marginTop: 0,
    elevation: 2,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  primaryButton: {
    paddingVertical: 6,
  },
  signOutButton: {
    marginTop: 4,
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  appVersion: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    marginBottom: 4,
  },
  appCopyright: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  snackbarErrorText: {
    color: theme.colors.error,
  },
});

