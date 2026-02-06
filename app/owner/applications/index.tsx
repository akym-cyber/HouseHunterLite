import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Text, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useTheme } from '../../../src/theme/useTheme';
import { useOwnerApplications } from '../../../src/hooks/useOwnerApplications';
import { useAuth } from '../../../src/hooks/useAuth';
import { useUserProfile } from '../../../src/hooks/useUserProfile';
import { propertyHelpers, userHelpers } from '../../../src/services/firebase/firebaseHelpers';
import { ApplicationStatus, Property, User } from '../../../src/types/database';
import ApplicationStats from './components/ApplicationStats';
import ApplicationList from './components/ApplicationList';

const formatDate = (value: any) => {
  if (!value) return 'Unknown date';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

const statusLabel = (status: ApplicationStatus) => {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'withdrawn':
      return 'Withdrawn';
    case 'needs_info':
      return 'Needs Info';
    default:
      return 'Pending';
  }
};

export default function OwnerApplicationsDashboard() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user);
  const { applications, loading, stats } = useOwnerApplications();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [propertyMap, setPropertyMap] = useState<Record<string, Property>>({});
  const [tenantMap, setTenantMap] = useState<Record<string, User>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7' | '30'>('all');

  useEffect(() => {
    if (applications.length === 0) return;
    const missingIds = Array.from(new Set(applications.map(app => app.propertyId)))
      .filter((propertyId) => !!propertyId && !propertyMap[propertyId]);

    if (missingIds.length === 0) return;

    let isMounted = true;
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
      });

    return () => {
      isMounted = false;
    };
  }, [applications, propertyMap]);

  useEffect(() => {
    if (applications.length === 0) return;
    const missingIds = Array.from(new Set(applications.map(app => app.tenantId)))
      .filter((tenantId) => !!tenantId && !tenantMap[tenantId]);

    if (missingIds.length === 0) return;

    let isMounted = true;
    Promise.all(missingIds.map((id) => userHelpers.getUserById(id)))
      .then((results) => {
        if (!isMounted) return;
        setTenantMap((prev) => {
          const next = { ...prev };
          results.forEach((result) => {
            if (result.data) {
              next[result.data.id] = result.data;
            }
          });
          return next;
        });
      });

    return () => {
      isMounted = false;
    };
  }, [applications, tenantMap]);

  const uniqueProperties = useMemo(() => {
    const entries = Array.from(new Set(applications.map(app => app.propertyId)))
      .map((propertyId) => propertyMap[propertyId])
      .filter((property): property is Property => !!property);
    return entries;
  }, [applications, propertyMap]);

  const filteredApplications = useMemo(() => {
    const now = new Date();
    return applications.filter((app) => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      if (propertyFilter !== 'all' && app.propertyId !== propertyFilter) return false;
      if (dateFilter !== 'all') {
        const days = dateFilter === '7' ? 7 : 30;
        const createdAt = app.createdAt?.toDate ? app.createdAt.toDate() : new Date(app.createdAt);
        if (isNaN(createdAt.getTime())) return false;
        const diff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (diff > days) return false;
      }
      return true;
    });
  }, [applications, statusFilter, propertyFilter, dateFilter]);

  const recentActivity = useMemo(() => filteredApplications.slice(0, 4), [filteredApplications]);

  if (!profileLoading && profile?.role !== 'owner') {
    return (
      <View style={styles.container}>
        <View style={styles.loadingRow}>
          <Text style={styles.emptyText}>Owner access only.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Applications Dashboard</Text>

      <ApplicationStats
        total={stats.total}
        pending={stats.pending}
        approved={stats.approved}
        rejected={stats.rejected}
      />

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Quick Filters</Text>
          <View style={styles.filterRow}>
            {['all', 'pending', 'approved', 'rejected', 'needs_info', 'withdrawn'].map((status) => {
              const value = status as 'all' | ApplicationStatus;
              const isActive = statusFilter === value;
              return (
                <Button
                  key={status}
                  mode={isActive ? 'contained' : 'outlined'}
                  onPress={() => setStatusFilter(value)}
                  compact
                  style={styles.filterButton}
                >
                  {status === 'all' ? 'All' : statusLabel(value as ApplicationStatus)}
                </Button>
              );
            })}
          </View>
          <View style={styles.filterRow}>
            <Button
              mode={propertyFilter === 'all' ? 'contained' : 'outlined'}
              onPress={() => setPropertyFilter('all')}
              compact
              style={styles.filterButton}
            >
              All Properties
            </Button>
            {uniqueProperties.map((property) => (
              <Button
                key={property.id}
                mode={propertyFilter === property.id ? 'contained' : 'outlined'}
                onPress={() => setPropertyFilter(property.id)}
                compact
                style={styles.filterButton}
              >
                {property.title.length > 18 ? `${property.title.slice(0, 18)}...` : property.title}
              </Button>
            ))}
          </View>
          <View style={styles.filterRow}>
            {['all', '7', '30'].map((option) => {
              const label = option === 'all' ? 'All Dates' : `Last ${option} days`;
              const isActive = dateFilter === option;
              return (
                <Button
                  key={option}
                  mode={isActive ? 'contained' : 'outlined'}
                  onPress={() => setDateFilter(option as 'all' | '7' | '30')}
                  compact
                  style={styles.filterButton}
                >
                  {label}
                </Button>
              );
            })}
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading activity...</Text>
            </View>
          ) : recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity.</Text>
          ) : (
            recentActivity.map((app, index) => {
              const property = propertyMap[app.propertyId];
              const tenant = tenantMap[app.tenantId];
              return (
                <View key={app.id} style={styles.activityRow}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {tenant?.name || 'Applicant'} applied for {property?.title || 'a property'}
                  </Text>
                  <Text style={styles.activityMeta}>
                    {statusLabel(app.status)} · {formatDate(app.createdAt)}
                  </Text>
                  {index < recentActivity.length - 1 && <Divider style={styles.divider} />}
                </View>
              );
            })
          )}
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Applications</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading applications...</Text>
            </View>
          ) : filteredApplications.length === 0 ? (
            <Text style={styles.emptyText}>No applications yet. Share your listing link!</Text>
          ) : (
            <ApplicationList
              applications={filteredApplications}
              propertyMap={propertyMap}
              tenantMap={tenantMap}
              onPress={(applicationId) => router.push(`/owner/applications/${applicationId}`)}
            />
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  sectionCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    borderRadius: 999,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: theme.colors.onSurfaceVariant,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
  },
  activityRow: {
    paddingVertical: 8,
  },
  activityTitle: {
    color: theme.colors.onSurface,
    fontSize: 14,
    fontWeight: '600',
  },
  activityMeta: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    marginTop: 10,
  },
});
