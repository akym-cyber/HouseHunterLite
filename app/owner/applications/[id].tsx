import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, Divider, Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/theme/useTheme';
import { useAuth } from '../../../src/hooks/useAuth';
import { useUserProfile } from '../../../src/hooks/useUserProfile';
import { applicationHelpers, propertyHelpers, userHelpers } from '../../../src/services/firebase/firebaseHelpers';
import { Application, Property, User } from '../../../src/types/database';
import { formatPrice } from '../../../src/utils/constants';
import { useApplicationActions } from '../../../src/hooks/useApplicationActions';
import DecisionModal from './components/DecisionModal';

const formatDate = (value: any) => {
  if (!value) return 'Unknown date';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

const statusLabel = (status: Application['status']) => {
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

export default function OwnerApplicationDetail() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [application, setApplication] = useState<Application | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const { approveApplication, rejectApplication, requestMoreInfo } = useApplicationActions();

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      const appResult = await applicationHelpers.getApplicationById(id);
      if (!appResult.data) {
        if (isMounted) {
          setLoading(false);
          setApplication(null);
        }
        return;
      }

      const appData = appResult.data;
      const [propertyResult, tenantResult] = await Promise.all([
        propertyHelpers.getPropertyById(appData.propertyId),
        userHelpers.getUserById(appData.tenantId),
      ]);

      if (isMounted) {
        setApplication(appData);
        setProperty(propertyResult.data || null);
        setTenant(tenantResult.data || null);
        setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleApprove = async () => {
    if (!application) return;
    Alert.alert(
      'Approve application',
      'Approve this applicant for the property?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            const result = await approveApplication(application);
            if (result.error) {
              Alert.alert('Error', result.error || 'Failed to approve application');
            } else {
              setApplication({ ...application, status: 'approved', decisionDate: new Date().toISOString() } as Application);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (note: string) => {
    if (!application) return;
    const result = await rejectApplication(application, note);
    if (result.error) {
      Alert.alert('Error', result.error || 'Failed to reject application');
      return;
    }
    setApplication({ ...application, status: 'rejected', decisionNotes: note, decisionDate: new Date().toISOString() } as Application);
    setRejectOpen(false);
  };

  const handleRequestInfo = async (note: string) => {
    if (!application) return;
    const result = await requestMoreInfo(application, note);
    if (result.error) {
      Alert.alert('Error', result.error || 'Failed to request info');
      return;
    }
    setApplication({ ...application, status: 'needs_info', decisionNotes: note, decisionDate: new Date().toISOString() } as Application);
    setRequestOpen(false);
  };

  if (!profileLoading && profile?.role !== 'owner') {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Owner access only.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading application...</Text>
      </View>
    );
  }

  if (!application) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Application not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Applicant</Text>
          <View style={styles.applicantRow}>
            {tenant?.photoURL || tenant?.avatarUrl ? (
              <Avatar.Image size={56} source={{ uri: tenant.photoURL || tenant.avatarUrl }} />
            ) : (
              <Avatar.Text size={56} label={(tenant?.name || tenant?.firstName || 'U').charAt(0)} />
            )}
            <View style={styles.applicantInfo}>
              <Text style={styles.applicantName}>
                {tenant?.name || `${tenant?.firstName || ''} ${tenant?.lastName || ''}`.trim() || 'Applicant'}
              </Text>
              <Text style={styles.applicantMeta}>{tenant?.email || 'No email provided'}</Text>
              {tenant?.phone && <Text style={styles.applicantMeta}>{tenant.phone}</Text>}
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Property</Text>
          <Text style={styles.propertyTitle}>{property?.title || 'Property details'}</Text>
          <Text style={styles.propertyMeta}>
            {property ? `${property.addressLine1}, ${property.city}` : 'Address unavailable'}
          </Text>
          {property && (
            <Text style={styles.propertyMeta}>
              {formatPrice(property.price, property.county || property.city)} / mo
            </Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Application Details</Text>
          <Text style={styles.metaText}>Submitted: {formatDate(application.createdAt)}</Text>
          <Text style={styles.metaText}>Status: {statusLabel(application.status)}</Text>
          {application.message && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{application.message}</Text>
            </View>
          )}
          {application.decisionNotes && (
            <View style={styles.messageBox}>
              <Text style={styles.messageLabel}>Decision Notes</Text>
              <Text style={styles.messageText}>{application.decisionNotes}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Applicant Profile</Text>
          <Text style={styles.metaText}>Rental history: Not provided</Text>
          <Text style={styles.metaText}>Income: Not provided</Text>
          <Text style={styles.metaText}>References: Not provided</Text>
        </Card.Content>
      </Card>

      <Card style={styles.sectionCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionRow}>
            <Button mode="contained" onPress={handleApprove} style={styles.approveButton}>
              Approve
            </Button>
            <Button mode="outlined" onPress={() => setRequestOpen(true)} style={styles.actionButton}>
              Request Info
            </Button>
          </View>
          <Button mode="outlined" onPress={() => setRejectOpen(true)} style={styles.rejectButton} textColor={theme.colors.error}>
            Reject
          </Button>
        </Card.Content>
      </Card>

      <DecisionModal
        visible={rejectOpen}
        title="Reject application"
        description="Add an optional reason to share with the applicant."
        confirmLabel="Reject"
        onDismiss={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />

      <DecisionModal
        visible={requestOpen}
        title="Request more info"
        description="Send a message requesting additional details from the applicant."
        confirmLabel="Send"
        onDismiss={() => setRequestOpen(false)}
        onConfirm={handleRequestInfo}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.app.background,
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.onSurfaceVariant,
  },
  sectionCard: {
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  applicantMeta: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  propertyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  propertyMeta: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  metaText: {
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  messageBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceVariant,
  },
  messageText: {
    color: theme.colors.onSurface,
  },
  messageLabel: {
    fontWeight: '700',
    marginBottom: 4,
    color: theme.colors.onSurfaceVariant,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#1F7A36',
  },
  actionButton: {
    flex: 1,
  },
  rejectButton: {
    marginTop: 8,
    borderColor: theme.colors.error,
  },
});
