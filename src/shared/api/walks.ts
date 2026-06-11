import { baubookImages } from '../assets/images';
import { demoWalkPlans } from '../data/mockData';
import { getSupabaseClient } from '../lib/supabase';
import type { WalkPlanModel } from '../types/domain';
import { normalizeError } from './authAccount';

export interface LiveWalkPlanModel extends WalkPlanModel {
  startsAtIso: string;
  ownerName: string;
  placeId: string | null;
  dogId: string | null;
  ownerId: string | null;
  isMine: boolean;
  source: 'supabase' | 'fallback';
}

export interface LivePresenceModel {
  id: string;
  dogName: string;
  placeName: string;
  ownerName: string;
  statusLabel: string;
  message: string;
  expiresAtLabel: string;
  tags: string[];
}

export interface WalksBoardResult {
  source: 'supabase' | 'fallback';
  walks: LiveWalkPlanModel[];
  presences: LivePresenceModel[];
  message: string;
  errorMessage?: string;
}

export interface CreateWalkPlanInput {
  placeId: string;
  dogId: string;
  startsAtIso: string;
  message: string;
  acceptsCompany: boolean;
}

export interface CreatePresenceInput {
  placeId: string;
  dogId: string;
  status: 'available' | 'walking' | 'playing';
  message: string;
  expiresMinutes: number;
}

interface RelatedNameRow {
  name?: string | null;
}

interface RelatedProfileRow {
  id?: string | null;
  display_name?: string | null;
}

interface RemoteWalkPlanRow {
  id: string;
  place_id: string | null;
  dog_id: string | null;
  owner_id: string | null;
  starts_at: string;
  ends_at: string | null;
  message: string | null;
  accepts_company: boolean;
  dogs?: RelatedNameRow | RelatedNameRow[] | null;
  places?: (RelatedNameRow & { tags?: string[] | null; type?: string | null }) | Array<RelatedNameRow & { tags?: string[] | null; type?: string | null }> | null;
  profiles?: RelatedProfileRow | RelatedProfileRow[] | null;
}

interface RemotePresenceRow {
  id: string;
  status: string;
  message: string | null;
  expires_at: string;
  dogs?: RelatedNameRow | RelatedNameRow[] | null;
  places?: RelatedNameRow | RelatedNameRow[] | null;
  profiles?: RelatedProfileRow | RelatedProfileRow[] | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatWalkStartLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Data da verificare';
  }

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const time = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  if (sameDay(date, today)) {
    return `Oggi · ${time}`;
  }

  if (sameDay(date, tomorrow)) {
    return `Domani · ${time}`;
  }

  return `${date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })} · ${time}`;
}

function formatPresenceExpiry(iso: string): string {
  const date = new Date(iso);
  const deltaMs = date.getTime() - Date.now();
  if (Number.isNaN(date.getTime()) || deltaMs <= 0) {
    return 'in scadenza';
  }

  const minutes = Math.max(1, Math.round(deltaMs / 60000));
  if (minutes < 60) {
    return `scade tra ${minutes} min`;
  }
  return `scade tra ${Math.round(minutes / 60)} h`;
}

function demoWalkToLive(plan: WalkPlanModel): LiveWalkPlanModel {
  return {
    ...plan,
    startsAtIso: new Date().toISOString(),
    ownerName: 'Demo BauBook',
    placeId: null,
    dogId: null,
    ownerId: null,
    isMine: false,
    source: 'fallback',
  };
}

function remoteWalkToModel(row: RemoteWalkPlanRow, currentProfileId?: string | null): LiveWalkPlanModel {
  const dog = firstRelation(row.dogs);
  const place = firstRelation(row.places);
  const profile = firstRelation(row.profiles);
  const tags = [
    row.accepts_company ? 'accetta compagnia' : 'passeggiata tranquilla',
    row.ends_at ? '90 min circa' : 'durata libera',
    'no live tracking',
  ];

  return {
    id: row.id,
    dogName: dog?.name ?? 'Un bau amico',
    placeName: place?.name ?? 'luogo BauBook',
    startsAtLabel: formatWalkStartLabel(row.starts_at),
    startsAtIso: row.starts_at,
    message: row.message ?? 'Passeggiata BauBook senza messaggio. Misterioso ma scodinzolante.',
    acceptsCompany: row.accepts_company,
    tags,
    ownerName: profile?.display_name ?? 'Umano BauBook',
    placeId: row.place_id,
    dogId: row.dog_id,
    ownerId: row.owner_id,
    isMine: Boolean(currentProfileId && row.owner_id === currentProfileId),
    source: 'supabase',
  };
}

function remotePresenceToModel(row: RemotePresenceRow): LivePresenceModel {
  const dog = firstRelation(row.dogs);
  const place = firstRelation(row.places);
  const profile = firstRelation(row.profiles);

  const statusLabel = row.status === 'playing'
    ? 'sta giocando'
    : row.status === 'available'
      ? 'accetta compagnia'
      : 'sta passeggiando';

  return {
    id: row.id,
    dogName: dog?.name ?? 'Un bau vicino',
    placeName: place?.name ?? 'luogo BauBook',
    ownerName: profile?.display_name ?? 'Umano BauBook',
    statusLabel,
    message: row.message ?? 'Presenza temporanea attiva.',
    expiresAtLabel: formatPresenceExpiry(row.expires_at),
    tags: ['presenza temporanea', 'area indicativa', 'privacy soft'],
  };
}

export async function fetchWalksBoard(currentProfileId?: string | null): Promise<WalksBoardResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      source: 'fallback',
      walks: demoWalkPlans.map(demoWalkToLive),
      presences: [],
      message: 'Supabase non configurato: uso passeggiate demo locali.',
    };
  }

  try {
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const [walksResult, presencesResult] = await Promise.all([
      client
        .from('walk_plans')
        .select('id, place_id, dog_id, owner_id, starts_at, ends_at, message, accepts_company, dogs(name), places(name, tags, type), profiles(display_name)')
        .gte('starts_at', since)
        .order('starts_at', { ascending: true })
        .limit(20),
      client
        .from('presence_sessions')
        .select('id, status, message, expires_at, dogs(name), places(name), profiles(display_name)')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true })
        .limit(20),
    ]);

    if (walksResult.error) {
      return {
        source: 'fallback',
        walks: demoWalkPlans.map(demoWalkToLive),
        presences: [],
        message: 'Lettura passeggiate Supabase non disponibile: uso demo locali.',
        errorMessage: normalizeError(walksResult.error),
      };
    }

    if (presencesResult.error) {
      return {
        source: 'supabase',
        walks: ((walksResult.data ?? []) as RemoteWalkPlanRow[]).map((row) => remoteWalkToModel(row, currentProfileId)),
        presences: [],
        message: 'Passeggiate caricate; presenza temporanea da verificare.',
        errorMessage: normalizeError(presencesResult.error),
      };
    }

    const walks = ((walksResult.data ?? []) as RemoteWalkPlanRow[]).map((row) => remoteWalkToModel(row, currentProfileId));
    const presences = ((presencesResult.data ?? []) as RemotePresenceRow[]).map(remotePresenceToModel);

    return {
      source: 'supabase',
      walks,
      presences,
      message: `${walks.length} passeggiata/e e ${presences.length} presenza/e caricate da Supabase.`,
    };
  }
  catch (error) {
    return {
      source: 'fallback',
      walks: demoWalkPlans.map(demoWalkToLive),
      presences: [],
      message: 'Errore runtime passeggiate: uso dati non disponibili.',
      errorMessage: normalizeError(error),
    };
  }
}

export async function createWalkPlan(input: CreateWalkPlanInput): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('create_beta_walk_plan', {
    place_id_input: input.placeId,
    dog_id_input: input.dogId,
    starts_at_input: input.startsAtIso,
    message_input: input.message,
    accepts_company_input: input.acceptsCompany,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function joinWalkPlan(walkPlanId: string, dogId?: string | null): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('join_beta_walk_plan', {
    walk_plan_id_input: walkPlanId,
    dog_id_input: dogId || null,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function createPresence(input: CreatePresenceInput): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('create_or_refresh_presence_session', {
    place_id_input: input.placeId,
    dog_id_input: input.dogId,
    status_input: input.status,
    message_input: input.message,
    expires_minutes_input: input.expiresMinutes,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function endMyPresenceSessions(): Promise<number> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { data, error } = await client.rpc('end_my_presence_sessions');
  if (error) {
    throw new Error(normalizeError(error));
  }
  return typeof data === 'number' ? data : 0;
}
