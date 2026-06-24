import { getSupabaseClient } from '../lib/supabase';
import { normalizeError } from './authAccount';

export type AdminModerationRole = 'owner' | 'admin' | 'moderator';
export type AdminReportStatus = 'open' | 'reviewing' | 'actioned' | 'resolved' | 'dismissed';
export type AdminTargetVisibilityMode = 'hide' | 'restore';

export interface AdminModerationStatus {
  isAdmin: boolean;
  role: AdminModerationRole | null;
  profileId?: string | null;
  displayName?: string | null;
}

export interface AdminModerationReport {
  id: string;
  reporterId: string | null;
  reporterName: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: AdminReportStatus | string;
  createdAt: string;
  updatedAt: string;
  targetLabel: string;
  targetStatus: string | null;
  targetModerationStatus: string | null;
  targetLocationLabel: string | null;
  targetDescription: string | null;
  targetOwnerId: string | null;
  targetOwnerName: string | null;
  closureAction: string | null;
  closureActionAt: string | null;
}

interface AdminModerationResponse {
  ok?: boolean;
  isAdmin?: boolean;
  role?: AdminModerationRole | null;
  profileId?: string | null;
  displayName?: string | null;
  reports?: AdminModerationReport[];
  error?: string;
}

async function readFunctionError(error: unknown): Promise<string> {
  const fallback = normalizeError(error);
  const context = (error as { context?: unknown } | null)?.context;

  if (context && typeof Response !== 'undefined' && context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: unknown; message?: unknown };
      const message = String(payload.error ?? payload.message ?? '').trim();
      if (message) {
        return message;
      }
    } catch (_jsonError) {
      try {
        const text = await context.clone().text();
        if (text.trim()) {
          return text.trim();
        }
      } catch (_textError) {
        // Fall back below.
      }
    }
  }

  return fallback;
}

async function invokeAdminModeration(body: Record<string, unknown>): Promise<AdminModerationResponse> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase non configurato.');
  }

  const { data, error } = await client.functions.invoke('admin-moderation', { body });
  if (error) {
    throw new Error(await readFunctionError(error));
  }

  const payload = (data ?? {}) as AdminModerationResponse;
  if (payload.ok === false) {
    throw new Error(payload.error || 'Operazione admin non riuscita.');
  }

  return payload;
}

export async function fetchAdminModerationStatus(): Promise<AdminModerationStatus> {
  const payload = await invokeAdminModeration({ action: 'status' });
  return {
    isAdmin: Boolean(payload.isAdmin),
    role: payload.role ?? null,
    profileId: payload.profileId ?? null,
    displayName: payload.displayName ?? null,
  };
}

export async function fetchAdminModerationReports(includeClosed = false): Promise<AdminModerationReport[]> {
  const payload = await invokeAdminModeration({ action: 'list_reports', includeClosed, limit: 80 });
  return Array.isArray(payload.reports) ? payload.reports : [];
}

export async function updateAdminModerationReportStatus(
  reportId: string,
  status: AdminReportStatus,
  note?: string,
): Promise<void> {
  await invokeAdminModeration({
    action: 'set_report_status',
    reportId,
    status,
    note: note?.trim() || null,
  });
}

export async function updateAdminModerationTargetVisibility(
  report: Pick<AdminModerationReport, 'id' | 'targetType' | 'targetId'>,
  mode: AdminTargetVisibilityMode,
  note?: string,
): Promise<void> {
  await invokeAdminModeration({
    action: 'set_target_visibility',
    reportId: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    mode,
    note: note?.trim() || null,
  });
}
