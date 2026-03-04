import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Text,
  Card,
  Title,
  Chip,
  Button,
  Snackbar,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useTheme } from '../../src/theme/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Property } from '../../src/types/database';
import { formatPrice } from '../../src/utils/constants';
import PropertyMediaCarousel from '../../src/components/property/PropertyMediaCarousel';
import { addRecentlyViewedPropertyId } from '../../src/utils/recentlyViewed';

const getLocationString = (item: Property) => {
  // Show Kenyan location hierarchy: Estate, County, Kenya
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

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const { favorites, loading, error, refreshFavorites, toggleFavorite, addToFavorites, isFavorite } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [undoFavoritePropertyId, setUndoFavoritePropertyId] = useState<string | null>(null);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshFavorites();
    setRefreshing(false);
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

  const handleUndoFavorite = async () => {
    if (!undoFavoritePropertyId) {
      setSnackbarVisible(false);
      return;
    }

    await addToFavorites(undoFavoritePropertyId);
    setSnackbarVisible(false);
    setUndoFavoritePropertyId(null);
  };

  const renderPropertyCard = ({ item }: { item: Property }) => (
    <Card
      style={styles.propertyCard}
      mode="contained"
    >
      <View style={styles.propertyMediaShell}>
        <PropertyMediaCarousel
          primaryImageUrl={item.primaryImageUrl}
          media={item.media}
          borderRadius={12}
        />
        <TouchableOpacity
          style={styles.favoriteHeartButton}
          activeOpacity={0.8}
          onPress={() => handleToggleFavorite(item.id)}
        >
          <MaterialCommunityIcons
            name={isFavorite(item.id) ? 'heart' : 'heart-outline'}
            size={30}
            color={isFavorite(item.id) ? theme.app.favoriteActive : theme.app.iconOnDark}
          />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={async () => {
          await addRecentlyViewedPropertyId(item.id);
          router.push(`/property/${item.id}`);
        }}
      >
        <Card.Content style={styles.propertyContent}>
        <Title style={styles.propertyTitle} numberOfLines={1}>
          {item.title}
        </Title>
        <View style={styles.propertyLocationRow}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={15}
            color={theme.colors.onSurfaceVariant}
            style={styles.propertyLocationIcon}
          />
          <Text style={styles.propertyLocation} numberOfLines={1}>
            {getLocationString(item)}
          </Text>
        </View>
        <View style={styles.propertyDetails}>
          <Chip icon="bed" style={styles.chip}>
            {item.bedrooms} bed
          </Chip>
          <Chip icon="shower" style={styles.chip}>
            {item.bathrooms} bath
          </Chip>
          {typeof item.squareFeet === 'number' && item.squareFeet > 0 ? (
            <Chip
              icon={({ size, color }) => (
                <MaterialCommunityIcons name="set-square" size={size + 1} color={color} />
              )}
              style={styles.chip}
            >
              {item.squareFeet.toLocaleString()} sq ft
            </Chip>
          ) : null}
          {item.petFriendly && (
            <Chip icon="paw" style={styles.chip}>
              Pet Friendly
            </Chip>
          )}
          <Chip style={[styles.chip, styles.priceChip]} textStyle={styles.priceChipText}>
            {formatPrice(item.price, item.county || item.city)}
          </Chip>
        </View>
      </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  const renderSkeletonCard = (key: string) => (
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

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Favorites</Title>
      </View>
      {/* Scrollable Property List */}
      <SafeAreaView style={styles.content} edges={[]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.propertyList}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        {loading ? (
          <>
            {renderSkeletonCard('favorites-skeleton-1')}
            {renderSkeletonCard('favorites-skeleton-2')}
            {renderSkeletonCard('favorites-skeleton-3')}
          </>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Title style={styles.emptyTitle}>Couldn't load favorites</Title>
            <Text style={styles.emptyText}>{error}</Text>
            <Button mode="outlined" onPress={onRefresh} style={styles.emptyButton}>
              Retry
            </Button>
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>❤️</Text>
            <Title style={styles.emptyTitle}>No Favorites Yet</Title>
            <Text style={styles.emptyText}>
              Start exploring properties and save your favorites
            </Text>
            <Button
              mode="outlined"
              onPress={() => router.push('/(tabs)/search')}
              style={styles.emptyButton}
            >
              Browse Properties
            </Button>
          </View>
        ) : (
          favorites
            .filter((item, index, self) => self.findIndex(f => f.id === item.id) === index) // Remove duplicates
            .map((item) => (
              <View key={item.id}>
                {renderPropertyCard({ item })}
              </View>
            ))
        )}
      </ScrollView>
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
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: theme.colors.primary,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  propertyList: {
    padding: 20,
    paddingTop: 16,
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
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 32,
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
  },
  emptyButton: {
    marginTop: 16,
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
  scrollView: {
    flex: 1,
  },
});




