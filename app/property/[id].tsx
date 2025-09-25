import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Chip,
  Divider,
  IconButton,
  FAB,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useProperties } from '../../src/hooks/useProperties';
import { useAuth } from '../../src/hooks/useAuth';
import { useFavorites } from '../../src/hooks/useFavorites';
import { defaultTheme } from '../../src/styles/theme';
import { Property } from '../../src/types/database';

const { width } = Dimensions.get('window');

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { getPropertyById } = useProperties();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
  }, [id]);

  const fetchProperty = async () => {
    if (!id) return;
    
    setLoading(true);
    const result = await getPropertyById(id);
    
    if (result.success && result.data) {
      setProperty(result.data);
    } else {
      Alert.alert('Error', 'Failed to load property details');
    }
    setLoading(false);
  };

  const handleContactOwner = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to contact the owner');
      return;
    }
    
    if (!property) return;
    
    // Check if user is trying to contact themselves
    if (user.id === property.ownerId) {
      Alert.alert('Error', 'You cannot contact yourself');
      return;
    }
    
    // TODO: Create conversation and navigate to chat
    Alert.alert('Contact Owner', `Would you like to start a conversation with the property owner?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Start Chat', 
        onPress: () => {
          // TODO: Implement conversation creation and navigation
          Alert.alert('Coming Soon', 'Chat functionality will be available soon!');
        }
      }
    ]);
  };

  const handleScheduleViewing = () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to schedule a viewing');
      return;
    }
    
    // TODO: Navigate to scheduling screen
    Alert.alert('Coming Soon', 'Viewing scheduling will be available soon!');
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to save favorites');
      return;
    }
    
    if (!property) return;
    
    const result = await toggleFavorite(property.id);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to update favorite');
    }
  };

  const handleEditProperty = () => {
    if (!property) return;
    router.push(`/property/edit/${property.id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading property details...</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Text>Property not found</Text>
      </View>
    );
  }

  const isOwner = user?.id === property.ownerId;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Property Images */}
        <View style={styles.imageContainer}>
          <Card.Cover
            source={{ uri: 'https://via.placeholder.com/400x300?text=Property+Image' }}
            style={styles.mainImage}
          />
          <IconButton
            icon={isFavorite(property.id) ? 'heart' : 'heart-outline'}
            iconColor={isFavorite(property.id) ? 'red' : 'white'}
            size={30}
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
          />
        </View>

        {/* Property Header */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.propertyTitle}>{property.title}</Title>
            <Text style={styles.propertyLocation}>
              📍 {property.addressLine1}, {property.city}, {property.state} {property.postalCode}
            </Text>
            <Text style={styles.propertyPrice}>
              ${property.price.toLocaleString()}/month
            </Text>
            {property.deposit && (
              <Text style={styles.propertyDeposit}>
                Deposit: ${property.deposit.toLocaleString()}
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Property Details */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Property Details</Title>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{property.propertyType}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Bedrooms</Text>
                <Text style={styles.detailValue}>{property.bedrooms}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Bathrooms</Text>
                <Text style={styles.detailValue}>{property.bathrooms}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Square Feet</Text>
                <Text style={styles.detailValue}>
                  {property.squareFeet ? `${property.squareFeet} sq ft` : 'N/A'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Amenities</Title>
              <View style={styles.amenitiesContainer}>
                {property.amenities.map((amenity, index) => (
                  <Chip key={index} style={styles.amenityChip}>
                    {amenity}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Property Features */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Features</Title>
            <View style={styles.featuresContainer}>
              <Chip
                icon={property.furnished ? 'check' : 'close'}
                style={styles.featureChip}
              >
                {property.furnished ? 'Furnished' : 'Unfurnished'}
              </Chip>
              <Chip
                icon={property.petFriendly ? 'check' : 'close'}
                style={styles.featureChip}
              >
                {property.petFriendly ? 'Pet Friendly' : 'No Pets'}
              </Chip>
              <Chip
                icon={property.parkingAvailable ? 'check' : 'close'}
                style={styles.featureChip}
              >
                {property.parkingAvailable ? 'Parking Available' : 'No Parking'}
              </Chip>
              <Chip
                icon={property.utilitiesIncluded ? 'check' : 'close'}
                style={styles.featureChip}
              >
                {property.utilitiesIncluded ? 'Utilities Included' : 'Utilities Not Included'}
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Description */}
        {property.description && (
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Description</Title>
              <Text style={styles.description}>{property.description}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Availability */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Availability</Title>
            <Text style={styles.availabilityStatus}>
              Status: {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
            </Text>
            {property.availableDate && (
              <Text style={styles.availableDate}>
                Available: {new Date(property.availableDate).toLocaleDateString()}
              </Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {isOwner ? (
          <Button
            mode="contained"
            onPress={handleEditProperty}
            style={styles.actionButton}
            icon="pencil"
          >
            Edit Property
          </Button>
        ) : (
          <>
            <Button
              mode="contained"
              onPress={handleContactOwner}
              style={styles.actionButton}
              icon="message"
            >
              Contact Owner
            </Button>
            <Button
              mode="outlined"
              onPress={handleScheduleViewing}
              style={styles.actionButton}
              icon="calendar"
            >
              Schedule Viewing
            </Button>
          </>
        )}
      </View>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  mainImage: {
    height: 250,
    width: width,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
    borderRadius: 8,
  },
  propertyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  propertyLocation: {
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  propertyPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: defaultTheme.colors.primary,
    marginBottom: 4,
  },
  propertyDeposit: {
    color: defaultTheme.colors.onSurfaceVariant,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    marginBottom: 8,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    marginBottom: 8,
  },
  description: {
    lineHeight: 20,
    color: defaultTheme.colors.onSurfaceVariant,
  },
  availabilityStatus: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  availableDate: {
    color: defaultTheme.colors.onSurfaceVariant,
  },
  actionContainer: {
    padding: 16,
    backgroundColor: defaultTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: defaultTheme.colors.outline,
  },
  actionButton: {
    marginBottom: 8,
  },
}); 