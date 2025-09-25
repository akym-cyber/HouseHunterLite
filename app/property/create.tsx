import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
} from 'react-native';
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
import { Property, PropertyType } from '../../src/types/database';
import ImageUpload from '../../src/components/property/ImageUpload';
import { storageService, MediaFile } from '../../src/services/firebase/storage';

export default function CreatePropertyScreen() {
  const { user } = useAuth();
  const { createProperty } = useProperties();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
      case 'addressLine1':
        return !value ? 'Address is required' : '';
      case 'city':
        return !value ? 'City is required' : '';
      case 'state':
        return !value ? 'State is required' : '';
      case 'postalCode':
        return !value ? 'Postal code is required' : '';
      case 'price':
        if (!value) return 'Price is required';
        const price = parseFloat(value as string);
        if (isNaN(price) || price < VALIDATION_RULES.PRICE_MIN) {
          return `Price must be at least $${VALIDATION_RULES.PRICE_MIN}`;
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
    const requiredFields = ['title', 'addressLine1', 'city', 'state', 'postalCode', 'price', 'bedrooms', 'bathrooms'];
    
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
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    
    try {
      // First create the property
      const propertyData = {
        title: formData.title,
        description: formData.description,
        propertyType: formData.propertyType,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: 'US', // Default country
        price: parseFloat(formData.price),
        deposit: formData.deposit ? parseFloat(formData.deposit) : undefined,
        bedrooms: parseInt(formData.bedrooms),
        bathrooms: parseFloat(formData.bathrooms),
        squareFeet: formData.squareFeet ? parseInt(formData.squareFeet) : undefined,
        furnished: formData.furnished,
        petFriendly: formData.petFriendly,
        parkingAvailable: formData.parkingAvailable,
        utilitiesIncluded: formData.utilitiesIncluded,
        amenities: formData.amenities.length > 0 ? formData.amenities : undefined,
        status: 'available' as const,
        county: formData.county,
        constituency: formData.constituency,
        ward: formData.ward,
        estate: formData.estate,
        building: formData.building,
      };

      const result = await createProperty(propertyData);
      
      if (result.success && result.data) {
        // Upload media files if any
        if (media.length > 0) {
          const uploadResult = await storageService.uploadMultipleFiles(
            media,
            result.data.id,
            (progress) => setUploadProgress(progress)
          );
          
          if (!uploadResult.success) {
            Alert.alert('Warning', 'Property created but some media failed to upload. You can add them later.');
          }
        }
        
        Alert.alert('Success', 'Property created successfully!');
        router.back();
      } else {
        Alert.alert('Error', result.error || 'Failed to create property');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setUploadProgress(0);
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
            />

            <TextInput
              label="Constituency"
              value={formData.constituency || ''}
              onChangeText={(text) => handleFieldChange('constituency', text)}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Ward"
              value={formData.ward || ''}
              onChangeText={(text) => handleFieldChange('ward', text)}
              mode="outlined"
              style={styles.input}
            />

            <TextInput
              label="Estate/Street Name"
              value={formData.estate || ''}
              onChangeText={(text) => handleFieldChange('estate', text)}
              mode="outlined"
              style={styles.input}
            />

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