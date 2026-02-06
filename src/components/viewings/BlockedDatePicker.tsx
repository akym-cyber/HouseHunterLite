import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Modal, Portal, Text, TouchableRipple } from 'react-native-paper';
import { useTheme } from '../../theme/useTheme';

type BlockedDatePickerProps = {
  visible: boolean;
  blockedDates: string[];
  onDismiss: () => void;
  onConfirm: (dates: string[]) => void;
  daysToShow?: number;
};

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

export default function BlockedDatePicker({
  visible,
  blockedDates,
  onDismiss,
  onConfirm,
  daysToShow = 60,
}: BlockedDatePickerProps) {
  const resolvedDaysToShow = Number.isFinite(daysToShow) ? daysToShow : 60;
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
  const [draftDates, setDraftDates] = useState<Set<string>>(new Set(blockedDates));
  const today = useMemo(() => new Date(), []);
  const todayKey = formatDateKey(today);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: days }, (_, idx) => new Date(year, month, idx + 1));
  }, [currentMonth]);

  const firstWeekday = startOfMonth(currentMonth).getDay();
  const leadingBlanks = Array.from({ length: firstWeekday }, () => null);
  const calendarCells = [...leadingBlanks, ...daysInMonth];

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToggle = (date: Date) => {
    const key = formatDateKey(date);
    setDraftDates((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleClear = () => {
    setDraftDates(new Set());
  };

  const handleSelectWeekends = () => {
    setDraftDates((prev) => {
      const next = new Set(prev);
      for (let i = 0; i < resolvedDaysToShow; i += 1) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const key = formatDateKey(date);
        if (key < todayKey) continue;
        const day = date.getDay();
        if (day === 0 || day === 6) {
          next.add(key);
        }
      }
      return next;
    });
  };

  const handleClearWeekdays = () => {
    setDraftDates((prev) => {
      const next = new Set(prev);
      for (let i = 0; i < resolvedDaysToShow; i += 1) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const day = date.getDay();
        if (day >= 1 && day <= 5) {
          next.delete(formatDateKey(date));
        }
      }
      return next;
    });
  };

  const handleApply = () => {
    onConfirm(Array.from(draftDates).sort());
    onDismiss();
  };

  useEffect(() => {
    if (visible) {
      setDraftDates(new Set(blockedDates));
      setCurrentMonth(startOfMonth(new Date()));
    }
  }, [visible, blockedDates]);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <View style={styles.header}>
          <IconButton icon="chevron-left" onPress={handlePreviousMonth} />
          <Text style={styles.headerTitle}>
            {currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <IconButton icon="chevron-right" onPress={handleNextMonth} />
        </View>

        <View style={styles.weekRow}>
          {WEEK_LABELS.map((label) => (
            <Text key={label} style={styles.weekLabel}>{label}</Text>
          ))}
        </View>

        <View style={styles.quickActions}>
          <Button mode="text" onPress={handleSelectWeekends}>
            Select Weekends
          </Button>
          <Button mode="text" onPress={handleClearWeekdays}>
            Clear Weekdays
          </Button>
        </View>
        <Text style={styles.scopeNote}>
          Applies to the next {resolvedDaysToShow} days
        </Text>

        <View style={styles.grid}>
          {calendarCells.map((date, index) => {
            if (!date) {
              return <View key={`blank-${index}`} style={styles.dayCell} />;
            }

            const key = formatDateKey(date);
            const isPast = key < todayKey;
            const isSelected = draftDates.has(key);
            const isToday = key === todayKey;

            return (
              <TouchableRipple
                key={key}
                onPress={() => handleToggle(date)}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isPast && styles.dayCellPast,
                ]}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    isToday && styles.dayLabelToday,
                    isSelected && styles.dayLabelSelected,
                    isPast && styles.dayLabelDisabled,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </TouchableRipple>
            );
          })}
        </View>

        <View style={styles.actions}>
          <View style={styles.actionLeft}>
            <Text style={styles.selectionText}>{draftDates.size} selected</Text>
            <Button mode="text" onPress={handleClear}>
              Clear
            </Button>
          </View>
          <Button
            mode="contained"
            onPress={handleApply}
            disabled={draftDates.size === 0}
          >
            Done
          </Button>
        </View>
      </Modal>
    </Portal>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  modal: {
    margin: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scopeNote: {
    marginTop: 4,
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    textAlign: 'right',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.primary,
  },
  dayCellPast: {
    opacity: 0.6,
  },
  dayLabel: {
    color: theme.colors.onSurface,
    fontSize: 13,
  },
  dayLabelSelected: {
    color: theme.colors.onPrimary,
    fontWeight: '700',
  },
  dayLabelDisabled: {
    opacity: 0.4,
  },
  dayLabelToday: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectionText: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
});
