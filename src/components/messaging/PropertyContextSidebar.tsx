import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import {
  Text,
  Card,
  Chip,
  Button,
  Divider,
  IconButton,
  Avatar,
} from 'react-native-paper';
import { Property } from '../../types/database';
import { defaultTheme } from '../../styles/theme';
import { formatKes } from '../../services/payments/mpesaService';

const { width } = Dimensions.get('window');

interface PropertyContextSidebarProps {
  property: Property;
  onClose?: () => void;
  onScheduleViewing?: () => void;
  onSendDocument?: () => void;
  onGenerateQuote?: () => void;
  onMakePayment?: () => void;
  compact?: boolean;
}

export default function PropertyContextSidebar({
  property,
  onClose,
  onScheduleViewing,
  onSendDocument,
  onGenerateQuote,
  onMakePayment,
  compact = false,
}: PropertyContextSidebarProps) {
  const primaryImage = property.media?.find(m => m.isPrimary) ||
                      property.media?.[0] ||
                      { url: property.primaryImageUrl };

  const renderKenyanLocation = () => {
    const locationParts = [];
    if (property.estate) locationParts.push(property.estate);
    if (property.ward) locationParts.push(`Ward ${property.ward}`);
    if (property.constituency) locationParts.push(property.constituency);
    if (property.county) locationParts.push(`${property.county} County`);

    return locationParts.length > 0 ? locationParts.join(', ') : property.city;
  };

  const renderAmenities = () => {
    if (!property.amenities || property.amenities.length === 0) return null;

    return (
      <View style={styles.amenitiesContainer}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        <View style={styles.amenitiesList}>
          {property.amenities.slice(0, compact ? 4 : 8).map((amenity, index) => (
            <Chip key={index} style={styles.amenityChip} textStyle={styles.amenityText}>
              {amenity}
            </Chip>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Card style={[styles.container, compact && styles.compactContainer]}>
      {!compact && (
        <Card.Title
          title={property.title}
          subtitle={renderKenyanLocation()}
          right={(props) => onClose && (
            <IconButton {...props} icon="close" onPress={onClose} />
          )}
        />
      )}

      <Card.Content style={compact && styles.compactContent}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Property Image */}
          {primaryImage?.url && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: primaryImage.url }}
                style={[styles.propertyImage, compact && styles.compactImage]}
                resizeMode="cover"
              />
              {!compact && (
                <View style={styles.priceOverlay}>
                  <Text style={styles.priceText}>
                    {formatKes(property.price)}/month
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Compact Header */}
          {compact && (
            <View style={styles.compactHeader}>
              <Text style={styles.compactTitle} numberOfLines={1}>
                {property.title}
              </Text>
              <Text style={styles.compactPrice}>
                {formatKes(property.price)}/mo
              </Text>
            </View>
          )}

          {/* Key Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bedrooms:</Text>
              <Text style={styles.detailValue}>{property.bedrooms}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Bathrooms:</Text>
              <Text style={styles.detailValue}>{property.bathrooms}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Size:</Text>
              <Text style={styles.detailValue}>
                {property.squareFeet ? `${property.squareFeet} sq ft` : 'N/A'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Available:</Text>
              <Text style={styles.detailValue}>
                {property.availableDate ?
                  new Date(property.availableDate).toLocaleDateString('en-KE') :
                  'Now'
                }
              </Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Features */}
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <IconButton icon={property.furnished ? "sofa" : "sofa-outline"} size={20} />
              <Text style={styles.featureText}>
                {property.furnished ? 'Furnished' : 'Unfurnished'}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <IconButton icon={property.petFriendly ? "dog" : "dog-side"} size={20} />
              <Text style={styles.featureText}>
                {property.petFriendly ? 'Pet Friendly' : 'No Pets'}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <IconButton icon={property.parkingAvailable ? "car" : "car-off"} size={20} />
              <Text style={styles.featureText}>
                {property.parkingAvailable ? 'Parking Available' : 'No Parking'}
              </Text>
            </View>
            <View style={styles.featureRow}>
              <IconButton icon={property.utilitiesIncluded ? "flash" : "flash-off"} size={20} />
              <Text style={styles.featureText}>
                {property.utilitiesIncluded ? 'Utilities Included' : 'Utilities Extra'}
              </Text>
            </View>
          </View>

          {!compact && renderAmenities()}

          {!compact && property.description && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.descriptionContainer}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descriptionText}>
                  {property.description}
                </Text>
              </View>
            </>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {onScheduleViewing && (
              <Button
                mode="contained"
                onPress={onScheduleViewing}
                style={styles.actionButton}
                icon="calendar"
              >
                Schedule Viewing
              </Button>
            )}

            {onGenerateQuote && (
              <Button
                mode="outlined"
                onPress={onGenerateQuote}
                style={styles.actionButton}
                icon="cash"
              >
                Generate Quote
              </Button>
            )}

            {onSendDocument && (
              <Button
                mode="outlined"
                onPress={onSendDocument}
                style={styles.actionButton}
                icon="file-document"
              >
                Send Documents
              </Button>
            )}

            {onMakePayment && (
              <Button
                mode="contained"
                onPress={onMakePayment}
                style={[styles.actionButton, styles.paymentButton]}
                icon="credit-card"
              >
                Make Payment
              </Button>
            )}
          </View>

          {/* Kenyan-specific info */}
          {!compact && (
            <View style={styles.kenyanInfo}>
              <Text style={styles.kenyanTitle}>🇰🇪 Kenyan Property Standards</Text>
              <Text style={styles.kenyanText}>
                • Security deposit: 1-2 months rent
              </Text>
              <Text style={styles.kenyanText}>
                • Rent due: 1st of each month
              </Text>
              <Text style={styles.kenyanText}>
                • Notice period: 1 month
              </Text>
              <Text style={styles.kenyanText}>
                • Legal compliance: Kenyan tenancy laws apply
              </Text>
            </View>
          )}
        </ScrollView>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 8,
    elevation: 4,
    maxHeight: width * 1.2,
  },
  compactContainer: {
    margin: 4,
    elevation: 2,
    maxHeight: 200,
  },
  compactContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  propertyImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  compactImage: {
    height: 120,
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  compactHeader: {
    marginBottom: 12,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: defaultTheme.colors.onSurface,
  },
  compactPrice: {
    fontSize: 14,
    color: defaultTheme.colors.primary,
    fontWeight: '600',
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: defaultTheme.colors.onSurfaceVariant,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: defaultTheme.colors.onSurface,
  },
  divider: {
    marginVertical: 16,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: defaultTheme.colors.onSurface,
    marginLeft: 8,
  },
  amenitiesContainer: {
    marginBottom: 16,
  },
  amenitiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  amenityText: {
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: defaultTheme.colors.onSurface,
    marginBottom: 12,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: defaultTheme.colors.onSurfaceVariant,
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
  paymentButton: {
    backgroundColor: defaultTheme.colors.primary,
  },
  kenyanInfo: {
    backgroundColor: defaultTheme.colors.surfaceVariant,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  kenyanTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 8,
  },
  kenyanText: {
    fontSize: 12,
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 4,
    lineHeight: 18,
  },
});
