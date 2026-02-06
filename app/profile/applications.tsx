import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Text, ActivityIndicator, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { useApplications } from '../../src/hooks/useApplications';
import { useMessages } from '../../src/hooks/useMessages';
import { applicationHelpers, propertyHelpers, userHelpers } from '../../src/services/firebase/firebaseHelpers';
import { ApplicationStatus, Property, User } from '../../src/types/database';
import { formatPrice } from '../../src/utils/constants';

const formatDate = (value: any) => {
  if (!value) return 'Unknown date';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

export default function ApplicationsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const role = (profile?.role || 'tenant') as 'owner' | 'tenant';
  const { applications, loading } = useApplications(role);
  const { findConversationByOwner, createConversation } = useMessages();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [propertyMap, setPropertyMap] = useState<Record<string, Property>>({});
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [ownerMap, setOwnerMap] = useState<Record<string, User>>({});
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [filtersElevated, setFiltersElevated] = useState(false);

  const filters: Array<{ key: 'all' | ApplicationStatus; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'needs_info', label: 'Needs Info' },
    { key: 'withdrawn', label: 'Withdrawn' },
  ];

  useEffect(() => {
    if (applications.length === 0) return;

    const missingIds = Array.from(new Set(applications.map(app => app.propertyId)))
      .filter((propertyId) => !!propertyId && !propertyMap[propertyId]);

    if (missingIds.length === 0) return;

    let isMounted = true;
    setLoadingProperties(true);
    Promise.all(missingIds.map((id) => propertyHelpers.getPropertyById(id)))
      .then((results) => {
        if (!isMounted) return;
        setPropertyMap((prev) => {
          const next = { ...prev };
          results.forEach((result) => {
            if (result.data) {
              next[result.data.id] = result.data;
            }
          });
          return next;
        });
      })
      .finally(() => {
        if (isMounted) {
          setLoadingProperties(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [applications, propertyMap]);

  useEffect(() => {
    if (applications.length === 0) return;

    const approvedOwners = Array.from(
      new Set(applications.filter(app => app.status === 'approved').map(app => app.ownerId))
    ).filter((ownerId) => !!ownerId && !ownerMap[ownerId]);

    if (approvedOwners.length === 0) return;

    let isMounted = true;
    setLoadingOwners(true);
    Promise.all(approvedOwners.map(async (id) => ({ id, result: await userHelpers.getUserById(id) })))
      .then((results) => {
        if (!isMounted) return;
        setOwnerMap((prev) => {
          const next = { ...prev };
          results.forEach(({ id, result }) => {
            if (result.data) {
              next[id] = result.data;
            }
          });
          return next;
        });
      })
      .finally(() => {
        if (isMounted) {
          setLoadingOwners(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [applications, ownerMap]);

  const statusConfig = (status: ApplicationStatus) => {
    switch (status) {
      case 'approved':
        return { label: 'Approved', background: '#DFF5E3', text: '#1F7A36' };
      case 'rejected':
        return { label: 'Rejected', background: '#FDE2E2', text: '#B42318' };
      case 'needs_info':
        return { label: 'Needs Info', background: '#E8EDFF', text: '#3456D1' };
      case 'withdrawn':
        return { label: 'Withdrawn', background: '#E2E8F0', text: '#475467' };
      default:
        return { label: 'Pending', background: '#FFF4CC', text: '#9A6700' };
    }
  };

  const handleWithdraw = (applicationId: string) => {
    Alert.alert(
      'Withdraw application',
      'Are you sure you want to withdraw this application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            const result = await applicationHelpers.updateApplication(applicationId, { status: 'withdrawn' });
            if (result.error) {
              Alert.alert('Error', result.error || 'Failed to withdraw application');
            }
          },
        },
      ]
    );
  };

  const filteredApplications = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter(app => app.status === statusFilter);
  }, [applications, statusFilter]);

  const handleOpenProperty = (propertyId: string) => {
    if (!propertyId) return;
    router.push(`/property/${propertyId}`);
  };

  const handleMessageOwner = async (propertyId: string, ownerId: string) => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to message the owner');
      return;
    }

    try {
      const existing = await findConversationByOwner(ownerId, ownerId);
      if (existing.success && existing.data) {
        router.push(`/chat/${existing.data.id}`);
        return;
      }

      const created = await createConversation(propertyId, ownerId);
      if (created.success && created.data) {
        router.push(`/chat/${created.data.id}`);
        return;
      }

      Alert.alert('Error', created.error || existing.error || 'Failed to start conversation');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to start conversation');
    }
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset?.y ?? 0;
    if (offsetY > 4 && !filtersElevated) {
      setFiltersElevated(true);
    } else if (offsetY <= 4 && filtersElevated) {
      setFiltersElevated(false);
    }
  };

  const renderApplication = ({ item, index }: { item: typeof applications[number]; index: number }) => {
    const property = propertyMap[item.propertyId];
    const status = statusConfig(item.status);
    const priceLabel = property
      ? formatPrice(property.price, property.county || property.city)
      : null;
    const addressLabel = property
      ? `${property.addressLine1}, ${property.city}`
      : 'Loading property details...';
    const owner = ownerMap[item.ownerId];
    const ownerName = owner?.name || `${owner?.firstName || ''} ${owner?.lastName || ''}`.trim() || 'Owner';
    const ownerContact = owner?.phone || owner?.email;
    const canShareContact = owner?.shareContactInfo !== false;
    const showOwnerInfo = item.status === 'approved';
    const ownerLine = owner
      ? (canShareContact
        ? (ownerContact ? `${ownerName} • ${ownerContact}` : ownerName)
        : 'Contact via platform messaging')
      : 'Loading owner info...';
    const showMessageButton = showOwnerInfo && !!owner && canShareContact && role === 'tenant';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleOpenProperty(item.propertyId)}
        style={styles.applicationRow}
      >
        <View style={styles.rowHeader}>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {property?.title || item.propertyId}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.background }]}
          >
            <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
          </View>
        </View>
        <Text style={styles.propertySubtitle} numberOfLines={2}>
          {property ? `${addressLabel} • ${priceLabel}/mo` : addressLabel}
        </Text>
        {showOwnerInfo && (
          <Text style={styles.ownerInfo} numberOfLines={1}>
            {ownerLine}
          </Text>
        )}
        <View style={styles.rowMeta}>
          <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
          <View style={styles.rowActions}>
            {showMessageButton && (
              <Button
                mode="outlined"
                onPress={() => handleMessageOwner(item.propertyId, item.ownerId)}
                compact
                style={styles.messageButton}
              >
                Message Owner
              </Button>
            )}
            {role === 'tenant' && item.status !== 'withdrawn' && (
              <Button
                mode="text"
                onPress={() => handleWithdraw(item.id)}
                compact
                textColor={theme.colors.error}
                style={styles.withdrawButton}
              >
                Withdraw
              </Button>
            )}
          </View>
        </View>
        {index < filteredApplications.length - 1 && <Divider style={styles.divider} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.filtersContainer, filtersElevated && styles.filtersContainerElevated]}>
        <View style={styles.filtersRow}>
          {filters.map((filter) => {
            const isActive = statusFilter === filter.key;
            return (
              <Button
                key={filter.key}
                mode={isActive ? 'contained' : 'outlined'}
                onPress={() => setStatusFilter(filter.key)}
                compact
                style={styles.filterButton}
              >
                {filter.label}
              </Button>
            );
          })}
        </View>
      </View>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>
            {role === 'owner' ? 'Applications Received' : 'My Applications'}
          </Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading applications...</Text>
            </View>
          ) : filteredApplications.length === 0 ? (
            <Text style={styles.emptyText}>
              {statusFilter === 'all' ? 'No applications yet.' : `No ${statusFilter} applications.`}
            </Text>
          ) : (
            <FlatList
              data={filteredApplications}
              keyExtractor={(item) => item.id}
              renderItem={renderApplication}
              scrollEnabled={filteredApplications.length > 6}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
            />
          )}
          {!loading && (loadingProperties || loadingOwners) && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading details...</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
    padding: 16,
    paddingTop: 8,
  },
  filtersContainer: {
    backgroundColor: theme.app.background,
    paddingVertical: 6,
    marginBottom: 8,
    zIndex: 2,
  },
  filtersContainerElevated: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outline,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    borderRadius: 999,
  },
  card: {
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: theme.colors.onSurfaceVariant,
  },
  applicationRow: {
    paddingVertical: 12,
  },
  listContent: {
    paddingBottom: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  propertyTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  propertySubtitle: {
    marginTop: 4,
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
  },
  ownerInfo: {
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
  rowMeta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  messageButton: {
    borderRadius: 999,
  },
  withdrawButton: {
    marginRight: -8,
  },
  divider: {
    marginTop: 12,
  },
});
