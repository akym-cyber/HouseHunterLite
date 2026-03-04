import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Image,
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
  Snackbar,
} from 'react-native-paper';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { useProperties } from '../../src/hooks/useProperties';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useTheme } from '../../src/theme/useTheme';
import { Property } from '../../src/types/database';
import { formatPrice } from '../../src/utils/constants';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import PropertyMediaCarousel from '../../src/components/property/PropertyMediaCarousel';
import {
  addRecentlyViewedPropertyId,
  getRecentlyViewedPropertyIds,
} from '../../src/utils/recentlyViewed';

const PROPERTY_IMAGE_PLACEHOLDER = 'https://via.placeholder.com/600x400?text=Property';

const getLocationString = (item: Property) => {
  // Match Search/Favorites location hierarchy: Estate, County, Kenya
  if (item.estate && item.county) {
    return `${item.estate}, ${item.county}, Kenya`;
  } else if (item.county) {
    return `${item.county}, Kenya`;
  } else if (item.city && item.state) {
    return `${item.city}, ${item.state}`;
  } else {
    return `${item.city || 'Unknown Location'}, Kenya`;
  }
};

export default function HomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const { properties, loading, error, refreshProperties } = useProperties();
  const { toggleFavorite, addToFavorites, isFavorite } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);
  const [imageKey, setImageKey] = useState(0); // For cache busting
  const [headerMeasuredHeight, setHeaderMeasuredHeight] = useState(0);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [undoFavoritePropertyId, setUndoFavoritePropertyId] = useState<string | null>(null);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  // Refresh properties on screen focus - refetch after property creation
  useFocusEffect(
    useCallback(() => {
      refreshProperties();
      getRecentlyViewedPropertyIds().then(setRecentlyViewedIds);
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

  const handleViewProperty = async (propertyId: string) => {
    const nextViewed = await addRecentlyViewedPropertyId(propertyId);
    setRecentlyViewedIds(nextViewed);
    router.push(`/property/${propertyId}`);
  };

  const handleToggleFavorite = async (propertyId: string) => {
    const result = await toggleFavorite(propertyId);
    if (!result.success) return;

    if (result.action === 'removed') {
      setUndoFavoritePropertyId(propertyId);
      setSnackbarMessage('Removed from favorites');
      setSnackbarVisible(true);
    }
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
          onImageDoubleTap={() => handleToggleFavorite(property.id)}
        />
        <TouchableOpacity
          style={styles.favoriteHeartButton}
          activeOpacity={0.8}
          onPress={() => handleToggleFavorite(property.id)}
        >
          <MaterialCommunityIcons
            name={isFavorite(property.id) ? 'heart' : 'heart-outline'}
            size={30}
            color={isFavorite(property.id) ? theme.app.favoriteActive : theme.app.iconOnDark}
          />
        </TouchableOpacity>
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
            {getLocationString(property)}
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
          <Chip style={[styles.chip, styles.priceChip]} textStyle={styles.priceChipText}>
            {formatPrice(property.price, property.county || property.city)}
          </Chip>
        </View>
      </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  const renderPropertySkeleton = (key: string) => (
    <Card key={key} style={styles.skeletonCard} mode="contained">
      <View style={styles.skeletonMedia} />
      <Card.Content style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, styles.skeletonTitle]} />
        <View style={[styles.skeletonLine, styles.skeletonSubtitle]} />
        <View style={styles.skeletonChipRow}>
          <View style={[styles.skeletonChip, styles.skeletonChipShort]} />
          <View style={[styles.skeletonChip, styles.skeletonChipShort]} />
          <View style={[styles.skeletonChip, styles.skeletonChipLong]} />
        </View>
      </Card.Content>
    </Card>
  );

  const roleContent = getRoleSpecificContent();
  const visibleProperties = useMemo(() => {
    if (profile?.role === 'owner' && user?.uid) {
      return properties.filter((property) => property.ownerId === user.uid);
    }
    return properties;
  }, [profile?.role, user?.uid, properties]);

  const getPropertyPreviewImage = (property: Property): string => {
    const imageFromMedia = property.media?.find((item) => item.type === 'image' && item.url)?.url;
    return property.primaryImageUrl || imageFromMedia || PROPERTY_IMAGE_PLACEHOLDER;
  };

  const recentlyViewedProperties = useMemo(() => {
    if (recentlyViewedIds.length === 0) return [];

    const sourceProperties =
      profile?.role === 'owner' && user?.uid
        ? properties.filter((property) => property.ownerId === user.uid)
        : properties;

    const propertiesById = new Map(sourceProperties.map((property) => [property.id, property]));
    return recentlyViewedIds
      .map((propertyId) => propertiesById.get(propertyId))
      .filter((property): property is Property => !!property);
  }, [profile?.role, properties, recentlyViewedIds, user?.uid]);

  const handleUndoFavorite = async () => {
    if (!undoFavoritePropertyId) {
      setSnackbarVisible(false);
      return;
    }

    await addToFavorites(undoFavoritePropertyId);
    setSnackbarVisible(false);
    setUndoFavoritePropertyId(null);
  };

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
              <>
                {renderPropertySkeleton('home-skeleton-1')}
                {renderPropertySkeleton('home-skeleton-2')}
                {renderPropertySkeleton('home-skeleton-3')}
              </>
            ) : error ? (
              <Card style={styles.errorCard}>
                <Card.Content style={styles.errorContent}>
                  <Text style={styles.emptyIcon}>⚠️</Text>
                  <Title style={styles.emptyTitle}>Couldn't load properties</Title>
                  <Paragraph style={styles.emptyText}>{error}</Paragraph>
                  <Button mode="outlined" onPress={refreshProperties} style={styles.emptyButton}>
                    Retry
                  </Button>
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

          {recentlyViewedProperties.length > 0 && !loading && !error ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Title style={styles.sectionTitle}>Recently Viewed</Title>
              </View>
              <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentlyViewedRow}
              >
                {recentlyViewedProperties.map((property) => (
                  <TouchableOpacity
                    key={`recent-${property.id}`}
                    activeOpacity={0.85}
                    style={styles.recentlyViewedCard}
                    onPress={() => handleViewProperty(property.id)}
                  >
                    <Image
                      source={{ uri: getPropertyPreviewImage(property) }}
                      style={styles.recentlyViewedImage}
                      resizeMode="cover"
                    />
                    <View style={styles.recentlyViewedContent}>
                      <Text numberOfLines={1} style={styles.recentlyViewedTitle}>
                        {property.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.recentlyViewedLocation}>
                        {getLocationString(property)}
                      </Text>
                      <Text style={styles.recentlyViewedPrice}>
                        {formatPrice(property.price, property.county || property.city)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </Animated.ScrollView>
            </View>
          ) : null}

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
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => {
            setSnackbarVisible(false);
            setUndoFavoritePropertyId(null);
          }}
          duration={3500}
          action={
            undoFavoritePropertyId
              ? {
                  label: 'Undo',
                  onPress: handleUndoFavorite,
                }
              : undefined
          }
        >
          {snackbarMessage}
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
    gap: 6,
  },
  propertyCard: {
    marginBottom: 0,
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
  favoriteHeartButton: {
    position: 'absolute',
    right: 10,
    top: 6,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  propertyContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
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
    gap: 3,
    flexWrap: 'wrap',
    marginLeft: -6,
  },
  chip: {
    marginRight: 0,
    backgroundColor: theme.app.background,
    borderColor: 'transparent',
  },
  priceChip: {
    marginLeft: 0,
    transform: [{ translateX: -16 }],
    backgroundColor: theme.app.background,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceChipText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.25,
    color: theme.colors.onSurface,
  },
  errorCard: {
    marginTop: 12,
  },
  errorContent: {
    alignItems: 'center',
    padding: 28,
  },
  skeletonCard: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  skeletonMedia: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: theme.colors.surfaceVariant,
  },
  skeletonContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  skeletonLine: {
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  skeletonTitle: {
    height: 16,
    width: '58%',
    marginBottom: 10,
  },
  skeletonSubtitle: {
    height: 12,
    width: '72%',
    marginBottom: 12,
  },
  skeletonChipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonChip: {
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceVariant,
  },
  skeletonChipShort: {
    width: 72,
  },
  skeletonChipLong: {
    width: 100,
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
  recentlyViewedRow: {
    gap: 12,
    paddingRight: 20,
  },
  recentlyViewedCard: {
    width: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  recentlyViewedImage: {
    width: '100%',
    height: 128,
  },
  recentlyViewedContent: {
    padding: 10,
    gap: 4,
  },
  recentlyViewedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  recentlyViewedLocation: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  recentlyViewedPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
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







