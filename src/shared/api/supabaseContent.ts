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

export interface NearbyDogAreaModel extends PlaceModel {
  addressLabel: string;
  distanceKm: number;
  latitude: number;
  longitude: number;
  geocodingStatus: string;
}

export interface NearbyDogAreasResult {
  source: 'supabase' | 'fallback';
  areas: NearbyDogAreaModel[];
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
  metadata?: Record<string, unknown> | null;
  city_areas?: { name?: string | null } | Array<{ name?: string | null }> | null;
  cities?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface RemoteNearbyDogAreaRow {
  id: string;
  slug: string | null;
  name: string;
  type: string;
  area_name: string | null;
  city_name: string | null;
  address: string | null;
  description: string | null;
  tags: string[] | null;
  moderation_status: string;
  source: string;
  distance_km: number | null;
  lat: number | null;
  lng: number | null;
  metadata: Record<string, unknown> | null;
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

function metadataText(metadata: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length ? value : null;
}

function remotePlaceToModel(row: RemotePlaceRow): PlaceModel {
  const kind = normalizePlaceKind(row.type);
  const areaName = relationName(row.city_areas) ?? relationName(row.cities) ?? 'Venezia-Mestre';
  const address = metadataText(row.metadata, 'address');
  const geocodingStatus = metadataText(row.metadata, 'geocodingStatus');
  const isOfficialDogArea = row.source === 'comune_venezia_official_dog_areas_2026_pdf';
  const distanceLabel = isOfficialDogArea
    ? geocodingStatus === 'beta_geocoded'
      ? 'ufficiale · geocodificata beta'
      : 'ufficiale · indirizzo'
    : row.source === 'demo'
      ? 'seed Supabase'
      : 'database';

  return {
    id: row.id,
    name: row.name,
    kind,
    area: areaName,
    distanceLabel,
    description: row.description ?? (address ? `Indirizzo: ${address}` : 'Scheda luogo BauBook in preparazione.'),
    tags: row.tags?.length ? row.tags : ['da verificare'],
    scoreLabel: isOfficialDogArea ? 'ufficiale' : row.source === 'demo' ? 'demo' : 'BauBook',
    icon: iconForPlaceKind(kind),
    moderationStatus: normalizeModerationStatus(row.moderation_status),
  };
}

function remoteNearbyDogAreaToModel(row: RemoteNearbyDogAreaRow): NearbyDogAreaModel {
  const kind = normalizePlaceKind(row.type);
  const distanceKm = typeof row.distance_km === 'number' ? row.distance_km : 0;
  const latitude = typeof row.lat === 'number' ? row.lat : 0;
  const longitude = typeof row.lng === 'number' ? row.lng : 0;
  const geocodingStatus = metadataText(row.metadata, 'geocodingStatus') ?? 'unknown';
  const address = row.address ?? metadataText(row.metadata, 'address') ?? 'Indirizzo in verifica';

  return {
    id: row.id,
    name: row.name,
    kind,
    area: row.area_name ?? row.city_name ?? 'Venezia-Mestre',
    distanceLabel: `${distanceKm.toFixed(2).replace('.', ',')} km`,
    description: row.description ?? `Area cani ufficiale. Indirizzo: ${address}`,
    tags: row.tags?.length ? row.tags : ['area cani', 'ufficiale'],
    scoreLabel: 'vicina a te',
    icon: iconForPlaceKind(kind),
    moderationStatus: normalizeModerationStatus(row.moderation_status),
    addressLabel: address,
    distanceKm,
    latitude,
    longitude,
    geocodingStatus,
  };
}

function fallbackNearbyDogAreas(message: string, errorMessage?: string): NearbyDogAreasResult {
  const areas = demoPlaces
    .filter((place) => place.kind === 'dog_area')
    .map((place, index) => ({
      ...place,
      addressLabel: 'Demo locale: indirizzo non live',
      distanceKm: index + 1,
      latitude: 0,
      longitude: 0,
      geocodingStatus: 'fallback_demo',
    }));

  return {
    source: 'fallback',
    areas,
    message,
    errorMessage,
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
      .select('id, slug, name, type, tags, description, moderation_status, source, metadata, city_areas(name), cities(name)')
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
  } catch (error) {
    return {
      source: 'fallback',
      places: demoPlaces,
      message: 'Errore runtime durante la lettura luoghi: uso dati demo locali.',
      errorMessage: normalizeError(error),
    };
  }
}

export async function fetchNearbyDogAreas(params: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  limit?: number;
}): Promise<NearbyDogAreasResult> {
  const client = getSupabaseClient();

  if (!hasSupabaseConfig || !client) {
    return fallbackNearbyDogAreas('Supabase non configurato: ricerca nel raggio disponibile solo con backend live.');
  }

  try {
    const { data, error } = await client.rpc('search_dog_areas_nearby', {
      p_lat: params.latitude,
      p_lng: params.longitude,
      p_radius_km: params.radiusKm,
      p_limit: params.limit ?? 50,
    });

    if (error) {
      return fallbackNearbyDogAreas(
        'Ricerca nel raggio non ancora disponibile: applica la migration 0007 su Supabase.',
        normalizeError(error),
      );
    }

    const areas = ((data ?? []) as RemoteNearbyDogAreaRow[]).map(remoteNearbyDogAreaToModel);

    return {
      source: 'supabase',
      areas,
      message: areas.length
        ? `${areas.length} area/e cani trovata/e nel raggio selezionato.`
        : 'Nessuna area cani geocodificata nel raggio selezionato.',
    };
  } catch (error) {
    return fallbackNearbyDogAreas(
      'Errore runtime durante la ricerca nel raggio: uso fallback controllato.',
      normalizeError(error),
    );
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

  const firstError =
    appConfig.errorMessage ??
    featureFlags.errorMessage ??
    places.errorMessage ??
    walkPlans.errorMessage ??
    presences.errorMessage ??
    lostDogAlerts.errorMessage ??
    dangerReports.errorMessage;

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
