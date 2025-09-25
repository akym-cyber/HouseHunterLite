import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
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
import { defaultTheme } from '../../src/styles/theme';
import { Property } from '../../src/types/database';

export default function FavoritesScreen() {
  const { favorites, loading, error, refreshFavorites } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshFavorites();
    setRefreshing(false);
  };

  const renderPropertyCard = ({ item }: { item: Property }) => (
    <Card
      style={styles.propertyCard}
      onPress={() => router.push(`/property/${item.id}`)}
    >
      <Card.Cover
        source={{ uri: 'https://via.placeholder.com/300x200?text=Property+Image' }}
        style={styles.propertyImage}
      />
      <Card.Content style={styles.propertyContent}>
        <Title style={styles.propertyTitle} numberOfLines={1}>
          {item.title}
        </Title>
        <Text style={styles.propertyLocation} numberOfLines={1}>
          📍 {item.city}, {item.state}
        </Text>
        <Text style={styles.propertyPrice}>
          ${item.price.toLocaleString()}/month
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
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Favorites</Title>
      </View>
      {/* Scrollable Property List */}
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
          favorites.map((item) => renderPropertyCard({ item }))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: defaultTheme.colors.primary,
  },
  headerTitle: {
    color: defaultTheme.colors.onPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  propertyList: {
    padding: 20,
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
    marginBottom: 4,
  },
  propertyPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: defaultTheme.colors.primary,
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
    color: defaultTheme.colors.onSurfaceVariant,
  },
  emptyButton: {
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
}); 