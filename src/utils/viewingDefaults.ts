import { WeekdayKey, ViewingTimeSlotRange } from '../types/database';

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

export const DEFAULT_VIEWING_DAYS = WEEKDAY_OPTIONS.map((day) => day.value);

export const WEEKDAY_KEYS: WeekdayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_KEY_BY_INDEX: Record<number, WeekdayKey> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

export const WEEKDAY_LABEL_BY_KEY: Record<WeekdayKey, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const DEFAULT_VIEWING_TIME_RANGES: ViewingTimeSlotRange[] = [
  { start: '09:00', end: '12:00' },
  { start: '14:00', end: '17:00' },
];

export type TimeSlotOption = { label: string; hour: number; minute: number };

export const parseTimeLabel = (label: string): TimeSlotOption | null => {
  const match = label.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (!match) return null;
  const rawHour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3].toUpperCase();
  let hour = rawHour;
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return { label, hour, minute };
};

export const timeStringToMinutes = (time: string): number | null => {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

export const minutesToTimeString = (minutes: number): string => {
  const safe = Math.max(0, Math.min(23 * 60 + 59, minutes));
  const hour = Math.floor(safe / 60);
  const minute = safe % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

export const formatTimeLabel = (time: string): string => {
  const minutes = timeStringToMinutes(time);
  if (minutes === null) return time;
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`;
};

export const formatRangeLabel = (range: ViewingTimeSlotRange): string =>
  `${formatTimeLabel(range.start)} - ${formatTimeLabel(range.end)}`;

export const normalizeViewingTimeSlots = (
  value: ViewingTimeSlotRange[] | string[] | undefined,
  fallbackDays?: WeekdayKey[]
): ViewingTimeSlotRange[] => {
  if (!value || value.length === 0) {
    return DEFAULT_VIEWING_TIME_RANGES.map((slot) => ({
      ...slot,
      ...(fallbackDays ? { days: fallbackDays } : {}),
    }));
  }

  const first = value[0];
  if (typeof first === 'string') {
    const labels = value as string[];
    return labels
      .map((label) => parseTimeLabel(label))
      .filter((slot): slot is TimeSlotOption => slot !== null)
      .map((slot) => {
        const startMinutes = slot.hour * 60 + slot.minute;
        const endMinutes = startMinutes + 60;
        return {
          start: minutesToTimeString(startMinutes),
          end: minutesToTimeString(endMinutes),
          ...(fallbackDays ? { days: fallbackDays } : {}),
        };
      });
  }

  return (value as ViewingTimeSlotRange[]).map((slot) => ({
    ...slot,
    ...(slot.days && slot.days.length > 0 ? {} : fallbackDays ? { days: fallbackDays } : {}),
  }));
};

export const buildTimeSlotOptions = (
  value: ViewingTimeSlotRange[] | string[],
  selectedDate?: Date
): TimeSlotOption[] => {
  if (!value || value.length === 0) return [];

  const first = value[0];
  if (typeof first === 'string') {
    return (value as string[])
      .map((label) => parseTimeLabel(label))
      .filter((slot): slot is TimeSlotOption => slot !== null);
  }

  const dayKey = selectedDate ? WEEKDAY_KEY_BY_INDEX[selectedDate.getDay()] : null;
  return (value as ViewingTimeSlotRange[])
    .filter((slot) => {
      if (!slot.days || slot.days.length === 0 || !dayKey) return true;
      return slot.days.includes(dayKey);
    })
    .map((slot) => {
      const startMinutes = timeStringToMinutes(slot.start) ?? 0;
      const hour = Math.floor(startMinutes / 60);
      const minute = startMinutes % 60;
      return {
        label: formatRangeLabel(slot),
        hour,
        minute,
      };
    });
};

