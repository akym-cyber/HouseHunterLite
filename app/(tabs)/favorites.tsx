import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Chip,
  Button,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useTheme } from '../../src/theme/useTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Property } from '../../src/types/database';
import { formatPrice } from '../../src/utils/constants';
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

export default function FavoritesScreen() {
  const { theme } = useTheme();
  const { favorites, loading, error, refreshFavorites } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshFavorites();
    setRefreshing(false);
  };

  const renderPropertyCard = ({ item }: { item: Property }) => (
    <Card
      style={styles.propertyCard}
    >
      <PropertyMediaCarousel
        primaryImageUrl={item.primaryImageUrl}
        media={item.media}
        borderRadius={8}
      />
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/property/${item.id}`)}
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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>⏳</Text>
            <Title style={styles.emptyTitle}>Loading...</Title>
            <Text style={styles.emptyText}>
              Fetching your favorite properties
            </Text>
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
  emptyButton: {
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
});




