import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Chip,
  FAB,
  Searchbar,
  Divider,
  HelperText,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useProperties } from '../../src/hooks/useProperties';
import { useTheme } from '../../src/theme/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PROPERTY_TYPES, BEDROOM_OPTIONS, PRICE_RANGES, formatPrice } from '../../src/utils/constants';
import { Property } from '../../src/types/database';
import PropertyMediaCarousel from '../../src/components/property/PropertyMediaCarousel';

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

export default function SearchScreen() {
  const { theme } = useTheme();
  const { properties, loading, searchProperties } = useProperties();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    minPrice: '',
    maxPrice: '',
    propertyType: [] as string[],
    bedrooms: '',
    petFriendly: false,
    furnished: false,
  });

  const handleSearch = async () => {
    const searchFilters = {
      location: searchQuery,
      minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
      propertyType: filters.propertyType,
      bedrooms: filters.bedrooms ? parseInt(filters.bedrooms) : undefined,
      petFriendly: filters.petFriendly,
      furnished: filters.furnished,
    };

    await searchProperties(searchFilters);
  };

  const handlePropertyPress = (propertyId: string) => {
    router.push(`/property/${propertyId}`);
  };

  const styles = useMemo(() => createStyles(theme), [theme]);

  const renderPropertyCard = ({ item }: { item: Property }) => (
    <Card
      key={item.id}
      style={styles.propertyCard}
    >
      <PropertyMediaCarousel
        primaryImageUrl={item.primaryImageUrl}
        media={item.media}
        borderRadius={8}
      />
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handlePropertyPress(item.id)}
      >
        <Card.Content style={styles.propertyContent}>
        <Title style={styles.propertyTitle} numberOfLines={1}>
          {item.title}
        </Title>
        <Text style={styles.propertyLocation} numberOfLines={1}>
          📍 {getLocationString(item)}
        </Text>
        <Text style={styles.propertyPrice}>
          {formatPrice(item.price, item.county || item.city)}
        </Text>
        <View style={styles.propertyDetails}>
          <Chip icon="bed" style={styles.chip}>
            {item.bedrooms} bed
          </Chip>
          <Chip icon="shower" style={styles.chip}>
            {item.bathrooms} bath
          </Chip>
          {item.petFriendly && (
            <Chip icon="paw" style={styles.chip}>
              Pet Friendly
            </Chip>
          )}
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
          onChangeText={(text) => setFilters(prev => ({ ...prev, location: text }))}
          mode="outlined"
          style={styles.filterInput}
        />

        <View style={styles.priceRow}>
          <TextInput
            label="Min Price"
            value={filters.minPrice}
            onChangeText={(text) => setFilters(prev => ({ ...prev, minPrice: text }))}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.filterInput, styles.halfInput]}
          />
          <TextInput
            label="Max Price"
            value={filters.maxPrice}
            onChangeText={(text) => setFilters(prev => ({ ...prev, maxPrice: text }))}
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
                setFilters(prev => ({
                  ...prev,
                  propertyType: prev.propertyType.includes(type.value)
                    ? prev.propertyType.filter(t => t !== type.value)
                    : [...prev.propertyType, type.value]
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
                setFilters(prev => ({
                  ...prev,
                  bedrooms: prev.bedrooms === option.value.toString() ? '' : option.value.toString()
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
            onPress={() => setFilters(prev => ({ ...prev, petFriendly: !prev.petFriendly }))}
            style={styles.filterChip}
          >
            Pet Friendly
          </Chip>
          <Chip
            selected={filters.furnished}
            onPress={() => setFilters(prev => ({ ...prev, furnished: !prev.furnished }))}
            style={styles.filterChip}
          >
            Furnished
          </Chip>
        </View>

        <View style={styles.filterButtons}>
          <Button
            mode="outlined"
            onPress={() => {
              setFilters({
                location: '',
                minPrice: '',
                maxPrice: '',
                propertyType: [],
                bedrooms: '',
                petFriendly: false,
                furnished: false,
              });
            }}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Search Properties</Title>
      </View>
      <SafeAreaView style={styles.content} edges={[]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
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
          {showFilters && renderFilters()}
          <View style={styles.propertyList}>
            {properties.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>🔍</Text>
                <Title style={styles.emptyTitle}>No Properties Found</Title>
                <Text style={styles.emptyText}>
                  Try adjusting your search criteria or filters
                </Text>
              </View>
            ) : (
              properties.map((item) => renderPropertyCard({ item }))
            )}
          </View>
        </ScrollView>
        <FAB
          icon="map"
          style={styles.fab}
          onPress={() => router.push('/(tabs)/search')}
        />
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
    marginBottom: 10,
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
  },
  propertyCard: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
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
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
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
  emptyContainer: {
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
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});




