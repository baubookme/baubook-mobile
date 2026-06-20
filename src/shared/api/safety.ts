import { baubookImages } from '../assets/images';
import { demoAlerts } from '../data/mockData';
import { getSupabaseClient } from '../lib/supabase';
import type { AlertModel, AlertStatus } from '../types/domain';
import { normalizeError } from './authAccount';

export type SafetyBoardSource = 'supabase' | 'fallback';
export type DangerType = 'suspected_poison' | 'loose_dog' | 'unsafe_area' | 'traffic' | 'broken_fence' | 'other';
export type SightingType = 'seen' | 'maybe_seen' | 'recovered';

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
  severity: number | null;
  dangerType: DangerType | null;
  expiresAtIso: string;
  createdAtIso: string;
  isMine: boolean;
  moderationStatus: string;
  radiusLabel: string;
  actionHint: string;
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
  placeId: string;
  sightingType: SightingType;
  note: string;
  disclaimerAccepted: boolean;
}

interface RelatedNameRow {
  name?: string | null;
}

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
  const dogName = dog?.name ?? 'Cane BauBook';
  const placeName = row.location_label?.trim() || place?.name || 'zona indicativa';

  return {
    id: row.id,
    type: 'lost_dog',
    title: `Mi sono perso! — ${dogName}`,
    area: placeName,
    status: row.status,
    ttlLabel: formatExpiry(row.expires_at),
    description: row.description ?? 'Alert smarrimento senza dettagli pubblici. Usa gli avvistamenti con prudenza.',
    icon: baubookImages.icons.lostDog,
    source: 'supabase',
    ownerId: row.owner_id,
    reporterId: null,
    dogId: row.dog_id,
    dogName,
    ownerName: profile?.display_name ?? 'Umano BauBook',
    reporterName: '',
    placeId: row.source_place_id,
    placeName,
    severity: null,
    dangerType: null,
    expiresAtIso: row.expires_at,
    createdAtIso: row.created_at,
    isMine: Boolean(currentProfileId && row.owner_id === currentProfileId),
    moderationStatus: row.moderation_status,
    radiusLabel: `${row.radius_m ?? 350} m indicativi`,
    actionHint: 'Non inseguire il cane e non entrare in proprietà private. Invia un avvistamento se hai informazioni utili.',
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
    dogName: null,
    ownerName: '',
    reporterName: profile?.display_name ?? 'Umano BauBook',
    placeId: row.source_place_id,
    placeName,
    severity: row.severity,
    dangerType,
    expiresAtIso: row.expires_at,
    createdAtIso: row.created_at,
    isMine: Boolean(currentProfileId && row.reporter_id === currentProfileId),
    moderationStatus: row.moderation_status,
    radiusLabel: `${row.radius_m ?? 250} m indicativi`,
    actionHint: dangerHints[dangerType],
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
    dogName: danger ? null : 'Spritz demo',
    ownerName: danger ? '' : 'Demo BauBook',
    reporterName: danger ? 'Demo BauBook' : '',
    placeId: null,
    placeName: alert.area,
    severity: danger ? 2 : null,
    dangerType: danger ? 'suspected_poison' : null,
    expiresAtIso: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    createdAtIso: new Date().toISOString(),
    isMine: false,
    moderationStatus: 'approved',
    radiusLabel: 'area demo',
    actionHint: danger ? dangerHints.suspected_poison : 'Flusso demo: crea alert, raccogli avvistamenti, chiudi quando risolto.',
  };
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

    const [lostResult, dangerResult] = await Promise.all([
      client
        .from('lost_dog_alerts')
        .select('id, dog_id, owner_id, source_place_id, location_mode, location_label, location_latitude, location_longitude, manual_address, description, status, moderation_status, expires_at, created_at, last_seen_at, radius_m, dogs(name), profiles(display_name), places:source_place_id(name)')
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

    const lost = ((lostResult.data ?? []) as RemoteLostAlertRow[]).map((row) => remoteLostToModel(row, currentProfileId));
    const dangers = ((dangerResult.data ?? []) as RemoteDangerReportRow[]).map((row) => remoteDangerToModel(row, currentProfileId));
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

  const { error } = await client.rpc('create_lost_dog_sighting', {
    alert_id_input: input.alertId,
    place_id_input: input.placeId,
    sighting_type_input: input.sightingType,
    note_input: input.note,
    disclaimer_accepted_input: input.disclaimerAccepted,
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

export async function reportSafetyContent(targetType: 'lost_dog_alert' | 'danger_report', targetId: string, description?: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { error } = await client.rpc('report_safety_content', {
    target_type_input: targetType,
    target_id_input: targetId,
    reason_input: 'false_alert',
    description_input: description ?? 'Segnalazione abuso/falso alert da app beta.',
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}
