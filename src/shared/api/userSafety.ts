import { getSupabaseClient } from '../lib/supabase';
import { normalizeError } from './authAccount';

export type ReportableBauBookTarget =
  | 'lost_dog_alert'
  | 'danger_report'
  | 'lost_dog_sighting'
  | 'walk_plan'
  | 'presence_session'
  | 'dog_profile';

export type BauBookReportReason =
  | 'spam'
  | 'abuse'
  | 'harassment'
  | 'false_alert'
  | 'dangerous_content'
  | 'privacy_violation'
  | 'scam'
  | 'inappropriate'
  | 'other';

export interface ReportBauBookContentResult {
  alreadyReported: boolean;
  reportId: string | null;
}

export interface BlockProfileResult {
  alreadyBlocked: boolean;
  blockedProfileId: string | null;
}

function assertSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }
  return client;
}

function normalizeBooleanPayload(data: unknown, key: string): boolean {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const payload = data as Record<string, unknown>;
    return Boolean(payload[key]);
  }
  return false;
}

function normalizeStringPayload(data: unknown, key: string): string | null {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const value = (data as Record<string, unknown>)[key];
    return typeof value === 'string' && value.trim().length ? value : null;
  }
  return null;
}

export async function reportBauBookContent(
  targetType: ReportableBauBookTarget,
  targetId: string,
  reason: BauBookReportReason = 'abuse',
  description = 'Segnalazione abuso da app BauBook.',
): Promise<ReportBauBookContentResult> {
  if (!targetId) {
    throw new Error('Contenuto da segnalare mancante.');
  }

  const client = assertSupabaseClient();
  const { data, error } = await client.rpc('report_baubook_content', {
    target_type_input: targetType,
    target_id_input: targetId,
    reason_input: reason,
    description_input: description,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }

  return {
    alreadyReported: normalizeBooleanPayload(data, 'alreadyReported'),
    reportId: normalizeStringPayload(data, 'reportId'),
  };
}

export async function blockProfile(profileId: string): Promise<BlockProfileResult> {
  if (!profileId) {
    throw new Error('Profilo da bloccare mancante.');
  }

  const client = assertSupabaseClient();
  const { data, error } = await client.rpc('block_baubook_profile', {
    blocked_profile_id_input: profileId,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }

  return {
    alreadyBlocked: normalizeBooleanPayload(data, 'alreadyBlocked'),
    blockedProfileId: normalizeStringPayload(data, 'blockedProfileId') ?? profileId,
  };
}

export async function unblockProfile(profileId: string): Promise<void> {
  if (!profileId) {
    return;
  }

  const client = assertSupabaseClient();
  const { error } = await client.rpc('unblock_baubook_profile', {
    blocked_profile_id_input: profileId,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }
}

export async function fetchBlockedProfileIds(currentProfileId?: string | null): Promise<Set<string>> {
  if (!currentProfileId) {
    return new Set();
  }

  const client = getSupabaseClient();
  if (!client) {
    return new Set();
  }

  const { data, error } = await client
    .from('blocks')
    .select('blocked_profile_id')
    .eq('blocker_id', currentProfileId);

  if (error) {
    console.warn('BauBook blocks fetch failed', error);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row: { blocked_profile_id?: string | null }) => row.blocked_profile_id)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );
}
