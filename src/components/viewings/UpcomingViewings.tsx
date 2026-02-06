import React, { useEffect, useMemo, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Button, Card, Divider, List, Text } from 'react-native-paper';
import { useTheme } from '../../theme/useTheme';
import { Viewing } from '../../types/database';
import { propertyHelpers } from '../../services/firebase/firebaseHelpers';

type UpcomingViewingsProps = {
  viewings: Viewing[];
  role: 'owner' | 'tenant';
  onScheduleNew: () => void;
  onReschedule: (viewing: Viewing) => void;
  onCancel: (viewing: Viewing) => void;
  onApprove: (viewing: Viewing) => void;
  onDecline: (viewing: Viewing) => void;
  cardStyle?: StyleProp<ViewStyle>;
};

const toDate = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value: any) => {
  const date = toDate(value);
  if (!date) return 'Unknown';
  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export default function UpcomingViewings({
  viewings,
  role,
  onScheduleNew,
  onReschedule,
  onCancel,
  onApprove,
  onDecline,
  cardStyle,
}: UpcomingViewingsProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [propertyTitles, setPropertyTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    const missing = viewings
      .map((v) => v.propertyId)
      .filter((id) => id && !propertyTitles[id]);
    if (missing.length === 0) return;

    let isMounted = true;
    const loadTitles = async () => {
      for (const propertyId of missing) {
        const result = await propertyHelpers.getPropertyById(propertyId);
        if (!isMounted) return;
        if (result.data?.title) {
          setPropertyTitles((prev) => ({ ...prev, [propertyId]: result.data!.title }));
        }
      }
    };
    loadTitles();

    return () => {
      isMounted = false;
    };
  }, [viewings, propertyTitles]);

  if (viewings.length === 0) {
    return (
      <Card style={[styles.card, cardStyle]}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Upcoming Viewings</Text>
          <Text style={styles.emptyText}>No upcoming viewings scheduled.</Text>
          <Button mode="outlined" onPress={onScheduleNew} style={styles.actionButton}>
            Schedule New
          </Button>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, cardStyle]}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Upcoming Viewings</Text>
          <Button mode="text" onPress={onScheduleNew}>
            Schedule New
          </Button>
        </View>
        <View style={styles.listWrapper}>
          {viewings.map((viewing, index) => (
            <View key={viewing.id}>
              <List.Item
                title={propertyTitles[viewing.propertyId] || 'Property Viewing'}
                description={`${formatDateTime(viewing.scheduledAt)} · ${viewing.timeSlot}`}
                left={(props) => <List.Icon {...props} icon="calendar" />}
                right={() => (
                  <Text style={styles.statusText}>{viewing.status.toUpperCase()}</Text>
                )}
              />
              <View style={styles.actionsRow}>
                {role === 'owner' ? (
                  viewing.status === 'pending' && (
                    <>
                      <Button mode="contained" onPress={() => onApprove(viewing)} style={styles.smallButton}>
                        Approve
                      </Button>
                      <Button mode="outlined" onPress={() => onDecline(viewing)} style={styles.smallButton}>
                        Decline
                      </Button>
                    </>
                  )
                ) : (
                  <>
                    <Button mode="outlined" onPress={() => onReschedule(viewing)} style={styles.smallButton}>
                      Reschedule
                    </Button>
                    <Button mode="contained" onPress={() => onCancel(viewing)} style={styles.smallButton}>
                      Cancel
                    </Button>
                  </>
                )}
              </View>
              {index < viewings.length - 1 && <Divider style={styles.divider} />}
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 8,
    color: theme.colors.onSurfaceVariant,
  },
  actionButton: {
    marginTop: 12,
  },
  listWrapper: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 8,
  },
  statusText: {
    alignSelf: 'center',
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  smallButton: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
