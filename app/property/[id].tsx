import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { defaultTheme } from '../../src/styles/theme';
import { useLocalSearchParams, router } from 'expo-router';
import { useProperties } from '../../src/hooks/useProperties';
import { useAuth } from '../../src/hooks/useAuth';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useMessages } from '../../src/hooks/useMessages';
import { Property } from '../../src/types/database';
import { formatPrice } from '../../src/utils/constants';
import Video from 'react-native-video';

const { width } = Dimensions.get('window');

export default function PropertyDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { getPropertyById, deleteProperty } = useProperties();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { findConversationByProperty, createConversation } = useMessages();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (user.uid === property.ownerId) {
      Alert.alert('Error', 'You cannot contact yourself');
      return;
    }

    try {
      // First, try to find an existing conversation for this property and owner
      const findResult = await findConversationByProperty(property.id, property.ownerId);

      if (findResult.success && findResult.data) {
        // Conversation exists, navigate to it
        router.push(`/chat/${findResult.data.id}`);
        return;
      }

      // No existing conversation, create a new one
      const createResult = await createConversation(property.id, property.ownerId);

      if (createResult.success && createResult.data) {
        // Navigate to the newly created conversation
        router.push(`/chat/${createResult.data.id}`);
      } else {
        Alert.alert('Error', createResult.error || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error contacting owner:', error);
      Alert.alert('Error', 'Failed to start conversation. Please try again.');
    }
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
    console.log('[PropertyDetail] handleEditProperty called');
    console.log('[PropertyDetail] Platform.OS:', Platform.OS);
    console.log('[PropertyDetail] Property loaded:', !!property);
    console.log('[PropertyDetail] Property ID:', property?.id);
    console.log('[PropertyDetail] Current route params:', { id });

    if (!property) {
      console.log('[PropertyDetail] ERROR: No property loaded yet!');
      Alert.alert('Error', 'Property not loaded yet. Please wait and try again.');
      return;
    }

    if (!property.id) {
      console.log('[PropertyDetail] ERROR: Property has no ID!');
      Alert.alert('Error', 'Property ID is missing. Please try again.');
      return;
    }

    const editRoute = `/property/${property.id}/edit`;
    console.log('[PropertyDetail] Constructed route:', editRoute);

    // Validate route format
    if (!editRoute.includes(property.id)) {
      console.log('[PropertyDetail] ERROR: Route construction failed!');
      Alert.alert('Error', 'Route construction failed. Please try again.');
      return;
    }

    console.log('[PropertyDetail] Starting navigation to:', editRoute);

    // Try different navigation approaches
    if (Platform.OS === 'web') {
      console.log('[PropertyDetail] Web platform - using router.push');
      try {
        router.push(editRoute);
        console.log('[PropertyDetail] Web navigation successful');
      } catch (error) {
        console.error('[PropertyDetail] Web navigation failed:', error);
        alert('Navigation failed: ' + error.message);
      }
    } else {
      console.log('[PropertyDetail] Mobile platform - showing confirmation dialog');
      Alert.alert(
        'Edit Property',
        'Are you sure you want to edit this property?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('[PropertyDetail] User cancelled edit')
          },
          {
            text: 'Edit',
            onPress: () => {
              console.log('[PropertyDetail] User confirmed edit - attempting mobile navigation');
              console.log('[PropertyDetail] Route to navigate to:', editRoute);

              try {
                // Try router.push first
                console.log('[PropertyDetail] Attempting router.push...');
                router.push(editRoute);
                console.log('[PropertyDetail] Mobile router.push successful');
              } catch (error) {
                console.error('[PropertyDetail] Mobile router.push failed:', error);
                console.log('[PropertyDetail] Error details:', {
                  message: error.message,
                  stack: error.stack,
                  route: editRoute
                });

                // Try alternative navigation method
                console.log('[PropertyDetail] Trying router.replace as fallback...');
                try {
                  router.replace(editRoute);
                  console.log('[PropertyDetail] Mobile router.replace successful');
                } catch (replaceError) {
                  console.error('[PropertyDetail] Mobile router.replace also failed:', replaceError);
                  console.log('[PropertyDetail] Replace error details:', {
                    message: replaceError.message,
                    route: editRoute
                  });

                  Alert.alert(
                    'Navigation Error',
                    `Could not navigate to edit screen.\n\nRoute: ${editRoute}\n\nPlease try again or contact support.`,
                    [{ text: 'OK' }]
                  );
                }
              }
            }
          }
        ]
      );
    }
  };

  const handleDeleteProperty = async () => {
    console.log('[PropertyDetail] handleDeleteProperty called');
    if (!property) {
      console.log('[PropertyDetail] No property to delete');
      return;
    }

    console.log('[PropertyDetail] Starting delete for property:', property.id);

    // Skip confirmation on web for testing - directly delete
    if (Platform.OS === 'web') {
      console.log('[PropertyDetail] Web platform detected - skipping confirmation');
      setIsDeleting(true);
      try {
        const result = await deleteProperty(property.id);
        console.log('[PropertyDetail] Delete result:', result);
        if (result.success) {
          console.log('[PropertyDetail] Delete successful, navigating back');
          alert('Property deleted successfully'); // Use browser alert on web
          // Navigate back to previous screen (likely home tab)
          router.back();
        } else {
          console.log('[PropertyDetail] Delete failed:', result.error);
          alert(result.error || 'Failed to delete property'); // Use browser alert on web
        }
      } finally {
        setIsDeleting(false);
      }
    } else {
      // Mobile - use Alert.alert
      console.log('[PropertyDetail] Mobile platform - showing confirmation dialog');
      Alert.alert(
        'Delete Property',
        'Are you sure you want to delete this property? This action cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => console.log('[PropertyDetail] User cancelled delete')
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              console.log('[PropertyDetail] User confirmed delete, starting deletion');
              setIsDeleting(true);
              try {
                const result = await deleteProperty(property.id);
                console.log('[PropertyDetail] Delete result:', result);
                if (result.success) {
                  console.log('[PropertyDetail] Delete successful, navigating back');
                  Alert.alert('Success', 'Property deleted successfully');
                  // Navigate back to previous screen (likely home tab)
                  router.back();
                } else {
                  console.log('[PropertyDetail] Delete failed:', result.error);
                  Alert.alert('Error', result.error || 'Failed to delete property');
                }
              } finally {
                setIsDeleting(false);
              }
            }
          }
        ]
      );
    }
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

  // DEBUG LOGGING - Add this to check if property data is loading
  console.log("🔍 Property Details - property object:", property);
  console.log("🔍 Property Details - is property null?", !property);
  console.log("🔍 Property Details - property keys:", property ? Object.keys(property) : "NULL");
  console.log("🔍 Property Details - specific fields:", {
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    squareFeet: property.squareFeet
  });



  const isOwner = user?.uid === property.ownerId;

  // DEBUG: Check ownership
  console.log('[PropertyDetail] User ID:', user?.uid);
  console.log('[PropertyDetail] Property Owner ID:', property.ownerId);
  console.log('[PropertyDetail] Is Owner:', isOwner);

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <IconButton
          icon="chevron-left"
          iconColor={defaultTheme.colors.onPrimary}
          size={28}
          onPress={() => router.back()}
          style={styles.headerBackButton}
        />
        <Title style={styles.headerTitle}>Property Details</Title>
        <View style={styles.headerSpacer} />
      </View>

      <SafeAreaView style={styles.content} edges={[]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Media Gallery */}
          <View style={styles.imageContainer}>
          {property.primaryImageUrl || property.media?.length ? (
            property.media && property.media.length > 0 ? (
              <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                {property.media.map((m, idx) => (
                  <View key={idx} style={{ width }}>
                    {m.type === 'image' ? (
                      <Card.Cover source={{ uri: m.url }} style={styles.mainImage} />
                    ) : (
                      <Video
                        source={{ uri: m.url }}
                        style={styles.mainImage}
                        resizeMode="cover"
                        controls={true}
                        paused={false}
                        muted={false}
                        repeat={false}
                        onError={(error) => console.log('Video error:', error)}
                      />
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Card.Cover source={{ uri: property.primaryImageUrl! }} style={styles.mainImage} />
            )
          ) : (
            <Card.Cover
              source={{ uri: 'https://via.placeholder.com/400x300?text=Property+Image' }}
              style={styles.mainImage}
            />
          )}
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
              {formatPrice(property.price, property.county || property.city)}
            </Text>
            {property.deposit && (
              <Text style={styles.propertyDeposit}>
                Deposit: {formatPrice(property.deposit, property.county || property.city)}
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
        <SafeAreaView edges={['bottom']} style={styles.safeAreaContainer}>
        <View style={styles.actionContainer}>
          {isOwner ? (
            <>
              <Button
                mode="contained"
                onPress={handleEditProperty}
                style={styles.actionButton}
                icon="pencil"
              >
                Edit Property
              </Button>
              <Button
                mode="outlined"
                onPress={handleDeleteProperty}
                style={[styles.actionButton, styles.deleteButton]}
                icon="delete"
                textColor="#d32f2f"
                disabled={isDeleting}
                loading={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Property'}
              </Button>
            </>
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
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 40,
    backgroundColor: defaultTheme.colors.primary,
  },
  headerBackButton: {
    margin: -8,
  },
  headerTitle: {
    color: defaultTheme.colors.onPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 100,
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
  deleteButton: {
    borderColor: defaultTheme.colors.error,
  },
  safeAreaContainer: {
    backgroundColor: defaultTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: defaultTheme.colors.outline,
  },
});

// Force client-side rendering, disable static generation
export const dynamic = 'force-dynamic';
export const unstable_settings = {
  initialRouteName: 'index',
};
