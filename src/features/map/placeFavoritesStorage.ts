import { getSupabaseClient } from '../../shared/lib/supabase';

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

async function getCurrentUserId(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return null;
  }

  return data.user.id;
}

export async function readPlaceFavoriteIds(): Promise<string[]> {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  if (!client || !userId) {
    return [];
  }

  const { data, error } = await client
    .from('place_favorites')
    .select('place_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return normalizeIds((data ?? []).map((row) => row.place_id));
}

export async function savePlaceFavoriteIds(ids: string[]): Promise<string[]> {
  const client = getSupabaseClient();
  const userId = await getCurrentUserId();
  const normalized = normalizeIds(ids);

  if (!client || !userId) {
    return [];
  }

  const { error: deleteError } = await client.from('place_favorites').delete().eq('user_id', userId);
  if (deleteError) {
    return readPlaceFavoriteIds();
  }

  if (!normalized.length) {
    return [];
  }

  const rows = normalized.map((placeId) => ({ user_id: userId, place_id: placeId }));
  const { error: insertError } = await client.from('place_favorites').insert(rows);
  if (insertError) {
    return readPlaceFavoriteIds();
  }

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
