import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENTLY_VIEWED_STORAGE_KEY = 'househunter_recently_viewed_v1';
const MAX_RECENTLY_VIEWED = 10;

const normalizePropertyIds = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

export const getRecentlyViewedPropertyIds = async (): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return normalizePropertyIds(parsed).slice(0, MAX_RECENTLY_VIEWED);
  } catch {
    return [];
  }
};

export const addRecentlyViewedPropertyId = async (propertyId: string): Promise<string[]> => {
  const normalizedId = propertyId.trim();
  if (!normalizedId) return getRecentlyViewedPropertyIds();

  const current = await getRecentlyViewedPropertyIds();
  const next = [normalizedId, ...current.filter((item) => item !== normalizedId)].slice(
    0,
    MAX_RECENTLY_VIEWED
  );
  try {
    await AsyncStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort persistence.
  }
  return next;
};

export const clearRecentlyViewedPropertyIds = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
  } catch {
    // Best-effort clear.
  }
};
