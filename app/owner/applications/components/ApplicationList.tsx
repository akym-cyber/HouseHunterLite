import React, { useMemo } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { Application, Property, User } from '../../../../src/types/database';
import { useTheme } from '../../../../src/theme/useTheme';
import { formatPrice } from '../../../../src/utils/constants';

type ApplicationListProps = {
  applications: Application[];
  propertyMap: Record<string, Property>;
  tenantMap: Record<string, User>;
  onPress: (applicationId: string) => void;
};

const statusConfig = (status: Application['status']) => {
  switch (status) {
    case 'approved':
      return { label: 'Approved', background: '#DFF5E3', text: '#1F7A36' };
    case 'rejected':
      return { label: 'Rejected', background: '#FDE2E2', text: '#B42318' };
    case 'withdrawn':
      return { label: 'Withdrawn', background: '#E2E8F0', text: '#475467' };
    case 'needs_info':
      return { label: 'Needs Info', background: '#E8EDFF', text: '#3456D1' };
    default:
      return { label: 'Pending', background: '#FFF4CC', text: '#9A6700' };
  }
};

const formatDate = (value: any) => {
  if (!value) return 'Unknown date';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

export default function ApplicationList({ applications, propertyMap, tenantMap, onPress }: ApplicationListProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <FlatList
      data={applications}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      renderItem={({ item, index }) => {
        const property = propertyMap[item.propertyId];
        const tenant = tenantMap[item.tenantId];
        const status = statusConfig(item.status);
        const priceLabel = property
          ? formatPrice(property.price, property.county || property.city)
          : null;

        return (
          <TouchableOpacity
            onPress={() => onPress(item.id)}
            style={styles.row}
            activeOpacity={0.8}
          >
            <View style={styles.rowHeader}>
              <Text style={styles.title} numberOfLines={1}>
                {tenant?.name || `${tenant?.firstName || ''} ${tenant?.lastName || ''}`.trim() || 'Applicant'}
              </Text>
              <View style={[styles.statusPill, { backgroundColor: status.background }]}
              >
                <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
              </View>
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {property ? `${property.addressLine1}, ${property.city} · ${priceLabel}/mo` : 'Loading property details...'}
            </Text>
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
            {index < applications.length - 1 && <Divider style={styles.divider} />}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  listContent: {
    paddingBottom: 8,
  },
  row: {
    paddingVertical: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  subtitle: {
    marginTop: 4,
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
  },
  metaText: {
    marginTop: 4,
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    marginTop: 12,
  },
});
