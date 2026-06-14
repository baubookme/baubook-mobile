import { getSupabaseClient } from '../lib/supabase';
import type { WalkPlanModel } from '../types/domain';
import { normalizeError } from './authAccount';

type LocationMode = 'current' | 'manual';

export interface LiveWalkPlanModel extends WalkPlanModel {
  startsAtIso: string;
  ownerName: string;
  placeId: string | null;
  dogId: string | null;
  ownerId: string | null;
  dogAvatarUrl: string | null;
  locationMode: LocationMode | null;
  locationLabel: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  manualAddress: string | null;
  isMine: boolean;
  source: 'supabase' | 'fallback';
}

export interface LivePresenceModel {
  id: string;
  dogName: string;
  placeName: string;
  ownerName: string;
  dogAvatarUrl: string | null;
  statusLabel: string;
  message: string;
  expiresAtLabel: string;
  tags: string[];
  profileId: string | null;
  dogId: string | null;
  placeId: string | null;
  locationMode: LocationMode | null;
  locationLabel: string | null;
  locationLatitude: number | null;
  locationLongitude: number | null;
  manualAddress: string | null;
  isMine: boolean;
}

export interface WalksBoardResult {
  source: 'supabase' | 'fallback';
  walks: LiveWalkPlanModel[];
  presences: LivePresenceModel[];
  message: string;
  errorMessage?: string;
}

export interface LocationPayloadInput {
  locationMode?: LocationMode | null;
  locationLabel?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  manualAddress?: string | null;
}

export interface CreateWalkPlanInput extends LocationPayloadInput {
  placeId: string;
  dogId: string;
  startsAtIso: string;
  message: string;
  acceptsCompany: boolean;
}

export interface UpdateWalkPlanInput extends CreateWalkPlanInput {}

export interface CreatePresenceInput extends LocationPayloadInput {
  placeId: string;
  dogId: string;
  status: 'available' | 'walking' | 'playing' | 'dog_area';
  message: string;
  expiresMinutes: number;
}

export interface UpdatePresenceInput extends CreatePresenceInput {}

interface RelatedNameRow {
  name?: string | null;
}

interface RelatedDogRow extends RelatedNameRow {
  avatar_url?: string | null;
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
  location_mode?: LocationMode | null;
  location_label?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  manual_address?: string | null;
  dogs?: RelatedDogRow | RelatedDogRow[] | null;
  places?: (RelatedNameRow & { tags?: string[] | null; type?: string | null }) | Array<RelatedNameRow & { tags?: string[] | null; type?: string | null }> | null;
  profiles?: RelatedProfileRow | RelatedProfileRow[] | null;
}

interface RemotePresenceRow {
  id: string;
  profile_id: string | null;
  dog_id: string | null;
  place_id: string | null;
  status: string;
  message: string | null;
  expires_at: string;
  location_mode?: LocationMode | null;
  location_label?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  manual_address?: string | null;
  dogs?: RelatedDogRow | RelatedDogRow[] | null;
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

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

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

function cleanLiveMessage(message: string | null, fallback: string): string {
  return (message ?? fallback).replace(/\n\n📍[\s\S]*$/u, '').trim();
}

function remoteWalkToModel(row: RemoteWalkPlanRow, currentProfileId?: string | null): LiveWalkPlanModel {
  const dog = firstRelation(row.dogs);
  const place = firstRelation(row.places);
  const profile = firstRelation(row.profiles);
  const tags = [row.accepts_company ? 'Accetto compagnia' : 'Meglio se ci conosciamo già!'];
  const locationLabel = row.location_label?.trim() || null;

  return {
    id: row.id,
    dogName: dog?.name ?? 'Un bau amico',
    placeName: locationLabel ?? place?.name ?? 'luogo BauBook',
    startsAtLabel: formatWalkStartLabel(row.starts_at),
    startsAtIso: row.starts_at,
    message: cleanLiveMessage(row.message, 'Passeggiata BauBook senza messaggio. Misterioso ma scodinzolante.'),
    acceptsCompany: row.accepts_company,
    tags,
    ownerName: profile?.display_name ?? 'Umano BauBook',
    placeId: row.place_id,
    dogId: row.dog_id,
    ownerId: row.owner_id,
    dogAvatarUrl: dog?.avatar_url ?? null,
    locationMode: row.location_mode ?? null,
    locationLabel,
    locationLatitude: row.location_latitude ?? null,
    locationLongitude: row.location_longitude ?? null,
    manualAddress: row.manual_address ?? null,
    isMine: Boolean(currentProfileId && row.owner_id === currentProfileId),
    source: 'supabase',
  };
}

function remotePresenceToModel(row: RemotePresenceRow, currentProfileId?: string | null): LivePresenceModel {
  const dog = firstRelation(row.dogs);
  const place = firstRelation(row.places);
  const profile = firstRelation(row.profiles);
  const statusLabel = row.status === 'dog_area' ? 'è in area cani' : row.status === 'playing' ? 'sta giocando' : row.status === 'available' ? 'accetta compagnia' : 'sta passeggiando';
  const statusTag = row.status === 'dog_area' ? 'Sono in area cani' : row.status === 'playing' ? 'Sto giocando' : row.status === 'available' ? 'Accetto compagnia' : 'Sto passeggiando';
  const locationLabel = row.location_label?.trim() || null;

  return {
    id: row.id,
    dogName: dog?.name ?? 'Un bau vicino',
    placeName: locationLabel ?? place?.name ?? 'luogo BauBook',
    ownerName: profile?.display_name ?? 'Umano BauBook',
    dogAvatarUrl: dog?.avatar_url ?? null,
    statusLabel,
    message: cleanLiveMessage(row.message, 'Presenza temporanea attiva.'),
    expiresAtLabel: formatPresenceExpiry(row.expires_at),
    tags: [statusTag],
    profileId: row.profile_id,
    dogId: row.dog_id,
    placeId: row.place_id,
    locationMode: row.location_mode ?? null,
    locationLabel,
    locationLatitude: row.location_latitude ?? null,
    locationLongitude: row.location_longitude ?? null,
    manualAddress: row.manual_address ?? null,
    isMine: Boolean(currentProfileId && row.profile_id === currentProfileId),
  };
}

export async function fetchWalksBoard(currentProfileId?: string | null): Promise<WalksBoardResult> {
  const client = getSupabaseClient();

  if (!client) {
    return {
      source: 'fallback',
      walks: [],
      presences: [],
      message: 'Supabase non configurato: passeggiate live non disponibili.',
    };
  }

  try {
    const cleanupResult = await client.rpc('deactivate_stale_live_walks_presence');

    if (cleanupResult.error) {
      console.warn('BauBook walks stale cleanup failed', cleanupResult.error);
    }

    const [walksResult, presencesResult] = await Promise.all([
      client
        .from('walk_plans')
        .select('id, place_id, dog_id, owner_id, starts_at, ends_at, message, accepts_company, location_mode, location_label, location_latitude, location_longitude, manual_address, dogs(name, avatar_url), places(name, tags, type), profiles(display_name)')
        .eq('active', true)
        .order('starts_at', { ascending: true })
        .limit(20),
      client
        .from('presence_sessions')
        .select('id, profile_id, dog_id, place_id, status, message, expires_at, location_mode, location_label, location_latitude, location_longitude, manual_address, dogs(name, avatar_url), places(name), profiles(display_name)')
        .eq('active', true)
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true })
        .limit(20),
    ]);

    if (walksResult.error) {
      return {
        source: 'supabase',
        walks: [],
        presences: [],
        message: 'Passeggiate live non caricate.',
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
    const presences = ((presencesResult.data ?? []) as RemotePresenceRow[]).map((row) => remotePresenceToModel(row, currentProfileId));

    return {
      source: 'supabase',
      walks,
      presences,
      message: `${walks.length} passeggiata/e live e ${presences.length} presenza/e attive caricate da Supabase.`,
    };
  } catch (error) {
    return {
      source: 'supabase',
      walks: [],
      presences: [],
      message: 'Errore runtime passeggiate.',
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
    location_mode_input: input.locationMode ?? null,
    location_label_input: input.locationLabel ?? null,
    location_latitude_input: input.locationLatitude ?? null,
    location_longitude_input: input.locationLongitude ?? null,
    manual_address_input: input.manualAddress ?? null,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function updateMyActiveWalkPlan(input: UpdateWalkPlanInput): Promise<void> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('update_my_active_walk_plan', {
    place_id_input: input.placeId,
    dog_id_input: input.dogId,
    starts_at_input: input.startsAtIso,
    message_input: input.message,
    accepts_company_input: input.acceptsCompany,
    location_mode_input: input.locationMode ?? null,
    location_label_input: input.locationLabel ?? null,
    location_latitude_input: input.locationLatitude ?? null,
    location_longitude_input: input.locationLongitude ?? null,
    manual_address_input: input.manualAddress ?? null,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function endMyWalkPlan(walkPlanId: string): Promise<number> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { data, error } = await client.rpc('end_my_walk_plan', {
    walk_plan_id_input: walkPlanId,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }

  return typeof data === 'number' ? data : 0;
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
    location_mode_input: input.locationMode ?? null,
    location_label_input: input.locationLabel ?? null,
    location_latitude_input: input.locationLatitude ?? null,
    location_longitude_input: input.locationLongitude ?? null,
    manual_address_input: input.manualAddress ?? null,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function updateMyActivePresence(input: UpdatePresenceInput): Promise<void> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('update_my_active_presence_session', {
    place_id_input: input.placeId,
    dog_id_input: input.dogId,
    status_input: input.status,
    message_input: input.message,
    expires_minutes_input: input.expiresMinutes,
    location_mode_input: input.locationMode ?? null,
    location_label_input: input.locationLabel ?? null,
    location_latitude_input: input.locationLatitude ?? null,
    location_longitude_input: input.locationLongitude ?? null,
    manual_address_input: input.manualAddress ?? null,
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
