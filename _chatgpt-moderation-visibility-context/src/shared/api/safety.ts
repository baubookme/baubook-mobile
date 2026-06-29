import { baubookImages } from '../assets/images';
import { demoAlerts } from '../data/mockData';
import { getSupabaseClient } from '../lib/supabase';
import type { AlertModel, AlertStatus } from '../types/domain';
import { normalizeError } from './authAccount';
import { fetchBlockedProfileIds } from './userSafety';

export type SafetyBoardSource = 'supabase' | 'fallback';
export type DangerType = 'suspected_poison' | 'loose_dog' | 'unsafe_area' | 'traffic' | 'broken_fence' | 'other';
export type SightingType = 'seen' | 'maybe_seen' | 'recovered';

export interface LostDogSightingModel {
  alertId: string;
  sightingId: string;
  reporterId: string | null;
  reporterName: string;
  sightingType: SightingType;
  note: string | null;
  sightingAtIso: string;
  updatedAtIso: string;
  locationMode: 'current' | 'manual';
  locationLabel: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  manualAddress: string | null;
  isMine: boolean;
  isBlockedByMe: boolean;
}

export interface SafetyAlertModel extends AlertModel {
  source: SafetyBoardSource;
  ownerId: string | null;
  reporterId: string | null;
  dogId: string | null;
  dogName: string | null;
  ownerName: string;
  reporterName: string;
  placeId: string | null;
  placeName: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  severity: number | null;
  dangerType: DangerType | null;
  expiresAtIso: string;
  createdAtIso: string;
  isMine: boolean;
  isBlockedByMe: boolean;
  hasMyAbuseReport: boolean;
  moderationStatus: string;
  radiusLabel: string;
  dogAvatarUrl: string | null;
  actionHint: string;
  sightings: LostDogSightingModel[];
}

export interface SafetyBoardResult {
  source: SafetyBoardSource;
  alerts: SafetyAlertModel[];
  message: string;
  errorMessage?: string;
}

export interface CreateLostDogAlertInput {
  dogId: string;
  placeId?: string | null;
  description: string;
  lastSeenMinutesAgo: number;
  ttlHours: number;
  disclaimerAccepted: boolean;
  locationMode?: 'current' | 'manual';
  locationLabel?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  manualAddress?: string | null;
}

export interface CreateDangerReportInput {
  placeId?: string | null;
  dangerType: DangerType;
  description: string;
  severity: number;
  ttlHours: number;
  disclaimerAccepted: boolean;
  locationMode?: 'current' | 'manual';
  locationLabel?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  manualAddress?: string | null;
}

export interface CreateSightingInput {
  alertId: string;
  sightingType: SightingType;
  note: string;
  disclaimerAccepted: boolean;
  locationMode?: 'current' | 'manual';
  locationLabel?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  manualAddress?: string | null;
}

interface RelatedNameRow { name?: string | null; avatar_url?: string | null; }

interface RelatedProfileRow {
  id?: string | null;
  display_name?: string | null;
}

interface RemoteLostAlertRow {
  id: string;
  dog_id: string | null;
  owner_id: string | null;
  source_place_id: string | null;
  location_mode?: string | null;
  location_label?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  manual_address?: string | null;
  description: string | null;
  status: AlertStatus;
  moderation_status: string;
  expires_at: string;
  created_at: string;
  last_seen_at: string;
  radius_m: number | null;
  dogs?: RelatedNameRow | RelatedNameRow[] | null;
  profiles?: RelatedProfileRow | RelatedProfileRow[] | null;
  places?: RelatedNameRow | RelatedNameRow[] | null;
}

interface RemoteDangerReportRow {
  id: string;
  reporter_id: string | null;
  source_place_id: string | null;
  danger_type: string;
  description: string | null;
  severity: number;
  status: string;
  moderation_status: string;
  expires_at: string;
  created_at: string;
  radius_m: number | null;
  profiles?: RelatedProfileRow | RelatedProfileRow[] | null;
  places?: RelatedNameRow | RelatedNameRow[] | null;
  location_mode: "current" | "manual" | null;
  location_label: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  manual_address: string | null;
}


interface RemoteLostDogSightingRow {
  alert_id: string;
  sighting_id: string;
  reporter_id: string | null;
  reporter_name: string | null;
  sighting_type: string | null;
  note: string | null;
  sighting_at: string | null;
  updated_at: string | null;
  location_mode: string | null;
  location_label: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  manual_address: string | null;
  is_mine: boolean | null;
}

interface RemoteSafetyReportTargetRow {
  target_type: string;
  target_id: string;
}

const dangerLabels: Record<DangerType, string> = {
  suspected_poison: 'Bocconi sospetti',
  loose_dog: 'Animale vagante',
  unsafe_area: 'Zona poco sicura',
  traffic: 'Traffico / strada rischiosa',
  broken_fence: 'Recinzione rotta',
  other: 'Altro pericolo',
};

const dangerHints: Record<DangerType, string> = {
  suspected_poison: 'Non toccare nulla, tieni il cane lontano e valuta una segnalazione alle autorità competenti.',
  loose_dog: 'Non inseguire o bloccare l’animale: procedi con prudenza e resta a distanza.',
  unsafe_area: 'Evita la zona o osserva dettagli utili senza indicare persone o indirizzi privati.',
  traffic: 'Sii prudente e usa un guinzaglio: non sostituisce segnalazioni formali o interventi urgenti.',
  broken_fence: 'Fai attenzione prima di liberare il tuo amico e verifica che la segnalazione sia valida.',
  other: 'Descrivi solo fatti osservati e non pubblicare accuse verso persone identificabili.',
};

export function dangerIconForType(type: DangerType) {
  switch (type) {
    case 'suspected_poison':
      return baubookImages.dangerCircles.suspectedPoison;
    case 'loose_dog':
      return baubookImages.dangerCircles.looseDog;
    case 'unsafe_area':
      return baubookImages.dangerCircles.unsafeArea;
    case 'traffic':
      return baubookImages.dangerCircles.traffic;
    case 'broken_fence':
      return baubookImages.dangerCircles.brokenFence;
    case 'other':
    default:
      return baubookImages.dangerCircles.other;
  }
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }
  return Array.isArray(value) ? value[0] ?? null : value;
}

function publicProfileName(value: string | null | undefined, fallback = 'Profilo ⁉️'): string {
  const raw = value?.trim();
  if (!raw) {
    return fallback;
  }

  if (raw.includes('@')) {
    const localPart = raw.split('@')[0]?.trim();
    return localPart && localPart.length >= 2 ? localPart : fallback;
  }

  return raw;
}

function formatExpiry(iso: string): string {
  const expiresAt = new Date(iso);
  const deltaMs = expiresAt.getTime() - Date.now();
  if (Number.isNaN(expiresAt.getTime()) || deltaMs <= 0) {
    return 'scaduto';
  }

  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 60) {
    return `scade tra ${Math.max(1, minutes)} min`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `scade tra ${hours} h`;
  }

  return `scade il ${expiresAt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`;
}

function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'ora non disponibile';
  }
  return date.toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
}

function normalizeDangerType(value: string): DangerType {
  switch (value) {
    case 'suspected_poison':
    case 'loose_dog':
    case 'unsafe_area':
    case 'traffic':
    case 'broken_fence':
    case 'other':
      return value;
    default:
      return 'other';
  }
}

function remoteLostToModel(row: RemoteLostAlertRow, currentProfileId?: string | null): SafetyAlertModel {
  const dog = firstRelation(row.dogs);
  const profile = firstRelation(row.profiles);
  const place = firstRelation(row.places);
  const dogName = dog?.name ?? '';
  const placeName = row.location_label?.trim() || place?.name || 'zona indicativa';

  return {
    id: row.id,
    type: 'lost_dog',
    title: `Mi sono perso! — ${dogName} 🐶`,
    area: placeName,
    status: row.status,
    ttlLabel: formatExpiry(row.expires_at),
    description: row.description ?? 'Alert smarrimento senza dettagli pubblici. Usa gli avvistamenti con prudenza.',
    icon: baubookImages.icons.lostDog,
    source: 'supabase',
    ownerId: row.owner_id,
    reporterId: null,
    dogId: row.dog_id,
    dogName, dogAvatarUrl: dog?.avatar_url ?? null, ownerName: publicProfileName(profile?.display_name),
    reporterName: '',
    placeId: row.source_place_id,
    placeName,
    locationLatitude: row.location_latitude ?? null,
    locationLongitude: row.location_longitude ?? null,
    severity: null,
    dangerType: null,
    expiresAtIso: row.expires_at,
    createdAtIso: row.created_at,
    isMine: Boolean(currentProfileId && row.owner_id === currentProfileId),
    isBlockedByMe: false,
    hasMyAbuseReport: false,
    moderationStatus: row.moderation_status,
    radiusLabel: `${row.radius_m ?? 350} m indicativi`,
    actionHint: 'Non inseguire il cane e non entrare in proprietà private. Invia un avvistamento se hai informazioni utili.',
    sightings: [],
  };
}

function remoteDangerToModel(row: RemoteDangerReportRow, currentProfileId?: string | null): SafetyAlertModel {
  const profile = firstRelation(row.profiles);
  const place = firstRelation(row.places);
  const dangerType = normalizeDangerType(row.danger_type);
  const placeName = row.location_label?.trim() || place?.name || 'zona indicativa';
  const alertStatus: AlertStatus = row.status === 'active' || row.status === 'confirmed' ? 'active' : row.status === 'expired' ? 'expired' : 'resolved';

  return {
    id: row.id,
    type: 'danger',
    title: `Pericolo! — ${dangerLabels[dangerType]}`,
    area: placeName,
    status: alertStatus,
    ttlLabel: formatExpiry(row.expires_at),
    description: row.description ?? 'Segnalazione temporanea senza dettagli aggiuntivi.',
    icon: dangerIconForType(dangerType),
    source: 'supabase',
    ownerId: null,
    reporterId: row.reporter_id,
    dogId: null,
    dogName: null, dogAvatarUrl: null, ownerName: '',
    reporterName: publicProfileName(profile?.display_name),
    placeId: row.source_place_id,
    placeName,
    locationLatitude: row.location_latitude ?? null,
    locationLongitude: row.location_longitude ?? null,
    severity: row.severity,
    dangerType,
    expiresAtIso: row.expires_at,
    createdAtIso: row.created_at,
    isMine: Boolean(currentProfileId && row.reporter_id === currentProfileId),
    isBlockedByMe: false,
    hasMyAbuseReport: false,
    moderationStatus: row.moderation_status,
    radiusLabel: `${row.radius_m ?? 250} m indicativi`,
    actionHint: dangerHints[dangerType],
    sightings: [],
  };
}

function demoToSafety(alert: AlertModel): SafetyAlertModel {
  const danger = alert.type === 'danger';
  return {
    ...alert,
    icon: danger ? dangerIconForType('suspected_poison') : alert.icon,
    source: 'fallback',
    ownerId: null,
    reporterId: null,
    dogId: null,
    dogName: danger ? null : 'Spritz demo', dogAvatarUrl: null, ownerName: danger ? '' : 'Demo BauBook',
    reporterName: danger ? 'Demo BauBook' : '',
    placeId: null,
    placeName: alert.area,
    locationLatitude: null,
    locationLongitude: null,
    severity: danger ? 2 : null,
    dangerType: danger ? 'suspected_poison' : null,
    expiresAtIso: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    createdAtIso: new Date().toISOString(),
    isMine: false,
    isBlockedByMe: false,
    hasMyAbuseReport: false,
    moderationStatus: 'approved',
    radiusLabel: 'area demo',
    actionHint: danger ? dangerHints.suspected_poison : 'Flusso demo: crea alert, raccogli avvistamenti, chiudi quando risolto.',
    sightings: [],
  };
}


function targetKey(targetType: 'lost_dog_alert' | 'danger_report', targetId: string): string {
  return `${targetType}:${targetId}`;
}

function normalizeSightingType(value: string | null | undefined): SightingType {
  switch (value) {
    case 'maybe_seen':
    case 'recovered':
    case 'seen':
      return value;
    default:
      return 'seen';
  }
}

function remoteSightingToModel(row: RemoteLostDogSightingRow): LostDogSightingModel {
  const sightingAt = row.sighting_at ?? row.updated_at ?? new Date().toISOString();
  const updatedAt = row.updated_at ?? sightingAt;
  const locationLabel = row.location_label?.trim() || row.manual_address?.trim() || 'Posizione condivisa';

  return {
    alertId: row.alert_id,
    sightingId: row.sighting_id,
    reporterId: row.reporter_id,
    reporterName: publicProfileName(row.reporter_name),
    sightingType: normalizeSightingType(row.sighting_type),
    note: row.note?.trim() || null,
    sightingAtIso: sightingAt,
    updatedAtIso: updatedAt,
    locationMode: row.location_mode === 'manual' ? 'manual' : 'current',
    locationLabel,
    locationLatitude: row.location_latitude,
    locationLongitude: row.location_longitude,
    manualAddress: row.manual_address?.trim() || null,
    isMine: Boolean(row.is_mine),
    isBlockedByMe: false,
  };
}

async function fetchMyReportKeys(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  currentProfileId: string | null | undefined,
  alerts: Array<{ id: string; type: 'lost_dog' | 'danger' }>,
): Promise<Set<string>> {
  const keys = new Set<string>();
  if (!currentProfileId || !alerts.length) {
    return keys;
  }

  const targetIds = alerts.map((alert) => alert.id);
  const { data, error } = await client
    .from('reports')
    .select('target_type, target_id')
    .eq('reporter_id', currentProfileId)
    .in('target_id', targetIds)
    .in('target_type', ['lost_dog_alert', 'danger_report']);

  if (error) {
    return keys;
  }

  ((data ?? []) as RemoteSafetyReportTargetRow[]).forEach((row) => {
    if (row.target_type && row.target_id) {
      keys.add(targetKey(row.target_type as 'lost_dog_alert' | 'danger_report', row.target_id));
    }
  });

  return keys;
}

async function fetchSightingsByAlert(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>,
  alertIds: string[],
  currentProfileId?: string | null,
  blockedProfileIds: Set<string> = new Set(),
): Promise<Map<string, LostDogSightingModel[]>> {
  const sightingsByAlert = new Map<string, LostDogSightingModel[]>();
  if (!alertIds.length) {
    return sightingsByAlert;
  }

  const { data, error } = await client.rpc('fetch_lost_dog_sightings_for_alerts', {
    alert_ids_input: alertIds,
  });

  if (error) {
    return sightingsByAlert;
  }

  ((data ?? []) as RemoteLostDogSightingRow[])
    .forEach((row) => {
    const sighting = {
      ...remoteSightingToModel(row),
      isMine: Boolean(row.is_mine || (currentProfileId && row.reporter_id === currentProfileId)),
      isBlockedByMe: Boolean(row.reporter_id && blockedProfileIds.has(row.reporter_id)),
    };
    const current = sightingsByAlert.get(sighting.alertId) ?? [];
    current.push(sighting);
    sightingsByAlert.set(sighting.alertId, current);
  });

  sightingsByAlert.forEach((items, alertId) => {
    sightingsByAlert.set(
      alertId,
      items
        .sort((a, b) => new Date(b.sightingAtIso).getTime() - new Date(a.sightingAtIso).getTime())
        .slice(0, 5),
    );
  });

  return sightingsByAlert;
}

async function expireStaleAlerts(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  await client.rpc('expire_stale_safety_alerts');
}

export async function fetchSafetyBoard(currentProfileId?: string | null): Promise<SafetyBoardResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      source: 'fallback',
      alerts: demoAlerts.map(demoToSafety),
      message: 'Supabase non configurato: uso alert demo locali.',
    };
  }

  try {
    await expireStaleAlerts();
    const nowIso = new Date().toISOString();
    const blockedProfileIds = await fetchBlockedProfileIds(currentProfileId);

    const [lostResult, dangerResult] = await Promise.all([
      client
        .from('lost_dog_alerts')
        .select('id, dog_id, owner_id, source_place_id, location_mode, location_label, location_latitude, location_longitude, manual_address, description, status, moderation_status, expires_at, created_at, last_seen_at, radius_m, dogs(name, avatar_url), profiles(display_name), places:source_place_id(name)')
        .eq('status', 'active')
        .eq('moderation_status', 'approved')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(20),
      client
        .from('danger_reports')
        .select('id, reporter_id, source_place_id, location_mode, location_label, location_latitude, location_longitude, manual_address, danger_type, description, severity, status, moderation_status, expires_at, created_at, radius_m, profiles(display_name), places:source_place_id(name)')
        .in('status', ['active', 'confirmed'])
        .in('moderation_status', ['approved', 'pending'])
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (lostResult.error || dangerResult.error) {
      return {
        source: 'fallback',
        alerts: demoAlerts.map(demoToSafety),
        message: 'Lettura safety Supabase non disponibile: uso demo locali.',
        errorMessage: normalizeError(lostResult.error ?? dangerResult.error),
      };
    }

    const rawLost = (lostResult.data ?? []) as RemoteLostAlertRow[];
    const rawDangers = (dangerResult.data ?? []) as RemoteDangerReportRow[];

    const baseLost = rawLost.map((row) => ({
      ...remoteLostToModel(row, currentProfileId),
      isBlockedByMe: Boolean(row.owner_id && blockedProfileIds.has(row.owner_id)),
    }));
    const baseDangers = rawDangers.map((row) => ({
      ...remoteDangerToModel(row, currentProfileId),
      isBlockedByMe: Boolean(row.reporter_id && blockedProfileIds.has(row.reporter_id)),
    }));
    const baseAlerts = [...baseLost, ...baseDangers];

    const [reportKeys, sightingsByAlert] = await Promise.all([
      fetchMyReportKeys(client, currentProfileId, baseAlerts),
      fetchSightingsByAlert(client, baseLost.map((alert) => alert.id), currentProfileId, blockedProfileIds),
    ]);

    const lost = baseLost.map((alert) => ({
      ...alert,
      hasMyAbuseReport: reportKeys.has(targetKey('lost_dog_alert', alert.id)),
      sightings: sightingsByAlert.get(alert.id) ?? [],
    }));
    const dangers = baseDangers.map((alert) => ({
      ...alert,
      hasMyAbuseReport: reportKeys.has(targetKey('danger_report', alert.id)),
      sightings: [],
    }));
    const alerts = [...lost, ...dangers].sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime());

    return {
      source: 'supabase',
      alerts,
      message: alerts.length
        ? `${lost.length} smarrimento/i e ${dangers.length} pericolo/i caricati.`
        : 'Niente da segnalare. 📓',
    };
  }
  catch (error) {
    return {
      source: 'fallback',
      alerts: demoAlerts.map(demoToSafety),
      message: 'Errore runtime safety: uso dati non disponibili.',
      errorMessage: normalizeError(error),
    };
  }
}

export function formatSafetyCreatedAt(iso: string): string {
  return formatCreatedAt(iso);
}

export function labelForDangerType(type: DangerType): string {
  return dangerLabels[type];
}

export function hintForDangerType(type: DangerType): string {
  return dangerHints[type];
}

export async function createLostDogAlert(input: CreateLostDogAlertInput): Promise<void> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('create_lost_dog_alert', {
    dog_id_input: input.dogId,
    place_id_input: input.placeId ?? null,
    description_input: input.description,
    last_seen_minutes_ago_input: input.lastSeenMinutesAgo,
    ttl_hours_input: input.ttlHours,
    disclaimer_accepted_input: input.disclaimerAccepted,
    location_mode_input: input.locationMode ?? 'current',
    location_label_input: input.locationLabel ?? null,
    location_latitude_input: input.locationLatitude ?? null,
    location_longitude_input: input.locationLongitude ?? null,
    manual_address_input: input.manualAddress ?? null,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function createDangerReport(input: CreateDangerReportInput): Promise<void> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('create_danger_report', {
    place_id_input: input.placeId ?? null,
    danger_type_input: input.dangerType,
    description_input: input.description,
    severity_input: input.severity,
    ttl_hours_input: input.ttlHours,
    disclaimer_accepted_input: input.disclaimerAccepted,
    location_mode_input: input.locationMode ?? 'current',
    location_label_input: input.locationLabel ?? null,
    location_latitude_input: input.locationLatitude ?? null,
    location_longitude_input: input.locationLongitude ?? null,
    manual_address_input: input.manualAddress ?? null,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function createLostDogSighting(input: CreateSightingInput): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('upsert_lost_dog_sighting', {
    alert_id_input: input.alertId,
    sighting_type_input: input.sightingType,
    note_input: input.note,
    disclaimer_accepted_input: input.disclaimerAccepted,
    location_mode_input: input.locationMode ?? 'current',
    location_label_input: input.locationLabel ?? null,
    location_latitude_input: input.locationLatitude ?? null,
    location_longitude_input: input.locationLongitude ?? null,
    manual_address_input: input.manualAddress ?? null,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function closeLostDogAlert(alertId: string, note?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('close_lost_dog_alert', {
    alert_id_input: alertId,
    close_status_input: 'resolved',
    note_input: note ?? 'Chiuso dal proprietario in app',
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function closeDangerReport(reportId: string, note?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('close_danger_report', {
    danger_report_id_input: reportId,
    close_status_input: 'dismissed',
    note_input: note ?? 'Dismesso dal segnalatore in app',
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function reportSafetyContent(
  targetType: 'lost_dog_alert' | 'danger_report',
  targetId: string,
  description?: string,
): Promise<{ alreadyReported: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { data, error } = await client.rpc('report_safety_content', {
    target_type_input: targetType,
    target_id_input: targetId,
    reason_input: 'false_alert',
    description_input: description ?? 'Segnalazione abuso/falso alert da app BauBook.',
  });

  if (error) {
    throw new Error(normalizeError(error));
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const value = data as { alreadyReported?: unknown; already_reported?: unknown };
    return { alreadyReported: Boolean(value.alreadyReported ?? value.already_reported) };
  }

  return { alreadyReported: false };
}



