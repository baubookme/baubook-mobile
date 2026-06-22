import { hasSupabaseConfig } from '../lib/env';
import { getSupabaseClient } from '../lib/supabase';
import { normalizeError } from './authAccount';

export interface SponsoredSlotModel {
  id: string;
  placement: string;
  sponsorName: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string | null;
  status: 'draft' | 'active' | 'paused' | 'archived';
  startsAt: string | null;
  endsAt: string | null;
  metadata: Record<string, unknown>;
}

interface RemoteSponsoredSlotRow {
  id: string;
  placement: string;
  sponsor_name: string;
  title: string;
  body: string;
  cta_label: string;
  cta_url: string | null;
  status: SponsoredSlotModel['status'];
  starts_at: string | null;
  ends_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface AccountDeletionRequestInput {
  userId: string;
  profileId?: string | null;
  email?: string | null;
  reason?: string | null;
}

export interface AccountDeletionRequestResult {
  id: string;
  status: string;
  requestedAt: string;
}

const demoSponsoredSlots: SponsoredSlotModel[] = [
  {
    id: 'demo-sponsored-setup',
    placement: 'setup',
    sponsorName: 'BauBook Partner Beta',
    title: 'Slot sponsor nativo pronto',
    body: 'Questo spazio potra ospitare toelettatori, pet shop, veterinari e servizi locali senza SDK ads e senza tracking cross-app.',
    ctaLabel: 'Sponsor disclosure',
    ctaUrl: null,
    status: 'active',
    startsAt: null,
    endsAt: null,
    metadata: { source: 'fallback', tracking: 'none' },
  },
];

function remoteSponsoredSlotToModel(row: RemoteSponsoredSlotRow): SponsoredSlotModel {
  return {
    id: row.id,
    placement: row.placement,
    sponsorName: row.sponsor_name,
    title: row.title,
    body: row.body,
    ctaLabel: row.cta_label,
    ctaUrl: row.cta_url,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    metadata: row.metadata ?? {},
  };
}

export async function fetchActiveSponsoredSlots(placement = 'setup'): Promise<SponsoredSlotModel[]> {
  const client = getSupabaseClient();
  if (!hasSupabaseConfig || !client) {
    return demoSponsoredSlots.filter((slot) => slot.placement === placement);
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from('sponsored_slots')
    .select('id, placement, sponsor_name, title, body, cta_label, cta_url, status, starts_at, ends_at, metadata')
    .eq('placement', placement)
    .eq('status', 'active')
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    return demoSponsoredSlots.filter((slot) => slot.placement === placement);
  }

  const slots = ((data ?? []) as RemoteSponsoredSlotRow[]).map(remoteSponsoredSlotToModel);
  return slots.length ? slots : demoSponsoredSlots.filter((slot) => slot.placement === placement);
}

export async function requestAccountDeletion(input: AccountDeletionRequestInput): Promise<AccountDeletionRequestResult> {
  const client = getSupabaseClient();
  if (!hasSupabaseConfig || !client) {
    throw new Error('Supabase non configurato: richiesta cancellazione non inviata.');
  }

  if (!input.userId) {
    throw new Error('Utente non disponibile: effettua il login prima di richiedere la cancellazione account.');
  }

  const existingRequest = await fetchPendingAccountDeletionRequest(input.userId);
  if (existingRequest) {
    return existingRequest;
  }

  const { data, error } = await client
    .from('account_deletion_requests')
    .insert({
      user_id: input.userId,
      profile_id: input.profileId ?? null,
      email: input.email ?? null,
      reason: input.reason?.trim() || null,
      status: 'requested',
      metadata: {
        source: 'app',
        requested_from: 'setup_account',
      },
    })
    .select('id, status, requested_at')
    .single();

  if (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
    if (errorCode === '23505') {
      const pendingRequest = await fetchPendingAccountDeletionRequest(input.userId);
      if (pendingRequest) {
        return pendingRequest;
      }
    }

    throw new Error(normalizeError(error));
  }

  const row = data as { id: string; status: string; requested_at: string };
  return {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at,
  };
}

export async function fetchPendingAccountDeletionRequest(userId: string): Promise<AccountDeletionRequestResult | null> {
  const client = getSupabaseClient();
  if (!hasSupabaseConfig || !client) {
    return null;
  }

  if (!userId) {
    return null;
  }

  const { data, error } = await client
    .from('account_deletion_requests')
    .select('id, status, requested_at')
    .eq('user_id', userId)
    .eq('status', 'requested')
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(normalizeError(error));
  }

  if (!data) {
    return null;
  }

  const row = data as { id: string; status: string; requested_at: string };
  return { id: row.id, status: row.status, requestedAt: row.requested_at };
}
