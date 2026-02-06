import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, List, Divider } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { useApplications } from '../../src/hooks/useApplications';

export default function TenantDirectoryScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const role = (profile?.role || 'tenant') as 'owner' | 'tenant';
  const { applications, loading } = useApplications('owner');
  const styles = useMemo(() => createStyles(theme), [theme]);

  const tenants = useMemo(() => {
    const unique = new Map<string, string>();
    applications.forEach((app) => {
      if (!unique.has(app.tenantId)) {
        unique.set(app.tenantId, app.tenantId);
      }
    });
    return Array.from(unique.values());
  }, [applications]);

  if (role !== 'owner') {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.title}>Tenant Directory</Text>
            <Text style={styles.emptyText}>This section is available for property owners only.</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Tenant Directory</Text>
          {loading ? (
            <Text style={styles.emptyText}>Loading tenants...</Text>
          ) : tenants.length === 0 ? (
            <Text style={styles.emptyText}>No tenants yet.</Text>
          ) : (
            tenants.map((tenantId, index) => (
              <View key={tenantId}>
                <List.Item
                  title={tenantId}
                  description="Tenant"
                  left={(props) => <List.Icon {...props} icon="account" />}
                />
                {index < tenants.length - 1 && <Divider />}
              </View>
            ))
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
  },
  card: {
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
  },
});
