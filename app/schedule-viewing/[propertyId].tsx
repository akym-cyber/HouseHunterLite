import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, TextInput, Title, TouchableRipple } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/theme/useTheme';
import { useAuth } from '../../src/hooks/useAuth';
import { useUserProfile } from '../../src/hooks/useUserProfile';
import { propertyHelpers, viewingHelpers } from '../../src/services/firebase/firebaseHelpers';
import { Property, Viewing, ViewingType } from '../../src/types/database';
import ViewingCalendar from '../../src/components/viewings/ViewingCalendar';
import {
  DEFAULT_VIEWING_DAYS,
  DEFAULT_VIEWING_TIME_RANGES,
  buildTimeSlotOptions,
  TimeSlotOption,
  normalizeViewingTimeSlots,
} from '../../src/utils/viewingDefaults';

const VIEWING_TYPES: { label: string; value: ViewingType; description: string }[] = [
  { label: 'In-person', value: 'in_person', description: 'Meet at the property with the owner/agent.' },
  { label: 'Virtual', value: 'virtual', description: 'Video tour using a shared link.' },
  { label: 'Self-guided', value: 'self_guided', description: 'Tour on your own with access instructions.' },
];

const parseTimestamp = (value: any) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export default function ScheduleViewingScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { propertyId, viewingId } = useLocalSearchParams<{ propertyId: string; viewingId?: string }>();

  const [step, setStep] = useState(1);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<TimeSlotOption | null>(null);
  const [viewingType, setViewingType] = useState<ViewingType>('in_person');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successViewing, setSuccessViewing] = useState<Viewing | null>(null);

  const availableWeekdays = useMemo(() => {
    if (property?.viewingDays) {
      return property.viewingDays;
    }
    return DEFAULT_VIEWING_DAYS;
  }, [property]);

  const timeSlots = useMemo(() => {
    const source = property?.viewingTimeSlots && property.viewingTimeSlots.length > 0
      ? property.viewingTimeSlots
      : DEFAULT_VIEWING_TIME_RANGES;
    const normalized = normalizeViewingTimeSlots(source);
    const slots = buildTimeSlotOptions(normalized, selectedDate || undefined);
    return slots;
  }, [property, selectedDate]);

  useEffect(() => {
    if (selectedTime && !timeSlots.find((slot) => slot.label === selectedTime.label)) {
      setSelectedTime(null);
    }
  }, [timeSlots, selectedTime]);

  const blockedDates = useMemo(() => {
    if (property?.blockedDates && property.blockedDates.length > 0) {
      return property.blockedDates;
    }
    return [];
  }, [property]);

  useEffect(() => {
    setContactName(profile?.name || '');
    setContactEmail(profile?.email || user?.email || '');
    setContactPhone(user?.phone || '');
  }, [profile, user]);

  useEffect(() => {
    let isMounted = true;
    const loadProperty = async () => {
      if (!propertyId) return;
      const result = await propertyHelpers.getPropertyById(propertyId);
      if (!isMounted) return;
      if (result.data) {
        setProperty(result.data);
      }
      setLoading(false);
    };
    loadProperty();
    return () => {
      isMounted = false;
    };
  }, [propertyId]);

  useEffect(() => {
    let isMounted = true;
    const loadViewing = async () => {
      if (!viewingId) return;
      const result = await viewingHelpers.getViewingById(String(viewingId));
      if (!isMounted) return;
      if (result.data) {
        const scheduled = parseTimestamp(result.data.scheduledAt);
        if (scheduled) {
          setSelectedDate(new Date(scheduled));
        }
        const match = timeSlots.find((slot) => slot.label === result.data.timeSlot);
        if (match) {
          setSelectedTime(match);
        }
        setViewingType(result.data.viewingType);
        setContactName(result.data.contactName || '');
        setContactEmail(result.data.contactEmail || '');
        setContactPhone(result.data.contactPhone || '');
        setNotes(result.data.notes || '');
      }
    };
    loadViewing();
    return () => {
      isMounted = false;
    };
  }, [viewingId, timeSlots]);


  const buildScheduledAt = () => {
    if (!selectedDate || !selectedTime) return null;
    const scheduled = new Date(selectedDate);
    scheduled.setHours(selectedTime.hour, selectedTime.minute, 0, 0);
    return scheduled;
  };

  const handleNext = () => {
    if (step === 1 && !selectedDate) {
      Alert.alert('Select a date', 'Please choose a date for your viewing.');
      return;
    }
    if (step === 1 && selectedDate) {
      const key = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
      if (blockedDates.includes(key)) {
        Alert.alert('Unavailable date', 'That date is blocked. Please choose another day.');
        return;
      }
    }
    if (step === 2 && !selectedTime) {
      Alert.alert('Select a time', 'Please choose a time slot.');
      return;
    }
    if (step === 2 && timeSlots.length === 0) {
      Alert.alert('No time slots', 'No time slots are available for the selected date.');
      return;
    }
    if (step === 3 && !viewingType) {
      Alert.alert('Select a type', 'Please choose a viewing type.');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    if (step === 1) {
      router.back();
      return;
    }
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleConfirm = async () => {
    if (!user || !property) {
      Alert.alert('Error', 'You must be signed in to schedule a viewing.');
      return;
    }

    const scheduledAt = buildScheduledAt();
    if (!scheduledAt || !selectedTime) {
      Alert.alert('Missing info', 'Please select date and time.');
      return;
    }
    if (!contactName.trim() || !contactEmail.trim()) {
      Alert.alert('Missing contact', 'Please provide your name and email.');
      return;
    }

    setSubmitting(true);
    const payload = {
      propertyId: property.id,
      ownerId: property.ownerId,
      tenantId: user.uid,
      scheduledAt,
      timeSlot: selectedTime.label,
      viewingType,
      status: 'pending' as const,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      notes: notes.trim(),
    };

    const result = viewingId
      ? await viewingHelpers.updateViewing(String(viewingId), payload)
      : await viewingHelpers.createViewing(payload);

    if (result.error) {
      Alert.alert('Error', result.error);
      setSubmitting(false);
      return;
    }

    setSuccessViewing({ id: String(viewingId || result.data?.id), ...payload } as Viewing);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading viewing details...</Text>
      </View>
    );
  }

  if (successViewing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Viewing Confirmed</Title>
        </View>
        <SafeAreaView style={styles.content} edges={[]}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>You are all set!</Text>
            <Text style={styles.successSubtitle}>{property?.title || 'Property Viewing'}</Text>
            <Text style={styles.successInfo}>
              {selectedDate?.toLocaleDateString()} · {selectedTime?.label}
            </Text>
            <Text style={styles.successInfo}>Type: {viewingType.replace('_', ' ')}</Text>
            <View style={styles.qrPlaceholder}>
              <Text style={styles.qrText}>QR</Text>
            </View>
            <Text style={styles.helperText}>
              Show this QR code when you arrive. Calendar integration and reminders are coming soon.
            </Text>
            <Button mode="contained" onPress={() => router.back()} style={styles.primaryButton}>
              Done
            </Button>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          mode="text"
          onPress={handleBack}
          textColor={theme.colors.onPrimary}
          style={styles.headerAction}
        >
          {step === 1 ? 'Back' : 'Back'}
        </Button>
        <Title style={styles.headerTitle}>Schedule Viewing</Title>
        <Button
          mode="text"
          onPress={() => router.back()}
          textColor={theme.colors.onPrimary}
          style={styles.headerAction}
        >
          Close
        </Button>
      </View>

      <SafeAreaView style={styles.content} edges={[]}>
        <View style={styles.stepHeader}>
          <Text style={styles.stepText}>Step {step} of 4</Text>
          <Text style={styles.propertyTitle}>{property?.title || 'Property'}</Text>
        </View>

        {step === 1 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Select a date</Text>
              <ViewingCalendar
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
                availableWeekdays={availableWeekdays}
                blockedDates={blockedDates}
              />
            </Card.Content>
          </Card>
        )}

        {step === 2 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Choose a time slot</Text>
              {timeSlots.length === 0 ? (
                <Text style={styles.emptySlotsText}>
                  No time slots available for this date.
                </Text>
              ) : (
                <View style={styles.slotGrid}>
                  {timeSlots.map((slot) => (
                    <TouchableRipple
                      key={slot.label}
                      onPress={() => setSelectedTime(slot)}
                      style={[
                        styles.slotChip,
                        selectedTime?.label === slot.label && styles.slotChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          selectedTime?.label === slot.label && styles.slotTextSelected,
                        ]}
                      >
                        {slot.label}
                      </Text>
                    </TouchableRipple>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {step === 3 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Select viewing type</Text>
              {VIEWING_TYPES.map((type) => (
                <TouchableRipple
                  key={type.value}
                  onPress={() => setViewingType(type.value)}
                  style={[
                    styles.typeOption,
                    viewingType === type.value && styles.typeOptionSelected,
                  ]}
                >
                  <View>
                    <Text style={styles.typeLabel}>{type.label}</Text>
                    <Text style={styles.typeDescription}>{type.description}</Text>
                  </View>
                </TouchableRipple>
              ))}
            </Card.Content>
          </Card>
        )}

        {step === 4 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Confirm details</Text>
              <TextInput
                label="Full Name"
                value={contactName}
                onChangeText={setContactName}
                mode="outlined"
                style={styles.input}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
              <TextInput
                label="Email"
                value={contactEmail}
                onChangeText={setContactEmail}
                mode="outlined"
                style={styles.input}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
              <TextInput
                label="Phone (optional)"
                value={contactPhone}
                onChangeText={setContactPhone}
                mode="outlined"
                style={styles.input}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
              <TextInput
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                mode="outlined"
                style={styles.input}
                multiline
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
              />
            </Card.Content>
          </Card>
        )}

        <View style={styles.footer}>
          {step < 4 ? (
            <Button mode="contained" onPress={handleNext} style={styles.primaryButton}>
              Next
            </Button>
          ) : (
            <Button mode="contained" onPress={handleConfirm} loading={submitting} style={styles.primaryButton}>
              Confirm Viewing
            </Button>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 40,
    paddingBottom: 12,
    backgroundColor: theme.colors.primary,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  headerAction: {
    minWidth: 70,
  },
  content: {
    flex: 1,
  },
  stepHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  stepText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
    color: theme.colors.onSurface,
  },
  card: {
    margin: 20,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceVariant,
  },
  slotChipSelected: {
    backgroundColor: theme.colors.primary,
  },
  slotText: {
    color: theme.colors.onSurface,
    fontWeight: '600',
  },
  slotTextSelected: {
    color: theme.colors.onPrimary,
  },
  emptySlotsText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 13,
  },
  typeOption: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceVariant,
    marginBottom: 10,
  },
  typeOptionSelected: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  typeDescription: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginTop: 4,
  },
  input: {
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.app.background,
  },
  loadingText: {
    color: theme.colors.onSurfaceVariant,
  },
  primaryButton: {
    paddingVertical: 6,
  },
  successCard: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  successSubtitle: {
    color: theme.colors.onSurface,
    fontSize: 16,
    marginBottom: 8,
  },
  successInfo: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: 4,
  },
  qrPlaceholder: {
    marginTop: 16,
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  helperText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginTop: 12,
    marginBottom: 16,
  },
});
