import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
import { useTheme } from '../../src/theme/useTheme';
import { Property } from '../../src/types/database';
import { formatPrice } from '../../src/utils/constants';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PropertyMediaCarousel from '../../src/components/property/PropertyMediaCarousel';

export default function HomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const { properties, loading, refreshProperties } = useProperties();
  const [refreshing, setRefreshing] = useState(false);
  const [imageKey, setImageKey] = useState(0); // For cache busting
  const [headerMeasuredHeight, setHeaderMeasuredHeight] = useState(0);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Refresh properties on screen focus - refetch after property creation
  useFocusEffect(
    useCallback(() => {
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

  const styles = useMemo(() => createStyles(theme), [theme]);
  const resolvedHeaderHeight = headerMeasuredHeight > 0 ? headerMeasuredHeight : 184;
  const headerStartCollapseAt = 24;
  const headerCollapseRange = Math.max(96, resolvedHeaderHeight);

  const headerAnimatedHeight = scrollY.interpolate({
    inputRange: [0, headerStartCollapseAt, headerStartCollapseAt + headerCollapseRange],
    outputRange: [resolvedHeaderHeight, resolvedHeaderHeight, 0],
    extrapolate: 'clamp',
  });
  const headerAnimatedOpacity = scrollY.interpolate({
    inputRange: [0, headerStartCollapseAt, headerStartCollapseAt + Math.min(72, headerCollapseRange * 0.6)],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });
  const headerAnimatedTranslateY = scrollY.interpolate({
    inputRange: [0, headerStartCollapseAt, headerStartCollapseAt + headerCollapseRange],
    outputRange: [0, 0, -26],
    extrapolate: 'clamp',
  });
  const pinnedDividerOpacity = scrollY.interpolate({
    inputRange: [0, headerStartCollapseAt + headerCollapseRange * 0.8, headerStartCollapseAt + headerCollapseRange],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const renderPropertyCard = (property: Property) => (
    <Card
      key={property.id}
      style={styles.propertyCard}
      mode="contained"
    >
      <View style={styles.propertyMediaShell}>
        <PropertyMediaCarousel
          primaryImageUrl={property.primaryImageUrl}
          media={property.media}
          borderRadius={12}
        />
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleViewProperty(property.id)}
      >
        <Card.Content style={styles.propertyContent}>
        <Title style={styles.propertyTitle} numberOfLines={1}>
          {property.title}
        </Title>
        <View style={styles.propertyLocationRow}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={15}
            color={theme.colors.onSurfaceVariant}
            style={styles.propertyLocationIcon}
          />
          <Paragraph style={styles.propertyLocation} numberOfLines={1}>
            {property.city}, {property.state}
          </Paragraph>
        </View>
        <View style={styles.propertyDetails}>
          <Chip icon="bed" style={styles.chip}>
            {property.bedrooms} bed
          </Chip>
          <Chip icon="shower" style={styles.chip}>
            {property.bathrooms} bath
          </Chip>
          {typeof property.squareFeet === 'number' && property.squareFeet > 0 ? (
            <Chip
              icon={({ size, color }) => (
                <MaterialCommunityIcons name="set-square" size={size + 1} color={color} />
              )}
              style={styles.chip}
            >
              {property.squareFeet.toLocaleString()} sq ft
            </Chip>
          ) : null}
          <Chip style={styles.chip}>
            {formatPrice(property.price, property.county || property.city)}
          </Chip>
        </View>
      </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  const roleContent = getRoleSpecificContent();
  const visibleProperties = useMemo(() => {
    if (profile?.role === 'owner' && user?.uid) {
      return properties.filter((property) => property.ownerId === user.uid);
    }
    return properties;
  }, [profile?.role, user?.uid, properties]);

  return (
    <View style={styles.container}>
      {/* Persistent mini top header */}
      <View
        style={[
          styles.pinnedTopBar,
          {
            paddingTop: insets.top,
            height: insets.top + 1,
          },
        ]}
      >
        <Animated.View style={[styles.pinnedTopBarDivider, { opacity: pinnedDividerOpacity }]} />
      </View>

      {/* Fixed Header */}
      <Animated.View style={[styles.headerShell, { height: headerAnimatedHeight, opacity: headerAnimatedOpacity }]}>
        <Animated.View
          style={[styles.header, { transform: [{ translateY: headerAnimatedTranslateY }] }]}
          onLayout={(event) => {
            const measured = Math.ceil(event.nativeEvent.layout.height);
            if (measured > headerMeasuredHeight) {
              setHeaderMeasuredHeight(measured);
            }
          }}
        >
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
            />
          ) : (
            <Avatar.Text
              key={`home-avatar-text-${profile?.uid}-${imageKey}`}
              size={50}
              label={profile?.name?.charAt(0) || 'G'}
              style={styles.avatar}
            />
          )}
        </Animated.View>
      </Animated.View>
      {/* Screen Content */}
      <SafeAreaView style={styles.content} edges={[]}>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
        >
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
            ) : visibleProperties.length > 0 ? (
              <View style={styles.propertiesGrid}>
                {visibleProperties.slice(0, 6).map(renderPropertyCard)}
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
                      {visibleProperties.filter(p => p.status === 'available').length}
                    </Text>
                    <Text style={styles.statLabel}>Available</Text>
                  </Card.Content>
                </Card>
                <Card style={styles.statCard}>
                  <Card.Content>
                    <Text style={styles.statNumber}>
                      {visibleProperties.filter(p => p.status === 'rented').length}
                    </Text>
                    <Text style={styles.statLabel}>Rented</Text>
                  </Card.Content>
                </Card>
                <Card style={styles.statCard}>
                  <Card.Content>
                    <Text style={styles.statNumber}>{visibleProperties.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </Card.Content>
                </Card>
              </View>
            </View>
          ) : null}
        </Animated.ScrollView>
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

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
  },
  scrollView: {
    flex: 1,
  },
  headerShell: {
    overflow: 'hidden',
    backgroundColor: theme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    backgroundColor: theme.colors.primary,
  },
  pinnedTopBar: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
  },
  pinnedTopBarDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: theme.colors.onPrimary,
    opacity: 0.8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.onPrimary,
    marginTop: 4,
  },
  roleChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  avatar: {
    backgroundColor: theme.colors.onPrimary,
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
    color: theme.colors.onSurface,
  },
  sectionSubtitle: {
    color: theme.colors.onSurfaceVariant,
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
    elevation: 0,
    borderRadius: 12,
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
  },
  propertyMediaShell: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: theme.app.shadow,
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 4,
      },
    }),
  },
  propertyContent: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  propertyLocation: {
    color: theme.colors.onSurfaceVariant,
    flexShrink: 1,
  },
  propertyLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  propertyLocationIcon: {
    marginRight: 4,
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
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
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







