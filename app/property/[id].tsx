import React, { useState, useMemo, useEffect } from 'react';
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
  TextInput,
  Chip,
  Divider,
  IconButton,
  FAB,
  Dialog,
  Portal,
} from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import { useLocalSearchParams, router } from 'expo-router';
import { useProperties } from '../../src/hooks/useProperties';
import { useAuth } from '../../src/hooks/useAuth';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useMessages } from '../../src/hooks/useMessages';
import { useApplications } from '../../src/hooks/useApplications';
import { applicationHelpers, propertyHelpers } from '../../src/services/firebase/firebaseHelpers';
import { Property } from '../../src/types/database';
import { formatPrice } from '../../src/utils/constants';
import { Video, ResizeMode } from 'expo-av';

const { width } = Dimensions.get('window');
const mediaWidth = Math.max(0, width - 32);
const mediaHeight = Math.round(mediaWidth * 4 / 3);

export default function PropertyDetailsScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { properties, loading: propertiesLoading, refreshProperties, deleteProperty } = useProperties();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { findConversationByOwner, createConversation } = useMessages();
  const { applications } = useApplications('tenant');
  const [fetchedProperty, setFetchedProperty] = useState<Property | null>(null);
  const [fetchByIdError, setFetchByIdError] = useState<string | null>(null);
  const [isFetchingById, setIsFetchingById] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);

  const propertyId = Array.isArray(id) ? id[0] : id;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const propertyFromList = useMemo(
    () => properties.find((item) => item.id === propertyId) || null,
    [properties, propertyId]
  );
  const property = propertyFromList ?? fetchedProperty;
  const existingApplication = useMemo(() => {
    if (!user || !property) return null;
    return applications.find(app => app.propertyId === property.id && app.tenantId === user.uid) || null;
  }, [applications, property, user]);
  const hasApplied = !!existingApplication;

  useEffect(() => {
    if (!propertyId || propertyId === 'undefined' || propertyId === 'null') return;
    if (propertyFromList) return;
    if (propertiesLoading) return;
    if (isFetchingById) return;
    if (fetchedProperty && fetchedProperty.id === propertyId) return;

    setIsFetchingById(true);
    setFetchByIdError(null);

    propertyHelpers.getPropertyById(propertyId)
      .then((result) => {
        if (result.data) {
          setFetchedProperty(result.data);
        } else {
          setFetchByIdError(result.error || 'Property not found');
        }
      })
      .catch(() => {
        setFetchByIdError('Failed to load property details');
      })
      .finally(() => {
        setIsFetchingById(false);
      });
  }, [propertyId, propertyFromList, propertiesLoading, isFetchingById, fetchedProperty]);

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
      // First, try to find an existing conversation for this owner
      const findResult = await findConversationByOwner(property.ownerId, property.ownerId);

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

    if (!property) return;
    router.push({
      pathname: '/schedule-viewing/[propertyId]',
      params: { propertyId: property.id }
    });
  };

  const handleOpenApply = () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to apply');
      return;
    }
    if (!property) return;
    if (user.uid === property.ownerId) {
      Alert.alert('Error', 'You cannot apply to your own property');
      return;
    }
    if (hasApplied) {
      Alert.alert('Already applied', 'You have already applied for this property.');
      return;
    }
    setApplyVisible(true);
  };

  const handleSubmitApplication = async () => {
    if (!user || !property) return;
    setApplySubmitting(true);
    try {
      const existing = applications.find(app => app.propertyId === property.id && app.tenantId === user.uid);
      if (existing) {
        Alert.alert('Already applied', 'You have already applied for this property.');
        setApplySubmitting(false);
        setApplyVisible(false);
        return;
      }

      const result = await applicationHelpers.createApplication({
        propertyId: property.id,
        tenantId: user.uid,
        ownerId: property.ownerId,
        message: applyMessage.trim(),
        status: 'pending',
      });

      if (result.error) {
        Alert.alert('Error', result.error || 'Failed to submit application');
        return;
      }

      Alert.alert('Application sent', 'Your application has been submitted.');
      setApplyVisible(false);
      setApplyMessage('');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to submit application');
    } finally {
      setApplySubmitting(false);
    }
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

  if ((propertiesLoading || isFetchingById) && !property) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading property details...</Text>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.errorContainer}>
        <Text>{fetchByIdError || 'Property not found'}</Text>
        <Button mode="outlined" onPress={refreshProperties} style={{ marginTop: 12 }}>
          Retry
        </Button>
      </View>
    );
  }

  const isOwner = user?.uid === property.ownerId;

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <IconButton
          icon="chevron-left"
          iconColor={theme.colors.onPrimary}
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
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={mediaWidth}
                snapToAlignment="start"
                decelerationRate="fast"
                style={{ width: mediaWidth }}
              >
                {property.media.map((m, idx) => (
                  <View key={idx} style={{ width: mediaWidth }}>
                    {m.type === 'image' ? (
                      <Card.Cover
                        source={{ uri: m.url }}
                        style={[styles.mainImage, { width: mediaWidth, height: mediaHeight }]}
                        resizeMode="cover"
                      />
                    ) : (
                      <Video
                        source={{ uri: m.url }}
                        style={[styles.mainImage, { width: mediaWidth, height: mediaHeight }]}
                        resizeMode={ResizeMode.COVER}
                        useNativeControls
                        shouldPlay
                        isMuted={false}
                        onError={(error) => console.log('Video error:', error)}
                      />
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Card.Cover
                source={{ uri: property.primaryImageUrl! }}
                style={[styles.mainImage, { width: mediaWidth, height: mediaHeight }]}
                resizeMode="cover"
              />
            )
          ) : (
            <View style={[styles.imagePlaceholder, { width: mediaWidth, height: mediaHeight }]} />
          )}
          <IconButton
            icon={isFavorite(property.id) ? 'heart' : 'heart-outline'}
            iconColor={isFavorite(property.id) ? theme.app.favoriteActive : theme.app.iconOnDark}
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
                textColor={theme.colors.error}
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
                onPress={handleOpenApply}
                style={styles.actionButton}
                icon="file-document"
                disabled={applySubmitting || hasApplied}
                loading={applySubmitting}
              >
                {hasApplied ? 'Application Submitted' : 'Apply Now'}
              </Button>
              <Button
                mode="outlined"
                onPress={handleScheduleViewing}
                style={styles.actionButton}
                icon="calendar"
              >
                Schedule Viewing
              </Button>
              <Button
                mode="outlined"
                onPress={handleContactOwner}
                style={styles.actionButton}
                icon="message"
              >
                Contact Owner
              </Button>
            </>
          )}
        </View>
        </SafeAreaView>

        <Portal>
          <Dialog visible={applyVisible} onDismiss={() => setApplyVisible(false)}>
            <Dialog.Title>Apply for this property</Dialog.Title>
            <Dialog.Content>
              <TextInput
                label="Message (optional)"
                value={applyMessage}
                onChangeText={setApplyMessage}
                mode="outlined"
                multiline
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setApplyVisible(false)}>Cancel</Button>
              <Button onPress={handleSubmitApplication} loading={applySubmitting}>
                Submit
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 40,
    backgroundColor: theme.colors.primary,
  },
  headerBackButton: {
    margin: -8,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
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
    backgroundColor: theme.app.background,
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
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  imagePlaceholder: {
    backgroundColor: theme.app.background,
    borderRadius: 8,
  },
  mainImage: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: theme.app.overlayMedium,
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
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  propertyPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  propertyDeposit: {
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.onSurfaceVariant,
  },
  availabilityStatus: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  availableDate: {
    color: theme.colors.onSurfaceVariant,
  },
  actionContainer: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  actionButton: {
    marginBottom: 8,
  },
  deleteButton: {
    borderColor: theme.colors.error,
  },
  safeAreaContainer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
});

// Force client-side rendering, disable static generation
export const dynamic = 'force-dynamic';
export const unstable_settings = {
  initialRouteName: 'index',
};
