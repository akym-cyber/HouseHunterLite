import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  Chip,
  Avatar,
  Divider,
} from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { useProperties } from '../../src/hooks/useProperties';
import { defaultTheme } from '../../src/styles/theme';
import { Property } from '../../src/types/database';
import { formatPrice } from '../../src/utils/constants';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const { properties, loading, refreshProperties } = useProperties();
  const [refreshing, setRefreshing] = useState(false);
  const [imageKey, setImageKey] = useState(0); // For cache busting

  // Debug logging for property ownership issue
  console.log('OWNER UID:', user?.uid);
  console.log('FETCHED PROPERTIES:', properties);

  // Refresh properties on screen focus - refetch after property creation
  useFocusEffect(
    useCallback(() => {
      console.log('[Home] Screen focused - refreshing properties');
      refreshProperties();
      // Removed automatic image key increment to prevent excessive reloads
    }, []) // Remove profile dependency to prevent excessive refreshes
  );

  // Helper function to add cache busting to image URL
  const getImageUrlWithCacheBust = (url: string | undefined): string | undefined => {
    if (!url) return undefined;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}&v=${imageKey}`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshProperties();
    setRefreshing(false);
  };

  const handleCreateProperty = () => {
    router.push('/property/create');
  };

  const handleViewProperty = (propertyId: string) => {
    router.push(`/property/${propertyId}`);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getRoleSpecificContent = () => {
    if (profile?.role === 'owner') {
      return {
        title: 'Manage Your Properties',
        subtitle: 'View and manage your property listings',
        actionButton: 'Add New Property',
        actionHandler: handleCreateProperty,
      };
    } else {
      return {
        title: 'Find Your Perfect Home',
        subtitle: 'Discover amazing properties in your area',
        actionButton: 'Start Searching',
        actionHandler: () => router.push('/(tabs)/search'),
      };
    }
  };

  const renderPropertyCard = (property: Property) => (
    <Card
      key={property.id}
      style={styles.propertyCard}
      onPress={() => handleViewProperty(property.id)}
    >
      <Card.Cover
        source={{ uri: 'https://via.placeholder.com/300x200?text=Property+Image' }}
        style={styles.propertyImage}
      />
      <Card.Content style={styles.propertyContent}>
        <Title style={styles.propertyTitle} numberOfLines={1}>
          {property.title}
        </Title>
        <Paragraph style={styles.propertyLocation} numberOfLines={1}>
          📍 {property.city}, {property.state}
        </Paragraph>
        <View style={styles.propertyDetails}>
          <Chip icon="bed" style={styles.chip}>
            {property.bedrooms} bed
          </Chip>
          <Chip icon="shower" style={styles.chip}>
            {property.bathrooms} bath
          </Chip>
          <Chip icon="currency-usd" style={styles.chip}>
            {formatPrice(property.price, property.county || property.city)}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  const roleContent = getRoleSpecificContent();

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>
            {profile?.name || 'Guest'}
          </Text>
          <Chip icon="account" style={styles.roleChip}>
            {profile?.role?.charAt(0).toUpperCase() + profile?.role?.slice(1) || 'User'}
          </Chip>
        </View>
        {profile?.photoURL ? (
          <Avatar.Image
            key={`home-avatar-image-${profile.photoURL}-${imageKey}`}
            size={50}
            source={{
              uri: getImageUrlWithCacheBust(profile.photoURL)
            }}
            style={styles.avatar}
            onLoadStart={() => {
              console.log('[Home] Avatar image load started:', profile.photoURL);
            }}
            onLoadEnd={() => {
              console.log('[Home] Avatar image load completed successfully');
            }}
            onError={(error) => {
              console.error('[Home] Avatar image load failed:', error);
            }}
          />
        ) : (
          <Avatar.Text
            key={`home-avatar-text-${profile?.uid}-${imageKey}`}
            size={50}
            label={profile?.name?.charAt(0) || 'G'}
            style={styles.avatar}
          />
        )}
      </View>
      {/* Screen Content */}
      <SafeAreaView style={styles.content} edges={[]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
          {/* Quick Actions */}
          <Card style={styles.quickActionsCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>{roleContent.title}</Title>
              <Paragraph style={styles.sectionSubtitle}>
                {roleContent.subtitle}
              </Paragraph>
              <Button
                mode="contained"
                onPress={roleContent.actionHandler}
                style={styles.actionButton}
                icon="plus"
              >
                {roleContent.actionButton}
              </Button>
            </Card.Content>
          </Card>

          {/* Recent Properties Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Title style={styles.sectionTitle}>
                {profile?.role === 'owner'
                  ? 'Your Properties'
                  : 'Recent Properties'}
              </Title>
              <Button
                mode="text"
                onPress={() => router.push('/(tabs)/search')}
                compact
              >
                View All
              </Button>
            </View>

            {loading ? (
              <Card style={styles.loadingCard}>
                <Card.Content>
                  <Paragraph>Loading properties...</Paragraph>
                </Card.Content>
              </Card>
            ) : properties.length > 0 ? (
              <View style={styles.propertiesGrid}>
                {properties.slice(0, 6).map(renderPropertyCard)}
              </View>
            ) : (
              <Card style={styles.emptyCard}>
                <Card.Content style={styles.emptyContent}>
                  <Text style={styles.emptyIcon}>🏠</Text>
                  <Title style={styles.emptyTitle}>No Properties Yet</Title>
                  <Paragraph style={styles.emptyText}>
                    {profile?.role === 'owner'
                      ? 'Start by adding your first property listing'
                      : 'Explore available properties in your area'}
                  </Paragraph>
                  <Button
                    mode="outlined"
                    onPress={roleContent.actionHandler}
                    style={styles.emptyButton}
                  >
                    {roleContent.actionButton}
                  </Button>
                </Card.Content>
              </Card>
            )}
          </View>

          {/* Quick Stats */}
          {profile?.role === 'owner' ? (
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Quick Stats</Title>
              <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                  <Card.Content>
                    <Text style={styles.statNumber}>
                      {properties.filter(p => p.status === 'available').length}
                    </Text>
                    <Text style={styles.statLabel}>Available</Text>
                  </Card.Content>
                </Card>
                <Card style={styles.statCard}>
                  <Card.Content>
                    <Text style={styles.statNumber}>
                      {properties.filter(p => p.status === 'rented').length}
                    </Text>
                    <Text style={styles.statLabel}>Rented</Text>
                  </Card.Content>
                </Card>
                <Card style={styles.statCard}>
                  <Card.Content>
                    <Text style={styles.statNumber}>{properties.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </Card.Content>
                </Card>
              </View>
            </View>
          ) : null}
        </ScrollView>
        {profile?.role === 'owner' && (
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={() => router.push('/property/create')}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: defaultTheme.colors.primary,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: defaultTheme.colors.onPrimary,
    opacity: 0.8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: defaultTheme.colors.onPrimary,
    marginTop: 4,
  },
  roleChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  avatar: {
    backgroundColor: defaultTheme.colors.onPrimary,
  },
  quickActionsCard: {
    margin: 20,
    marginTop: 0,
    elevation: 4,
    borderRadius: 12,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: defaultTheme.colors.onSurface,
  },
  sectionSubtitle: {
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  actionButton: {
    marginTop: 8,
  },
  propertiesGrid: {
    gap: 16,
  },
  propertyCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  propertyImage: {
    height: 150,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  propertyContent: {
    padding: 16,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  propertyLocation: {
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  propertyDetails: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
  },
  loadingCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCard: {
    marginTop: 20,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 20,
  },
  emptyButton: {
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: defaultTheme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: defaultTheme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: defaultTheme.colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
  },
});
