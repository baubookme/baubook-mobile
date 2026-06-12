import { getSupabaseClient } from '../../shared/lib/supabase';

export type BackendDogDiaryCategory = 'walk' | 'food' | 'vet' | 'medicine' | 'grooming' | 'note';

export interface BackendDogDiaryEvent {
  id: string;
  category: BackendDogDiaryCategory;
  note: string;
  createdAt: string;
}

interface DogDiaryRow {
  id: string;
  event_type: string;
  title: string | null;
  note: string | null;
  event_date: string | null;
  created_at: string | null;
}

const CATEGORY_FALLBACK: BackendDogDiaryCategory = 'note';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeCategory(value: string | null | undefined): BackendDogDiaryCategory {
  switch (value) {
    case 'walk':
    case 'food':
    case 'vet':
    case 'medicine':
    case 'grooming':
    case 'note':
      return value;
    default:
      return CATEGORY_FALLBACK;
  }
}

function rowToEvent(row: DogDiaryRow): BackendDogDiaryEvent {
  const note = typeof row.note === 'string' && row.note.trim().length ? row.note : row.title ?? '';
  return {
    id: row.id,
    category: normalizeCategory(row.event_type),
    note: note.trim() || 'Evento diario',
    createdAt: row.event_date ?? row.created_at ?? new Date().toISOString(),
  };
}

async function requireUser() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Backend Supabase non configurato.');
  }

  const { data, error } = await client.auth.getUser();
  if (error) {
    throw error;
  }

  const user = data.user;
  if (!user) {
    throw new Error('Accedi per salvare il Dog Diary sul backend BauBook.');
  }

  return { client, user };
}

export async function loadDogDiaryEvents<T extends BackendDogDiaryEvent = BackendDogDiaryEvent>(): Promise<T[]> {
  const { client, user } = await requireUser();
  const { data, error } = await client
    .from('dog_diary_events')
    .select('id, event_type, title, note, event_date, created_at')
    .eq('user_id', user.id)
    .order('event_date', { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  return ((data ?? []) as DogDiaryRow[]).map(rowToEvent) as T[];
}

export async function saveDogDiaryEvents<T extends BackendDogDiaryEvent = BackendDogDiaryEvent>(events: T[]): Promise<T[]> {
  const { client, user } = await requireUser();
  const rows = events.slice(0, 30).map((event) => {
    const cleanNote = typeof event.note === 'string' ? event.note.trim() : '';
    const row: Record<string, string> = {
      user_id: user.id,
      event_type: normalizeCategory(event.category),
      title: cleanNote || normalizeCategory(event.category),
      note: cleanNote,
      event_date: event.createdAt || new Date().toISOString(),
    };

    if (typeof event.id === 'string' && UUID_RE.test(event.id)) {
      row.id = event.id;
    }

    return row;
  });

  if (rows.length) {
    const { error } = await client.from('dog_diary_events').upsert(rows, { onConflict: 'id', defaultToNull: false });
    if (error) {
      throw error;
    }
  }

  return loadDogDiaryEvents<T>();
}

export async function deleteDogDiaryEvent(eventId: string): Promise<void> {
  if (!UUID_RE.test(eventId)) {
    return;
  }

  const { client, user } = await requireUser();

  const { error } = await client
      .from('dog_diary_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id);

  if (error) {
    throw error;
  }
}

