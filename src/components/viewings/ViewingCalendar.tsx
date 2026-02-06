import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { useTheme } from '../../theme/useTheme';

type ViewingCalendarProps = {
  selectedDate: Date | null;
  onSelect: (date: Date) => void;
  daysToShow?: number;
  availableWeekdays?: number[];
  blockedDates?: string[];
};

const getNextDays = (count: number) => {
  const today = new Date();
  const days: Date[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
};

export default function ViewingCalendar({
  selectedDate,
  onSelect,
  availableWeekdays,
  blockedDates,
  daysToShow = 14,
}: ViewingCalendarProps) {
  const resolvedDaysToShow = Number.isFinite(daysToShow) ? daysToShow : 14;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const days = useMemo(() => getNextDays(resolvedDaysToShow), [resolvedDaysToShow]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const blockedSet = useMemo(() => new Set(blockedDates || []), [blockedDates]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.row}>
        {days.map((day) => {
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isAllowedDay = !availableWeekdays || availableWeekdays.includes(day.getDay());
          const isBlocked = blockedSet.has(formatDateKey(day));
          const isAvailable = isAllowedDay && !isBlocked;
          return (
            <TouchableRipple
              key={day.toISOString()}
              onPress={() => (isAvailable ? onSelect(day) : null)}
              style={[
                styles.dayChip,
                selected && styles.dayChipSelected,
                !isAvailable && styles.dayChipDisabled
              ]}
            >
              <View>
                <Text style={[styles.dayLabel, selected && styles.dayLabelSelected]}>
                  {day.toLocaleDateString(undefined, { weekday: 'short' })}
                </Text>
                <Text style={[styles.dayNumber, selected && styles.dayNumberSelected]}>
                  {day.getDate()}
                </Text>
              </View>
            </TouchableRipple>
          );
        })}
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  dayChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    minWidth: 64,
  },
  dayChipSelected: {
    backgroundColor: theme.colors.primary,
  },
  dayChipDisabled: {
    opacity: 0.5,
  },
  dayLabel: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    textAlign: 'center',
  },
  dayLabelSelected: {
    color: theme.colors.onPrimary,
  },
  dayNumber: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  dayNumberSelected: {
    color: theme.colors.onPrimary,
  },
});
