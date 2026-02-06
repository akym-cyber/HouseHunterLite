import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { propertyHelpers } from '../../services/firebase/firebaseHelpers';
import { Property } from '../../types/database';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuth } from '../../hooks/useAuth';

interface PropertyOfferMessageProps {
  propertyId: string;
}

const PropertyOfferMessage: React.FC<PropertyOfferMessageProps> = ({ propertyId }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { toggleFavorite } = useFavorites();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [property, setProperty] = useState<Property | null>(null);

  useEffect(() => {
    let isMounted = true;
    propertyHelpers.getPropertyById(propertyId)
      .then((result) => {
        if (!isMounted) return;
        setProperty(result.data || null);
      })
      .catch(() => {
        if (!isMounted) return;
        setProperty(null);
      });
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  if (!property) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Property offer</Text>
        <Text style={styles.subtitle}>Loading property details...</Text>
      </View>
    );
  }

  const imageUrl = property.primaryImageUrl || property.media?.[0]?.url;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🏠</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {property.addressLine1} · {property.city}
          </Text>
          <Text style={styles.price}>{property.price} / mo</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => router.push(`/property/${property.id}`)}
          style={styles.actionPrimary}
          compact
        >
          Apply
        </Button>
        <Button
          mode="outlined"
          onPress={() => router.push({ pathname: '/schedule-viewing/[propertyId]', params: { propertyId: property.id } })}
          style={styles.actionSecondary}
          compact
        >
          Schedule
        </Button>
        <Button
          mode="text"
          onPress={() => {
            if (user?.uid) {
              toggleFavorite(property.id);
            }
          }}
          compact
        >
          Save
        </Button>
      </View>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.outline,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  imagePlaceholderText: {
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  price: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  actionPrimary: {
    flex: 1,
  },
  actionSecondary: {
    flex: 1,
  },
});

export default PropertyOfferMessage;
