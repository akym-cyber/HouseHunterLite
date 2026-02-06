import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  HelperText,
  Chip,
  ProgressBar,
  IconButton,
} from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../../src/theme/useTheme';
import { useProperties } from '../../../src/hooks/useProperties';
import { useAuth } from '../../../src/hooks/useAuth';
import { PROPERTY_TYPES, AMENITIES, VALIDATION_RULES } from '../../../src/utils/constants';
import { Property, PropertyMedia, WeekdayKey, ViewingTimeSlotRange } from '../../../src/types/database';
import ImageUpload from '../../../src/components/property/ImageUpload';
import { MediaFile, cloudinaryService } from '../../../src/services/firebase/storage';
import {
  DEFAULT_VIEWING_DAYS,
  DEFAULT_VIEWING_TIME_RANGES,
  WEEKDAY_OPTIONS,
  WEEKDAY_KEY_BY_INDEX,
  normalizeViewingTimeSlots,
} from '../../../src/utils/viewingDefaults';
import BlockedDatePicker from '../../../src/components/viewings/BlockedDatePicker';
import TimeSlotBuilder from '../../../src/components/viewings/TimeSlotBuilder';

const mapDaysToKeys = (days: number[]): WeekdayKey[] =>
  days
    .map((day) => WEEKDAY_KEY_BY_INDEX[day])
    .filter((key): key is WeekdayKey => !!key);

export default function EditPropertyScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { getPropertyById, updateProperty, deleteProperty } = useProperties();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [existingMedia, setExistingMedia] = useState<PropertyMedia[]>([]);
  const [blockedPickerVisible, setBlockedPickerVisible] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'apartment' as any,
    county: '',
    constituency: '',
    ward: '',
    estate: '',
    building: '',
    price: '',
    deposit: '',
    bedrooms: '',
    bathrooms: '',
    squareFeet: '',
    furnished: false,
    petFriendly: false,
    parkingAvailable: false,
    utilitiesIncluded: false,
    amenities: [] as string[],
    viewingDays: DEFAULT_VIEWING_DAYS as number[],
    viewingTimeSlots: normalizeViewingTimeSlots(
      DEFAULT_VIEWING_TIME_RANGES,
      mapDaysToKeys(DEFAULT_VIEWING_DAYS)
    ) as ViewingTimeSlotRange[],
    blockedDates: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const styles = useMemo(() => createStyles(theme), [theme]);

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
      const property = result.data;
      setFormData({
        title: property.title || '',
        description: property.description || '',
        propertyType: property.propertyType || 'apartment',
        county: property.county || '',
        constituency: property.constituency || '',
        ward: property.ward || '',
        estate: property.estate || '',
        building: property.building || '',
        price: property.price?.toString() || '',
        deposit: property.deposit?.toString() || '',
        bedrooms: property.bedrooms?.toString() || '',
        bathrooms: property.bathrooms?.toString() || '',
        squareFeet: property.squareFeet?.toString() || '',
        furnished: property.furnished || false,
        petFriendly: property.petFriendly || false,
        parkingAvailable: property.parkingAvailable || false,
        utilitiesIncluded: property.utilitiesIncluded || false,
        amenities: property.amenities || [],
        viewingDays: property.viewingDays && property.viewingDays.length > 0 ? property.viewingDays : DEFAULT_VIEWING_DAYS,
        viewingTimeSlots: normalizeViewingTimeSlots(
          property.viewingTimeSlots && property.viewingTimeSlots.length > 0
            ? property.viewingTimeSlots
            : DEFAULT_VIEWING_TIME_RANGES,
          mapDaysToKeys(property.viewingDays && property.viewingDays.length > 0 ? property.viewingDays : DEFAULT_VIEWING_DAYS)
        ),
        blockedDates: property.blockedDates || [],
      });
      setExistingMedia(property.media || []);
    } else {
      Alert.alert('Error', 'Failed to load property details');
      router.back();
    }
    setLoading(false);
  };

  const validateField = (name: string, value: string | number | boolean) => {
    switch (name) {
      case 'title':
        if (!value) return 'Title is required';
        if (typeof value === 'string' && value.length < VALIDATION_RULES.TITLE_MIN_LENGTH) {
          return `Title must be at least ${VALIDATION_RULES.TITLE_MIN_LENGTH} characters`;
        }
        return '';
      case 'county':
        return !value ? 'County is required' : '';
      case 'constituency':
        return !value ? 'Constituency is required' : '';
      case 'ward':
        return !value ? 'Ward is required' : '';
      case 'estate':
        return !value ? 'Estate/Street is required' : '';
      case 'price':
        if (!value) return 'Price is required';
        const price = parseFloat(value as string);
        if (isNaN(price) || price < VALIDATION_RULES.PRICE_MIN) {
          return `Price must be at least KES ${VALIDATION_RULES.PRICE_MIN}`;
        }
        return '';
      case 'bedrooms':
        if (!value) return 'Number of bedrooms is required';
        const bedrooms = parseInt(value as string);
        if (isNaN(bedrooms) || bedrooms < 0) {
          return 'Bedrooms must be a valid number';
        }
        return '';
      case 'bathrooms':
        if (!value) return 'Number of bathrooms is required';
        const bathrooms = parseFloat(value as string);
        if (isNaN(bathrooms) || bathrooms < 0) {
          return 'Bathrooms must be a valid number';
        }
        return '';
      default:
        return '';
    }
  };

  const handleFieldChange = (name: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const normalizeSlotsForDays = (
    slots: ViewingTimeSlotRange[],
    nextDays: number[]
  ): ViewingTimeSlotRange[] => {
    const allowedKeys = mapDaysToKeys(nextDays);
    if (allowedKeys.length === 0) return slots;
    return slots
      .map((slot) => {
        const slotDays = slot.days && slot.days.length > 0 ? slot.days : allowedKeys;
        const filtered = slotDays.filter((key) => allowedKeys.includes(key));
        if (filtered.length === 0) return null;
        return { ...slot, days: filtered };
      })
      .filter((slot): slot is ViewingTimeSlotRange => slot !== null);
  };

  const handleViewingDayToggle = (day: number) => {
    setFormData(prev => {
      const nextDays = prev.viewingDays.includes(day)
        ? prev.viewingDays.filter(d => d !== day)
        : [...prev.viewingDays, day];
      return {
        ...prev,
        viewingDays: nextDays,
        viewingTimeSlots: normalizeSlotsForDays(prev.viewingTimeSlots, nextDays),
      };
    });
  };

  const handleApplyBlockedDates = (dates: string[]) => {
    setFormData(prev => ({
      ...prev,
      blockedDates: dates.slice().sort()
    }));
  };

  const handleTimeSlotsChange = (slots: ViewingTimeSlotRange[]) => {
    setFormData(prev => ({
      ...prev,
      viewingTimeSlots: slots,
    }));
  };

  const handleRemoveBlockedDate = (dateKey: string) => {
    setFormData(prev => ({
      ...prev,
      blockedDates: prev.blockedDates.filter(d => d !== dateKey)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const requiredFields = ['title', 'county', 'constituency', 'ward', 'estate', 'price', 'bedrooms', 'bathrooms'];

    requiredFields.forEach(field => {
      const value = formData[field as keyof typeof formData];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        const error = validateField(field, value);
        if (error) {
          newErrors[field] = error;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setUploadProgress(0);

    try {
      const propertyData = {
        title: formData.title,
        description: formData.description,
        propertyType: formData.propertyType,
        addressLine1: `${formData.estate}${formData.building ? ', ' + formData.building : ''}, ${formData.ward}, ${formData.constituency}`,
        city: formData.county,
        state: 'Kenya',
        postalCode: '',
        country: 'Kenya',
        price: parseFloat(formData.price),
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseFloat(formData.bathrooms),
        furnished: formData.furnished,
        petFriendly: formData.petFriendly,
        parkingAvailable: formData.parkingAvailable,
        utilitiesIncluded: formData.utilitiesIncluded,
        county: formData.county,
        constituency: formData.constituency,
        ward: formData.ward,
        estate: formData.estate,
        ...(formData.building?.trim() ? { building: formData.building.trim() } : {}),
        ...(formData.deposit?.trim() ? { deposit: parseFloat(formData.deposit.trim()) } : {}),
        ...(formData.squareFeet?.trim() ? { squareFeet: parseInt(formData.squareFeet.trim()) } : {}),
        ...(formData.amenities.length > 0 ? { amenities: formData.amenities } : {}),
        viewingDays: formData.viewingDays,
        viewingTimeSlots: formData.viewingTimeSlots,
        blockedDates: formData.blockedDates,
        updatedAt: new Date().toISOString(),
      };

      const updateResult = await updateProperty(id, propertyData);

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update property');
      }

      // Handle new media uploads
      if (media.length > 0) {
        const onPerFileProgress = (index: number, progress: number) => {
          const pct = ((index + 1) / media.length) * 100;
          setUploadProgress(pct);
        };
        const onProgressById = (fileId: string, progress: number) => {
          setFileProgress(prev => ({ ...prev, [fileId]: progress }));
        };

        const uploadResult = await cloudinaryService.uploadMedia(media, onPerFileProgress, onProgressById);

        if (uploadResult.success && uploadResult.resources) {
          const newMediaDocs: PropertyMedia[] = uploadResult.resources.map((r, idx) => ({
            url: r.url,
            type: r.type,
            isPrimary: media[idx]?.isPrimary || false,
            order: existingMedia.length + idx,
            bytes: r.bytes,
            ...(r.thumbnailUrl ? { thumbnailUrl: r.thumbnailUrl } : {}),
            ...(r.durationMs ? { durationMs: r.durationMs } : {}),
            ...(r.originalName ? { originalName: r.originalName } : {}),
          }));

          const combinedMedia = [...existingMedia, ...newMediaDocs];
          const primaryImage = combinedMedia.find(m => m.type === 'image' && (m.isPrimary || m.order === 0));

          const mediaUpdate: Partial<Property> = {
            media: combinedMedia,
          };
          if (primaryImage?.url && !updateResult.data?.primaryImageUrl) {
            mediaUpdate.primaryImageUrl = primaryImage.url;
          }

          await updateProperty(id, mediaUpdate);
        } else {
          Alert.alert('Warning', 'Property updated but some media failed to upload.');
        }
      }

      Alert.alert('Success', 'Property updated successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
      setUploadProgress(0);
      setFileProgress({});
    }
  };

  const handleDeleteProperty = () => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const result = await deleteProperty(id);
              if (result.success) {
                Alert.alert('Success', 'Property deleted successfully');
                // Navigate back to previous screen (likely home tab showing properties)
                router.back();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete property');
              }
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <IconButton
            icon="chevron-left"
            iconColor={theme.colors.onPrimary}
            size={28}
            onPress={() => router.back()}
            style={styles.headerBackButton}
          />
          <Title style={styles.headerTitle}>Edit Property</Title>
          <View style={styles.headerSpacer} />
        </View>
        <SafeAreaView style={styles.content} edges={[]}>
          <View style={styles.loadingContainer}>
            <Text>Loading property...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
        <Title style={styles.headerTitle}>Edit Property</Title>
        <View style={styles.headerSpacer} />
      </View>

      <SafeAreaView style={styles.content} edges={[]}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Basic Information</Title>

            <TextInput
              label="Property Title"
              value={formData.title}
              onChangeText={(text) => handleFieldChange('title', text)}
              mode="outlined"
              style={styles.input}
              error={!!errors.title}
            />
            <HelperText type="error" visible={!!errors.title}>
              {errors.title}
            </HelperText>

            <TextInput
              label="Description"
              value={formData.description}
              onChangeText={(text) => handleFieldChange('description', text)}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            {/* Image Upload Section */}
            <ImageUpload
              media={media}
              onMediaChange={setMedia}
              maxFiles={10}
              allowVideos={true}
            />

            {/* Existing Media Display */}
            {existingMedia.length > 0 && (
              <Card style={styles.existingMediaCard}>
                <Card.Content>
                  <Title style={styles.existingMediaTitle}>Existing Media</Title>
                  <Text style={styles.existingMediaText}>
                    {existingMedia.length} existing file(s). New uploads will be added.
                  </Text>
                </Card.Content>
              </Card>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Property Type</Title>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['Apartment', 'House', 'Studio', 'Townhouse', 'Condo'].map((type) => (
                  <Chip
                    key={type}
                    selected={formData.propertyType === type.toLowerCase()}
                    onPress={() => handleFieldChange('propertyType', type.toLowerCase())}
                    style={styles.featureChip}
                  >
                    {type}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Location</Title>

            <TextInput
              label="County (e.g., Nairobi, Mombasa, Kisumu)"
              value={formData.county}
              onChangeText={(text) => handleFieldChange('county', text)}
              mode="outlined"
              style={styles.input}
              error={!!errors.county}
            />
            <HelperText type="error" visible={!!errors.county}>
              {errors.county}
            </HelperText>

            <TextInput
              label="Constituency"
              value={formData.constituency}
              onChangeText={(text) => handleFieldChange('constituency', text)}
              mode="outlined"
              style={styles.input}
              error={!!errors.constituency}
            />
            <HelperText type="error" visible={!!errors.constituency}>
              {errors.constituency}
            </HelperText>

            <TextInput
              label="Ward"
              value={formData.ward}
              onChangeText={(text) => handleFieldChange('ward', text)}
              mode="outlined"
              style={styles.input}
              error={!!errors.ward}
            />
            <HelperText type="error" visible={!!errors.ward}>
              {errors.ward}
            </HelperText>

            <TextInput
              label="Estate/Street Name"
              value={formData.estate}
              onChangeText={(text) => handleFieldChange('estate', text)}
              mode="outlined"
              style={styles.input}
              error={!!errors.estate}
            />
            <HelperText type="error" visible={!!errors.estate}>
              {errors.estate}
            </HelperText>

            <TextInput
              label="Building Name/No (Optional)"
              value={formData.building}
              onChangeText={(text) => handleFieldChange('building', text)}
              mode="outlined"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Pricing & Details</Title>

            <View style={styles.row}>
              <TextInput
                label="Monthly Rent (KES)"
                value={formData.price}
                onChangeText={(text) => handleFieldChange('price', text)}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
                error={!!errors.price}
              />
              <TextInput
                label="Deposit (KES)"
                value={formData.deposit}
                onChangeText={(text) => handleFieldChange('deposit', text)}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
              />
            </View>
            <HelperText type="error" visible={!!errors.price}>
              {errors.price}
            </HelperText>

            <View style={styles.row}>
              <TextInput
                label="Bedrooms"
                value={formData.bedrooms}
                onChangeText={(text) => handleFieldChange('bedrooms', text)}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
                error={!!errors.bedrooms}
              />
              <TextInput
                label="Bathrooms"
                value={formData.bathrooms}
                onChangeText={(text) => handleFieldChange('bathrooms', text)}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, styles.halfInput]}
                error={!!errors.bathrooms}
              />
            </View>
            <HelperText type="error" visible={!!errors.bedrooms}>
              {errors.bedrooms}
            </HelperText>
            <HelperText type="error" visible={!!errors.bathrooms}>
              {errors.bathrooms}
            </HelperText>

            <TextInput
              label="Square Feet (Optional)"
              value={formData.squareFeet}
              onChangeText={(text) => handleFieldChange('squareFeet', text)}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Features</Title>

            <View style={styles.featuresContainer}>
              <Chip
                selected={formData.furnished}
                onPress={() => handleFieldChange('furnished', !formData.furnished)}
                style={styles.featureChip}
              >
                Furnished
              </Chip>
              <Chip
                selected={formData.petFriendly}
                onPress={() => handleFieldChange('petFriendly', !formData.petFriendly)}
                style={styles.featureChip}
              >
                Pet Friendly
              </Chip>
              <Chip
                selected={formData.parkingAvailable}
                onPress={() => handleFieldChange('parkingAvailable', !formData.parkingAvailable)}
                style={styles.featureChip}
              >
                Parking Available
              </Chip>
              <Chip
                selected={formData.utilitiesIncluded}
                onPress={() => handleFieldChange('utilitiesIncluded', !formData.utilitiesIncluded)}
                style={styles.featureChip}
              >
                Utilities Included
              </Chip>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Viewing Availability</Title>
            <Text style={styles.subSectionTitle}>Available Days</Text>
            <View style={styles.featuresContainer}>
              {WEEKDAY_OPTIONS.map((day) => (
                <Chip
                  key={day.value}
                  selected={formData.viewingDays.includes(day.value)}
                  onPress={() => handleViewingDayToggle(day.value)}
                  style={styles.featureChip}
                >
                  {day.label}
                </Chip>
              ))}
            </View>
            <Text style={styles.subSectionTitle}>Time Slots</Text>
            <TimeSlotBuilder
              slots={formData.viewingTimeSlots}
              onChange={handleTimeSlotsChange}
              availableDays={formData.viewingDays}
            />
            <Text style={styles.subSectionTitle}>Blocked Dates</Text>
            <Button
              mode="outlined"
              onPress={() => setBlockedPickerVisible(true)}
              style={styles.blockedButton}
            >
              Choose Blocked Dates
            </Button>
            <View style={styles.featuresContainer}>
              {formData.blockedDates.map((date) => (
                <Chip
                  key={date}
                  onPress={() => handleRemoveBlockedDate(date)}
                  style={styles.featureChip}
                >
                  {date}
                </Chip>
              ))}
            </View>
            <BlockedDatePicker
              visible={blockedPickerVisible}
              blockedDates={formData.blockedDates}
              onDismiss={() => setBlockedPickerVisible(false)}
              onConfirm={handleApplyBlockedDates}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Amenities</Title>
            <View style={styles.amenitiesContainer}>
              {AMENITIES.map((amenity) => (
                <Chip
                  key={amenity}
                  selected={formData.amenities.includes(amenity)}
                  onPress={() => handleAmenityToggle(amenity)}
                  style={styles.amenityChip}
                >
                  {amenity}
                </Chip>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Upload Progress */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Uploading Media...</Text>
              <ProgressBar progress={uploadProgress / 100} style={styles.progressBar} />
              <Text style={styles.progressText}>{Math.round(uploadProgress)}% Complete</Text>
              {media.map((m) => (
                <Text key={m.id} style={styles.progressText}>
                  {m.name} — {Math.round(fileProgress[m.id] || 0)}%
                </Text>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

        <SafeAreaView edges={['bottom']} style={styles.safeAreaContainer}>
          <View style={styles.actionContainer}>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.actionButton}
              loading={saving}
              disabled={saving}
            >
              {saving ? 'Updating Property...' : 'Update Property'}
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
          </View>
        </SafeAreaView>
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
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.onSurfaceVariant,
  },
  blockedButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  input: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  halfInput: {
    flex: 1,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    marginBottom: 8,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityChip: {
    marginBottom: 8,
  },
  progressBar: {
    marginVertical: 8,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    color: theme.colors.onSurfaceVariant,
  },
  existingMediaCard: {
    marginTop: 16,
    backgroundColor: theme.colors.surfaceVariant,
  },
  existingMediaTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  existingMediaText: {
    fontSize: 14,
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
