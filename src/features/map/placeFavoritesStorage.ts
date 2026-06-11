import AsyncStorage from '@react-native-async-storage/async-storage';

const PLACE_FAVORITES_KEY = 'baubook.map.placeFavorites.v1';

function normalizeIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();
  value.forEach((item) => {
    if (typeof item === 'string' && item.trim().length > 0) {
      unique.add(item.trim());
    }
  });

  return Array.from(unique);
}

export async function readPlaceFavoriteIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PLACE_FAVORITES_KEY);
    if (!raw) {
      return [];
    }

    return normalizeIds(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function savePlaceFavoriteIds(ids: string[]): Promise<string[]> {
  const normalized = normalizeIds(ids);
  await AsyncStorage.setItem(PLACE_FAVORITES_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function togglePlaceFavoriteId(id: string, currentIds: string[]): Promise<string[]> {
  const normalizedId = id.trim();
  if (!normalizedId) {
    return normalizeIds(currentIds);
  }

  const current = new Set(normalizeIds(currentIds));
  if (current.has(normalizedId)) {
    current.delete(normalizedId);
  } else {
    current.add(normalizedId);
  }

  return savePlaceFavoriteIds(Array.from(current));
}
