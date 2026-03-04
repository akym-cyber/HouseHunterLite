import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Chip,
  FAB,
  Searchbar,
  Snackbar,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useProperties } from '../../src/hooks/useProperties';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useTheme } from '../../src/theme/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PROPERTY_TYPES, BEDROOM_OPTIONS, formatPrice } from '../../src/utils/constants';
import { Property } from '../../src/types/database';
import PropertyMediaCarousel from '../../src/components/property/PropertyMediaCarousel';
import { addRecentlyViewedPropertyId } from '../../src/utils/recentlyViewed';

const SAVED_SEARCHES_STORAGE_KEY = 'househunter_saved_searches_v1';
const MAX_SAVED_SEARCHES = 8;

interface SearchFiltersState {
  location: string;
  minPrice: string;
  maxPrice: string;
  propertyType: string[];
  bedrooms: string;
  petFriendly: boolean;
  furnished: boolean;
}

interface SavedSearchPreset {
  id: string;
  label: string;
  query: string;
  filters: SearchFiltersState;
  signature: string;
}

const DEFAULT_FILTERS: SearchFiltersState = {
  location: '',
  minPrice: '',
  maxPrice: '',
  propertyType: [],
  bedrooms: '',
  petFriendly: false,
  furnished: false,
};

const getLocationString = (item: Property) => {
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

const createSearchSignature = (query: string, filters: SearchFiltersState) =>
  JSON.stringify({
    query: query.trim().toLowerCase(),
    filters: {
      ...filters,
      propertyType: [...filters.propertyType].sort(),
    },
  });

export default function SearchScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const { toggleFavorite, addToFavorites, isFavorite } = useFavorites();
  const { properties, loading, error, searchProperties } = useProperties();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFiltersState>(DEFAULT_FILTERS);
  const [savedSearches, setSavedSearches] = useState<SavedSearchPreset[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [undoFavoritePropertyId, setUndoFavoritePropertyId] = useState<string | null>(null);
  const [savedSearchUndoVisible, setSavedSearchUndoVisible] = useState(false);
  const [savedSearchUndoMessage, setSavedSearchUndoMessage] = useState('');
  const [savedSearchBackup, setSavedSearchBackup] = useState<SavedSearchPreset[] | null>(null);
  const [queuedSavedSearches, setQueuedSavedSearches] = useState<SavedSearchPreset[] | null>(null);
  const savedSearchUndoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildSearchPayload = useCallback((queryValue: string, activeFilters: SearchFiltersState) => {
    const normalizedQuery = queryValue.trim();
    const locationFromFilters = activeFilters.location.trim();
    return {
      location: locationFromFilters || normalizedQuery,
      minPrice: activeFilters.minPrice ? parseFloat(activeFilters.minPrice) : undefined,
      maxPrice: activeFilters.maxPrice ? parseFloat(activeFilters.maxPrice) : undefined,
      propertyType: activeFilters.propertyType,
      bedrooms: activeFilters.bedrooms ? parseInt(activeFilters.bedrooms) : undefined,
      petFriendly: activeFilters.petFriendly,
      furnished: activeFilters.furnished,
    };
  }, []);

  const executeSearch = useCallback(
    async (queryValue = searchQuery, activeFilters = filters) => {
      await searchProperties(buildSearchPayload(queryValue, activeFilters));
    },
    [buildSearchPayload, filters, searchProperties, searchQuery]
  );

  useEffect(() => {
    const loadSavedSearches = async () => {
      try {
        const raw = await AsyncStorage.getItem(SAVED_SEARCHES_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedSearches(parsed as SavedSearchPreset[]);
        }
      } catch (loadError) {
        console.warn('Failed to load saved searches', loadError);
      }
    };
    loadSavedSearches();
  }, []);

  useEffect(() => {
    return () => {
      if (savedSearchUndoTimerRef.current) {
        clearTimeout(savedSearchUndoTimerRef.current);
        savedSearchUndoTimerRef.current = null;
      }
    };
  }, []);

  const handleSearch = async () => {
    await executeSearch();
  };

  const handlePropertyPress = async (propertyId: string) => {
    await addRecentlyViewedPropertyId(propertyId);
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

  const handleUndoFavorite = async () => {
    if (!undoFavoritePropertyId) {
      setSnackbarVisible(false);
      return;
    }

    await addToFavorites(undoFavoritePropertyId);
    setSnackbarVisible(false);
    setUndoFavoritePropertyId(null);
  };

  const hasActiveCriteria = useMemo(() => {
    return Boolean(
      searchQuery.trim() ||
      filters.location.trim() ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.propertyType.length > 0 ||
      filters.bedrooms ||
      filters.petFriendly ||
      filters.furnished
    );
  }, [filters, searchQuery]);

  const buildSavedSearchLabel = useCallback((queryValue: string, activeFilters: SearchFiltersState) => {
    const labelParts: string[] = [];
    const queryLabel = queryValue.trim() || activeFilters.location.trim();
    if (queryLabel) labelParts.push(queryLabel);
    if (activeFilters.propertyType.length > 0) labelParts.push(activeFilters.propertyType[0]);
    if (activeFilters.bedrooms) labelParts.push(`${activeFilters.bedrooms} bed`);
    if (activeFilters.minPrice || activeFilters.maxPrice) {
      const min = activeFilters.minPrice || '0';
      const max = activeFilters.maxPrice || 'Any';
      labelParts.push(`${min}-${max}`);
    }
    return labelParts.length > 0 ? labelParts.join(' | ') : 'Custom Search';
  }, []);

  const saveCurrentSearch = useCallback(async () => {
    if (!hasActiveCriteria) return;

    const signature = createSearchSignature(searchQuery, filters);
    const nextEntry: SavedSearchPreset = {
      id: `${Date.now()}`,
      label: buildSavedSearchLabel(searchQuery, filters),
      query: searchQuery,
      filters: {
        ...filters,
        propertyType: [...filters.propertyType],
      },
      signature,
    };

    const nextSearches = [nextEntry, ...savedSearches.filter((item) => item.signature !== signature)].slice(
      0,
      MAX_SAVED_SEARCHES
    );
    setSavedSearches(nextSearches);

    try {
      await AsyncStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(nextSearches));
    } catch (saveError) {
      console.warn('Failed to save search preset', saveError);
    }
  }, [buildSavedSearchLabel, filters, hasActiveCriteria, savedSearches, searchQuery]);

  const queueSavedSearchMutation = useCallback(
    (nextSearches: SavedSearchPreset[], message: string) => {
      if (savedSearchUndoTimerRef.current) {
        clearTimeout(savedSearchUndoTimerRef.current);
        savedSearchUndoTimerRef.current = null;
      }

      const previousSearches = [...savedSearches];
      setSavedSearchBackup(previousSearches);
      setQueuedSavedSearches(nextSearches);
      setSavedSearches(nextSearches);
      setSavedSearchUndoMessage(message);
      setSavedSearchUndoVisible(true);

      savedSearchUndoTimerRef.current = setTimeout(async () => {
        setSavedSearchUndoVisible(false);
        setSavedSearchBackup(null);
        setQueuedSavedSearches(null);
        try {
          await AsyncStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(nextSearches));
        } catch (saveError) {
          console.warn('Failed to persist saved search mutation', saveError);
        }
      }, 5000);
    },
    [savedSearches]
  );

  const handleUndoSavedSearchMutation = useCallback(async () => {
    if (!savedSearchBackup) {
      setSavedSearchUndoVisible(false);
      return;
    }

    if (savedSearchUndoTimerRef.current) {
      clearTimeout(savedSearchUndoTimerRef.current);
      savedSearchUndoTimerRef.current = null;
    }

    setSavedSearches(savedSearchBackup);
    setSavedSearchUndoVisible(false);
    setSavedSearchBackup(null);
    setQueuedSavedSearches(null);

    try {
      await AsyncStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(savedSearchBackup));
    } catch (saveError) {
      console.warn('Failed to restore saved searches after undo', saveError);
    }
  }, [savedSearchBackup]);

  const removeSavedSearch = useCallback(
    (id: string) => {
      const nextSearches = savedSearches.filter((item) => item.id !== id);
      queueSavedSearchMutation(nextSearches, 'Saved search removed');
    },
    [queueSavedSearchMutation, savedSearches]
  );

  const clearSavedSearches = useCallback(() => {
    if (savedSearches.length === 0) return;
    queueSavedSearchMutation([], 'Saved searches cleared');
  }, [queueSavedSearchMutation, savedSearches.length]);

  const applySavedSearch = useCallback(
    async (preset: SavedSearchPreset) => {
      setSearchQuery(preset.query);
      setFilters({
        ...preset.filters,
        propertyType: [...preset.filters.propertyType],
      });
      await executeSearch(preset.query, preset.filters);
    },
    [executeSearch]
  );

  const styles = useMemo(() => createStyles(theme), [theme]);

  const visibleProperties = useMemo(() => {
    if (profile?.role === 'owner' && user?.uid) {
      return properties.filter((property) => property.ownerId === user.uid);
    }
    return properties;
  }, [profile?.role, user?.uid, properties]);

  const renderPropertyCard = ({ item }: { item: Property }) => (
    <Card
      key={item.id}
      style={styles.propertyCard}
      mode="contained"
    >
      <View style={styles.propertyMediaShell}>
        <PropertyMediaCarousel
          primaryImageUrl={item.primaryImageUrl}
          media={item.media}
          borderRadius={12}
          onImageDoubleTap={() => handleToggleFavorite(item.id)}
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
        onPress={() => handlePropertyPress(item.id)}
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
            {item.petFriendly ? (
              <Chip icon="paw" style={styles.chip}>
                Pet Friendly
              </Chip>
            ) : null}
            <Chip style={[styles.chip, styles.priceChip]} textStyle={styles.priceChipText}>
              {formatPrice(item.price, item.county || item.city)}
            </Chip>
          </View>
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  const renderFilters = () => (
    <Card style={styles.filtersCard}>
      <Card.Content>
        <Title style={styles.filtersTitle}>Filters</Title>

        <TextInput
          label="Location"
          value={filters.location}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, location: text }))}
          mode="outlined"
          style={styles.filterInput}
        />

        <View style={styles.priceRow}>
          <TextInput
            label="Min Price"
            value={filters.minPrice}
            onChangeText={(text) => setFilters((prev) => ({ ...prev, minPrice: text }))}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.filterInput, styles.halfInput]}
          />
          <TextInput
            label="Max Price"
            value={filters.maxPrice}
            onChangeText={(text) => setFilters((prev) => ({ ...prev, maxPrice: text }))}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.filterInput, styles.halfInput]}
          />
        </View>

        <Text style={styles.filterLabel}>Property Type</Text>
        <View style={styles.chipContainer}>
          {PROPERTY_TYPES.map((type) => (
            <Chip
              key={type.value}
              selected={filters.propertyType.includes(type.value)}
              onPress={() => {
                setFilters((prev) => ({
                  ...prev,
                  propertyType: prev.propertyType.includes(type.value)
                    ? prev.propertyType.filter((value) => value !== type.value)
                    : [...prev.propertyType, type.value],
                }));
              }}
              style={styles.filterChip}
            >
              {type.label}
            </Chip>
          ))}
        </View>

        <Text style={styles.filterLabel}>Bedrooms</Text>
        <View style={styles.chipContainer}>
          {BEDROOM_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              selected={filters.bedrooms === option.value.toString()}
              onPress={() => {
                setFilters((prev) => ({
                  ...prev,
                  bedrooms: prev.bedrooms === option.value.toString() ? '' : option.value.toString(),
                }));
              }}
              style={styles.filterChip}
            >
              {option.label}
            </Chip>
          ))}
        </View>

        <View style={styles.checkboxRow}>
          <Chip
            selected={filters.petFriendly}
            onPress={() => setFilters((prev) => ({ ...prev, petFriendly: !prev.petFriendly }))}
            style={styles.filterChip}
          >
            Pet Friendly
          </Chip>
          <Chip
            selected={filters.furnished}
            onPress={() => setFilters((prev) => ({ ...prev, furnished: !prev.furnished }))}
            style={styles.filterChip}
          >
            Furnished
          </Chip>
        </View>

        <View style={styles.filterButtons}>
          <Button
            mode="outlined"
            onPress={() => setFilters({ ...DEFAULT_FILTERS, propertyType: [] })}
            style={styles.filterButton}
          >
            Clear
          </Button>
          <Button
            mode="contained"
            onPress={handleSearch}
            style={styles.filterButton}
            loading={loading}
          >
            Apply Filters
          </Button>
        </View>
      </Card.Content>
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
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Search Properties</Title>
      </View>
      <SafeAreaView style={styles.content} edges={[]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Searchbar
            placeholder="Search by location, property type..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={handleSearch}
            style={styles.searchBar}
          />
          <View style={styles.filterToggle}>
            <Button
              mode="outlined"
              onPress={() => setShowFilters(!showFilters)}
              icon={showFilters ? 'chevron-up' : 'chevron-down'}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </View>

          <View style={styles.savedSearchActions}>
            <Button
              mode="text"
              icon="content-save-outline"
              disabled={!hasActiveCriteria}
              onPress={saveCurrentSearch}
            >
              Save Search
            </Button>
            {savedSearches.length > 0 ? (
              <Button mode="text" onPress={clearSavedSearches}>
                Clear Saved
              </Button>
            ) : null}
          </View>

          {savedSearches.length > 0 ? (
            <View style={styles.savedSearchContainer}>
              <Text style={styles.savedSearchLabel}>Saved Searches</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.savedSearchChipRow}
              >
                {savedSearches.map((preset) => (
                  <Chip
                    key={preset.id}
                    style={styles.savedSearchChip}
                    onPress={() => applySavedSearch(preset)}
                    onClose={() => removeSavedSearch(preset.id)}
                    closeIcon="close"
                  >
                    {preset.label}
                  </Chip>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {showFilters ? renderFilters() : null}

          <View style={styles.propertyList}>
            {loading ? (
              <>
                {renderSkeletonCard('search-skeleton-1')}
                {renderSkeletonCard('search-skeleton-2')}
                {renderSkeletonCard('search-skeleton-3')}
              </>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.emptyIcon}>⚠️</Text>
                <Title style={styles.emptyTitle}>Couldn't load properties</Title>
                <Text style={styles.emptyText}>{error}</Text>
                <Button mode="outlined" onPress={handleSearch} style={styles.emptyButton}>
                  Retry
                </Button>
              </View>
            ) : visibleProperties.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Title style={styles.emptyTitle}>No Properties Found</Title>
                <Text style={styles.emptyText}>
                  Try adjusting your search criteria or filters
                </Text>
              </View>
            ) : (
              visibleProperties.map((item) => renderPropertyCard({ item }))
            )}
          </View>
        </ScrollView>

        <FAB
          icon="map"
          style={styles.fab}
          onPress={() => router.push('/(tabs)/search')}
        />
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
        <Snackbar
          visible={savedSearchUndoVisible}
          onDismiss={() => {
            setSavedSearchUndoVisible(false);
            setSavedSearchBackup(null);
            setQueuedSavedSearches(null);
          }}
          duration={5200}
          action={
            queuedSavedSearches
              ? {
                  label: 'Undo',
                  onPress: handleUndoSavedSearchMutation,
                }
              : undefined
          }
        >
          {savedSearchUndoMessage}
        </Snackbar>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.app.background,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingTop: 16,
      paddingBottom: 100,
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
    searchBar: {
      margin: 20,
      marginTop: 0,
      elevation: 4,
    },
    filterToggle: {
      paddingHorizontal: 20,
      marginBottom: 2,
    },
    savedSearchActions: {
      paddingHorizontal: 20,
      marginBottom: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    savedSearchContainer: {
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    savedSearchLabel: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      marginBottom: 8,
      letterSpacing: 0.2,
    },
    savedSearchChipRow: {
      gap: 8,
      paddingRight: 20,
    },
    savedSearchChip: {
      backgroundColor: theme.colors.surfaceVariant,
    },
    filtersCard: {
      margin: 20,
      marginTop: 0,
      elevation: 2,
    },
    filtersTitle: {
      marginBottom: 16,
    },
    filterInput: {
      marginBottom: 12,
    },
    priceRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    halfInput: {
      flex: 1,
    },
    filterLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
      color: theme.colors.onSurface,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    filterChip: {
      marginBottom: 4,
    },
    checkboxRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    filterButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    filterButton: {
      flex: 1,
    },
    propertyList: {
      padding: 20,
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
      marginTop: 12,
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
    fab: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.primary,
    },
  });
