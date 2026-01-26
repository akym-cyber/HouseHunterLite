import React, { useState } from 'react';
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
  SegmentedButtons,
  Chip,
  ProgressBar,
} from 'react-native-paper';
import { router } from 'expo-router';
import { useProperties } from '../../src/hooks/useProperties';
import { useAuth } from '../../src/hooks/useAuth';
import { defaultTheme } from '../../src/styles/theme';
import { PROPERTY_TYPES, AMENITIES, VALIDATION_RULES } from '../../src/utils/constants';
import { Property, PropertyType, PropertyMedia } from '../../src/types/database';
import ImageUpload from '../../src/components/property/ImageUpload';
import { MediaFile, cloudinaryService } from '../../src/services/firebase/storage';

export default function CreatePropertyScreen() {
  const { user } = useAuth();
  const { createProperty, updateProperty } = useProperties();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileProgress, setFileProgress] = useState<Record<string, number>>({});
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'apartment' as PropertyType,
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
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
    county: '',
    constituency: '',
    ward: '',
    estate: '',
    building: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate required fields
    const requiredFields = ['title', 'county', 'constituency', 'ward', 'estate', 'price', 'bedrooms', 'bathrooms'];

    requiredFields.forEach(field => {
      const value = formData[field as keyof typeof formData];
      // Skip validation for non-primitive types
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
    console.log('=== PROPERTY CREATION DEBUG ===');

    const isValid = validateForm();
    if (!isValid) {
      console.log('Validation failed; errors:', errors);
      return;
    }

    // 1. Check user
    console.log('1. User exists?', !!user);
    console.log('2. User ID (uid):', user?.uid);

    // 2. Check form data
    console.log('4. Form data:', JSON.stringify(formData, null, 2));

    // 3. Check validation
    console.log('5. Form valid?', isValid);
    console.log('6. Validation errors:', errors);

    // 4. Check media
    console.log('7. Has images?', media.length > 0);

    setLoading(true);
    setUploadProgress(0);
    
    try {
      // 5. Try to create minimal property FIRST
      const testData: any = {
        title: formData.title || 'Test Property',
        price: formData.price ? parseFloat(formData.price) : 1000,
        createdAt: new Date().toISOString(),
        userId: user?.uid,
        test: true,
      };
      console.log('8. Test data:', testData);

      const testResult = await createProperty({
        title: testData.title,
        description: 'Test entry',
        propertyType: 'apartment',
        addressLine1: 'Test address',
        city: 'Nairobi',
        state: 'Nairobi',
        postalCode: '00000',
        country: 'Kenya',
        price: testData.price,
        bedrooms: 1,
        bathrooms: 1,
        status: 'available' as const,
        ownerId: user?.uid || '',
      } as any);
      console.log('9. Firestore result (test):', testResult);

      if (!testResult.success || !testResult.data) {
        throw new Error(testResult.error || 'Test property creation failed');
      }

      // If test works, try full property
      console.log('10. Test SUCCESS - now trying full property...');

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
        status: 'available' as const,
        county: formData.county,
        constituency: formData.constituency,
        ward: formData.ward,
        estate: formData.estate,
        ...(formData.building?.trim() ? { building: formData.building.trim() } : {}),
        ...(formData.deposit?.trim() ? { deposit: parseFloat(formData.deposit.trim()) } : {}),
        ...(formData.squareFeet?.trim() ? { squareFeet: parseInt(formData.squareFeet.trim()) } : {}),
        ...(formData.amenities.length > 0 ? { amenities: formData.amenities } : {}),
      };

      const result = await createProperty(propertyData);
      
      if (result.success && result.data) {
        // Upload media files if any (Cloudinary)
        if (media.length > 0) {
          const onPerFileProgress = (index: number, progress: number) => {
            const pct = ((index + 1) / media.length) * 100;
            setUploadProgress(pct);
          };
          const onProgressById = (fileId: string, progress: number) => {
            setFileProgress(prev => ({ ...prev, [fileId]: progress }));
          };

          const uploadResult = await cloudinaryService.uploadMedia(media, onPerFileProgress, onProgressById);

          if (!uploadResult.success || !uploadResult.resources) {
            Alert.alert('Warning', uploadResult.error || 'Property created but some media failed to upload. You can add them later.');
          } else {
            // Map to PropertyMedia and save
            const mediaDocs: PropertyMedia[] = uploadResult.resources.map((r, idx) => ({
              url: r.url,
              type: r.type,
              isPrimary: media[idx]?.isPrimary || false,
              order: idx,
              bytes: r.bytes,
              ...(r.thumbnailUrl ? { thumbnailUrl: r.thumbnailUrl } : {}),
              ...(r.durationMs ? { durationMs: r.durationMs } : {}),
              ...(r.originalName ? { originalName: r.originalName } : {}),
            }));

            const primaryImage = mediaDocs.find(m => m.type === 'image' && (m.isPrimary || m.order === 0));

            const updateData: Partial<Property> = {
              media: mediaDocs,
            };
            if (primaryImage?.url) {
              updateData.primaryImageUrl = primaryImage.url;
            }

            await updateProperty(result.data.id, updateData);
          }
        }
        
        Alert.alert('Success', 'Property created successfully!');
        router.back();
      } else {
        Alert.alert('Error', result.error || 'Failed to create property');
      }
    } catch (error: any) {
      console.log('❌ ERROR at step:', error);
      console.log('Error details:', error?.message, error?.code);
      Alert.alert('Error', error?.message || 'An unexpected error occurred');
    } finally {
      console.log('=== END DEBUG ===');
      setLoading(false);
      setUploadProgress(0);
      setFileProgress({});
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 32 }}>
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
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Location</Title>
            
            <TextInput
              label="County (e.g., Nairobi, Mombasa, Kisumu)"
              value={formData.county || ''}
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
              value={formData.constituency || ''}
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
              value={formData.ward || ''}
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
              value={formData.estate || ''}
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
              value={formData.building || ''}
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
              {/* Per-file progress list */}
              {media.map((m) => (
                <Text key={m.id} style={styles.progressText}>
                  {m.name} — {Math.round(fileProgress[m.id] || 0)}%
                </Text>
              ))}
            </Card.Content>
          </Card>
        )}

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={[styles.submitButton, { marginBottom: 24 }]}
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Creating Property...' : 'Create Property'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: defaultTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: defaultTheme.colors.onSurface,
  },
  segmentedButtons: {
    marginBottom: 16,
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
  submitButton: {
    paddingVertical: 8,
  },
  progressBar: {
    marginVertical: 8,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    color: defaultTheme.colors.onSurfaceVariant,
  },
});
