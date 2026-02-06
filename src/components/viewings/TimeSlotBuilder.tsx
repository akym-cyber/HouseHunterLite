import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Menu, Text } from 'react-native-paper';
import { useTheme } from '../../theme/useTheme';
import { ViewingTimeSlotRange, WeekdayKey } from '../../types/database';
import {
  WEEKDAY_KEYS,
  WEEKDAY_KEY_BY_INDEX,
  WEEKDAY_LABEL_BY_KEY,
  formatRangeLabel,
  formatTimeLabel,
  minutesToTimeString,
  timeStringToMinutes,
} from '../../utils/viewingDefaults';

type TimeSlotBuilderProps = {
  slots: ViewingTimeSlotRange[];
  onChange: (slots: ViewingTimeSlotRange[]) => void;
  availableDays: number[];
};

type TimeOption = { value: string; label: string };

const buildTimeOptions = (startHour = 6, endHour = 20, interval = 30): TimeOption[] => {
  const options: TimeOption[] = [];
  const start = startHour * 60;
  const end = endHour * 60;
  for (let minutes = start; minutes <= end; minutes += interval) {
    const value = minutesToTimeString(minutes);
    options.push({ value, label: formatTimeLabel(value) });
  }
  return options;
};

const formatDaysLabel = (days: WeekdayKey[]) => {
  const normalized = days.length === 0 ? WEEKDAY_KEYS : days;
  const ordered = WEEKDAY_KEYS.filter((key) => normalized.includes(key));
  return ordered.map((key) => WEEKDAY_LABEL_BY_KEY[key]).join(', ');
};

const uniq = (values: WeekdayKey[]) => Array.from(new Set(values));

export default function TimeSlotBuilder({ slots, onChange, availableDays }: TimeSlotBuilderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const timeOptions = useMemo(() => buildTimeOptions(), []);

  const allowedDayKeys = useMemo(() => {
    const keys = availableDays
      .map((day) => WEEKDAY_KEY_BY_INDEX[day])
      .filter((key): key is WeekdayKey => !!key);
    return keys.length > 0 ? keys : WEEKDAY_KEYS;
  }, [availableDays]);

  const [startTime, setStartTime] = useState(timeOptions[0]?.value || '09:00');
  const [endTime, setEndTime] = useState(timeOptions[4]?.value || '12:00');
  const [selectedDays, setSelectedDays] = useState<WeekdayKey[]>(allowedDayKeys);
  const [startMenuVisible, setStartMenuVisible] = useState(false);
  const [endMenuVisible, setEndMenuVisible] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const menuMaxHeight = 260;

  useEffect(() => {
    setSelectedDays((prev) => {
      const filtered = prev.filter((day) => allowedDayKeys.includes(day));
      if (filtered.length > 0) return filtered;
      return allowedDayKeys;
    });
  }, [allowedDayKeys]);

  const toggleDay = (day: WeekdayKey) => {
    if (!allowedDayKeys.includes(day)) return;
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        return prev.filter((item) => item !== day);
      }
      return [...prev, day];
    });
  };

  const handleAddSlot = () => {
    const startMinutes = timeStringToMinutes(startTime);
    const endMinutes = timeStringToMinutes(endTime);
    if (startMinutes === null || endMinutes === null) {
      Alert.alert('Invalid time', 'Please choose valid start and end times.');
      return;
    }
    if (startMinutes >= endMinutes) {
      Alert.alert('Invalid time range', 'End time must be after start time.');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('Select days', 'Please choose at least one day for this time slot.');
      return;
    }
    const days = uniq(selectedDays);
    const newSlot: ViewingTimeSlotRange = { start: startTime, end: endTime, days };
    const duplicate = slots.some(
      (slot) =>
        slot.start === newSlot.start &&
        slot.end === newSlot.end &&
        (slot.days ?? []).join(',') === (newSlot.days ?? []).join(',')
    );
    if (duplicate) {
      Alert.alert('Duplicate slot', 'This time slot already exists.');
      return;
    }
    onChange([...slots, newSlot]);
    setShowForm(false);
  };

  const handleRemoveSlot = (index: number) => {
    onChange(slots.filter((_, idx) => idx !== index));
  };

  return (
    <View>
      <Text
        style={styles.helperText}
        onPress={() => setShowForm(true)}
      >
        Add your available viewing hours
      </Text>

      <Button
        mode="contained"
        onPress={() => setShowForm(true)}
        style={styles.primaryAddButton}
        icon="plus"
      >
        Add Time Slot
      </Button>

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>New Time Slot</Text>
          <View style={styles.timeRow}>
            <Menu
              visible={startMenuVisible}
              onDismiss={() => setStartMenuVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setStartMenuVisible(true)} style={styles.timeButton}>
                  Start: {formatTimeLabel(startTime)}
                </Button>
              }
              contentStyle={{ maxHeight: menuMaxHeight }}
            >
              <ScrollView>
                {timeOptions.map((option) => (
                  <Menu.Item
                    key={`start-${option.value}`}
                    onPress={() => {
                      setStartTime(option.value);
                      setStartMenuVisible(false);
                    }}
                    title={option.label}
                  />
                ))}
              </ScrollView>
            </Menu>

            <Menu
              visible={endMenuVisible}
              onDismiss={() => setEndMenuVisible(false)}
              anchor={
                <Button mode="outlined" onPress={() => setEndMenuVisible(true)} style={styles.timeButton}>
                  End: {formatTimeLabel(endTime)}
                </Button>
              }
              contentStyle={{ maxHeight: menuMaxHeight }}
            >
              <ScrollView>
                {timeOptions.map((option) => (
                  <Menu.Item
                    key={`end-${option.value}`}
                    onPress={() => {
                      setEndTime(option.value);
                      setEndMenuVisible(false);
                    }}
                    title={option.label}
                  />
                ))}
              </ScrollView>
            </Menu>
          </View>

          <Text style={styles.formLabel}>Select days</Text>
          <View style={styles.dayChips}>
            {WEEKDAY_KEYS.map((day) => (
              <Chip
                key={day}
                selected={selectedDays.includes(day)}
                onPress={() => toggleDay(day)}
                style={styles.dayChip}
                disabled={!allowedDayKeys.includes(day)}
              >
                {WEEKDAY_LABEL_BY_KEY[day]}
              </Chip>
            ))}
          </View>

          <View style={styles.formActions}>
            <Button mode="text" onPress={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button mode="contained-tonal" onPress={handleAddSlot}>
              Save Slot
            </Button>
          </View>
        </View>
      )}

      <View style={styles.slotChips}>
        {slots.map((slot, index) => (
          <Chip
            key={`${slot.start}-${slot.end}-${index}`}
            onClose={() => handleRemoveSlot(index)}
            style={styles.slotChip}
          >
            {formatRangeLabel(slot)} · {formatDaysLabel(slot.days ?? WEEKDAY_KEYS)}
          </Chip>
        ))}
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  helperText: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: 8,
    fontSize: 12,
  },
  primaryAddButton: {
    alignSelf: 'flex-start',
  },
  formCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceVariant,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.onSurface,
    marginBottom: 8,
  },
  formLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurfaceVariant,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeButton: {
    flex: 1,
  },
  formActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dayChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  dayChip: {
    marginBottom: 4,
  },
  slotChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  slotChip: {
    marginBottom: 4,
  },
});
