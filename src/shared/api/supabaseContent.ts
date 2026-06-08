import { baubookImages } from '../assets/images';
import { demoPlaces } from '../data/mockData';
import { hasSupabaseConfig } from '../lib/env';
import { getSupabaseClient } from '../lib/supabase';
import type { ModerationStatus, PlaceKind, PlaceModel } from '../types/domain';

export interface SupabaseFeatureFlag {
  key: string;
  title: string;
  description: string | null;
  enabled: boolean;
  minAppVersion: string | null;
}

export interface SupabasePublicStatus {
  configured: boolean;
  connected: boolean;
  message: string;
  appConfigCount: number;
  featureFlagsCount: number;
  placesCount: number;
  walkPlansCount: number;
  presencesCount: number;
  lostDogAlertsCount: number;
  dangerReportsCount: number;
  lastCheckedAt: string;
}

export interface SupabasePlacesResult {
  source: 'supabase' | 'fallback';
  places: PlaceModel[];
  message: string;
  errorMessage?: string;
}

interface RemotePlaceRow {
  id: string;
  slug: string | null;
  name: string;
  type: string;
  tags: string[] | null;
  description: string | null;
  moderation_status: string;
  source: string;
  city_areas?: { name?: string | null } | Array<{ name?: string | null }> | null;
  cities?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface RemoteFeatureFlagRow {
  key: string;
  title: string;
  description: string | null;
  enabled: boolean;
  min_app_version: string | null;
}

function normalizeError(error: unknown): string {
  if (!error) {
    return 'Errore sconosciuto';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return JSON.stringify(error);
}

function relationName(value: RemotePlaceRow['city_areas'] | RemotePlaceRow['cities']): string | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }

  return value.name ?? null;
}

function normalizePlaceKind(type: string): PlaceKind {
  switch (type) {
    case 'dog_area':
    case 'walk':
    case 'vet':
    case 'pet_shop':
    case 'warning_zone':
    case 'beach':
    case 'trail':
    case 'service':
    case 'other':
      return type;
    default:
      return 'other';
  }
}

function iconForPlaceKind(kind: PlaceKind) {
  switch (kind) {
    case 'dog_area':
      return baubookImages.icons.dogArea;
    case 'walk':
    case 'trail':
      return baubookImages.icons.route;
    case 'vet':
      return baubookImages.icons.vet;
    case 'pet_shop':
      return baubookImages.icons.petShop;
    case 'warning_zone':
      return baubookImages.icons.danger;
    case 'beach':
      return baubookImages.icons.holidays;
    case 'service':
      return baubookImages.icons.dogSitter;
    case 'other':
    default:
      return baubookImages.icons.map;
  }
}

function normalizeModerationStatus(value: string): ModerationStatus {
  switch (value) {
    case 'pending':
    case 'approved':
    case 'rejected':
    case 'hidden':
    case 'escalated':
    case 'removed':
      return value;
    default:
      return 'pending';
  }
}

function remotePlaceToModel(row: RemotePlaceRow): PlaceModel {
  const kind = normalizePlaceKind(row.type);
  const areaName = relationName(row.city_areas) ?? relationName(row.cities) ?? 'Venezia-Mestre';

  return {
    id: row.id,
    name: row.name,
    kind,
    area: areaName,
    distanceLabel: row.source === 'demo' ? 'seed Supabase' : 'database',
    description: row.description ?? 'Scheda luogo BauBook in preparazione.',
    tags: row.tags?.length ? row.tags : ['da verificare'],
    scoreLabel: row.source === 'demo' ? 'demo' : 'BauBook',
    icon: iconForPlaceKind(kind),
    moderationStatus: normalizeModerationStatus(row.moderation_status),
  };
}

export async function fetchPublicPlaces(): Promise<SupabasePlacesResult> {
  const client = getSupabaseClient();

  if (!hasSupabaseConfig || !client) {
    return {
      source: 'fallback',
      places: demoPlaces,
      message: 'Supabase non configurato: uso dati demo locali.',
    };
  }

  try {
    const { data, error } = await client
      .from('places')
      .select('id, slug, name, type, tags, description, moderation_status, source, city_areas(name), cities(name)')
      .eq('visibility', 'public')
      .order('name', { ascending: true });

    if (error) {
      return {
        source: 'fallback',
        places: demoPlaces,
        message: 'Supabase configurato, ma la lettura luoghi non e\' ancora disponibile.',
        errorMessage: normalizeError(error),
      };
    }

    const places = ((data ?? []) as RemotePlaceRow[]).map(remotePlaceToModel);

    if (!places.length) {
      return {
        source: 'fallback',
        places: demoPlaces,
        message: 'Supabase raggiungibile, ma non ci sono ancora luoghi pubblici: uso dati demo locali.',
      };
    }

    return {
      source: 'supabase',
      places,
      message: `${places.length} luogo/i caricati da Supabase.`,
    };
  }
  catch (error) {
    return {
      source: 'fallback',
      places: demoPlaces,
      message: 'Errore runtime durante la lettura luoghi: uso dati demo locali.',
      errorMessage: normalizeError(error),
    };
  }
}

async function countRows(tableName: string): Promise<{ count: number; errorMessage?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, errorMessage: 'Supabase client non configurato' };
  }

  const { count, error } = await client.from(tableName).select('*', { count: 'exact', head: true });
  if (error) {
    return { count: 0, errorMessage: normalizeError(error) };
  }

  return { count: count ?? 0 };
}

export async function fetchFeatureFlags(): Promise<SupabaseFeatureFlag[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  const { data, error } = await client
    .from('feature_flags')
    .select('key, title, description, enabled, min_app_version')
    .order('key', { ascending: true });

  if (error) {
    throw new Error(normalizeError(error));
  }

  return ((data ?? []) as RemoteFeatureFlagRow[]).map((row) => ({
    key: row.key,
    title: row.title,
    description: row.description,
    enabled: row.enabled,
    minAppVersion: row.min_app_version,
  }));
}

export async function fetchSupabasePublicStatus(): Promise<SupabasePublicStatus> {
  const checkedAt = new Date().toLocaleString('it-IT');

  if (!hasSupabaseConfig || !getSupabaseClient()) {
    return {
      configured: false,
      connected: false,
      message: 'Config Supabase assente: crea .env con URL e publishable key.',
      appConfigCount: 0,
      featureFlagsCount: 0,
      placesCount: 0,
      walkPlansCount: 0,
      presencesCount: 0,
      lostDogAlertsCount: 0,
      dangerReportsCount: 0,
      lastCheckedAt: checkedAt,
    };
  }

  const [appConfig, featureFlags, places, walkPlans, presences, lostDogAlerts, dangerReports] = await Promise.all([
    countRows('app_config'),
    countRows('feature_flags'),
    countRows('places'),
    countRows('walk_plans'),
    countRows('presence_sessions'),
    countRows('lost_dog_alerts'),
    countRows('danger_reports'),
  ]);

  const firstError = appConfig.errorMessage ?? featureFlags.errorMessage ?? places.errorMessage ?? walkPlans.errorMessage ?? presences.errorMessage ?? lostDogAlerts.errorMessage ?? dangerReports.errorMessage;

  if (firstError) {
    return {
      configured: true,
      connected: false,
      message: firstError,
      appConfigCount: appConfig.count,
      featureFlagsCount: featureFlags.count,
      placesCount: places.count,
      walkPlansCount: walkPlans.count,
      presencesCount: presences.count,
      lostDogAlertsCount: lostDogAlerts.count,
      dangerReportsCount: dangerReports.count,
      lastCheckedAt: checkedAt,
    };
  }

  return {
    configured: true,
    connected: true,
    message: 'Supabase raggiungibile: API pubbliche e RLS rispondono.',
    appConfigCount: appConfig.count,
    featureFlagsCount: featureFlags.count,
    placesCount: places.count,
    walkPlansCount: walkPlans.count,
    presencesCount: presences.count,
    lostDogAlertsCount: lostDogAlerts.count,
    dangerReportsCount: dangerReports.count,
    lastCheckedAt: checkedAt,
  };
}
