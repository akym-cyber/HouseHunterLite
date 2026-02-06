import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, List, ActivityIndicator, Divider } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { usePayments } from '../../src/hooks/usePayments';

const formatDate = (value: any) => {
  if (!value) return 'Unknown date';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

export default function PaymentsScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const role = (profile?.role || 'tenant') as 'owner' | 'tenant';
  const { payments, loading, paidTotal } = usePayments(role);
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Payments</Text>
          <Text style={styles.subtitle}>
            Total paid: KES {paidTotal.toLocaleString()}
          </Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading payments...</Text>
            </View>
          ) : payments.length === 0 ? (
            <Text style={styles.emptyText}>No payments recorded yet.</Text>
          ) : (
            payments.map((payment, index) => (
              <View key={payment.id}>
                <List.Item
                  title={`KES ${payment.amount?.toLocaleString() || 0}`}
                  description={`Status: ${payment.status} · ${formatDate(payment.paidAt || payment.createdAt)}`}
                  left={(props) => <List.Icon {...props} icon="credit-card" />}
                />
                {index < payments.length - 1 && <Divider />}
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
    marginBottom: 4,
    color: theme.colors.onSurface,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: theme.colors.onSurfaceVariant,
  },
});
