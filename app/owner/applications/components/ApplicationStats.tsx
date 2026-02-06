import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { useTheme } from '../../../../src/theme/useTheme';

type ApplicationStatsProps = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export default function ApplicationStats({ total, pending, approved, rejected }: ApplicationStatsProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const items = [
    { label: 'Total', value: total, color: theme.colors.primary },
    { label: 'Pending', value: pending, color: '#9A6700' },
    { label: 'Approved', value: approved, color: '#1F7A36' },
    { label: 'Rejected', value: rejected, color: '#B42318' },
  ];

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <Card key={item.label} style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text style={[styles.value, { color: item.color }]}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    flexGrow: 1,
    minWidth: '45%',
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  cardContent: {
    alignItems: 'flex-start',
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
    fontSize: 12,
  },
});
