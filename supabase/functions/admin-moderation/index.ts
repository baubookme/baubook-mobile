// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type AdminRole = 'owner' | 'admin' | 'moderator';

type AdminContext = {
  userId: string;
  profileId: string;
  displayName: string;
  role: AdminRole;
};

const OPEN_REPORT_STATUSES = ['open', 'reviewing'];
const CLOSED_REPORT_STATUSES = ['actioned', 'resolved', 'dismissed'];
const ALLOWED_REPORT_STATUSES = ['open', 'reviewing', 'actioned', 'resolved', 'dismissed'];
const REPORT_CLOSURE_ACTIONS = ['report_resolved', 'report_dismissed', 'report_actioned', 'content_hidden', 'content_restored'];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function sanitize(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeLimit(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 50;
  }
  return Math.max(1, Math.min(100, Math.floor(parsed)));
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function getSupabaseConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return null;
  }

  return {
    baseUrl: supabaseUrl.replace(/\/$/, ''),
    serviceRoleKey,
    anonKey,
  };
}

async function readAuthUser(request: Request): Promise<{ id?: string; email?: string } | null> {
  const token = getBearerToken(request);
  const config = getSupabaseConfig();

  if (!token || !config) {
    return null;
  }

  const response = await fetch(config.baseUrl + '/auth/v1/user', {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      apikey: config.anonKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  return await response.json().catch(() => null);
}

function restHeaders(prefer?: string) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Missing Supabase configuration');
  }

  const headers: Record<string, string> = {
    Authorization: 'Bearer ' + config.serviceRoleKey,
    apikey: config.serviceRoleKey,
    'Content-Type': 'application/json',
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  return headers;
}

function restUrl(table: string, params?: Record<string, string>): string {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Missing Supabase configuration');
  }

  const url = new URL(config.baseUrl + '/rest/v1/' + table);
  Object.entries(params ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function restGet(table: string, params?: Record<string, string>): Promise<unknown[]> {
  const response = await fetch(restUrl(table, params), {
    method: 'GET',
    headers: restHeaders(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `GET ${table} failed with ${response.status}`);
  }

  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function restPatch(table: string, params: Record<string, string>, body: Record<string, unknown>): Promise<unknown[]> {
  const response = await fetch(restUrl(table, params), {
    method: 'PATCH',
    headers: restHeaders('return=representation'),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `PATCH ${table} failed with ${response.status}`);
  }

  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function restPatchMinimal(table: string, params: Record<string, string>, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(restUrl(table, params), {
    method: 'PATCH',
    headers: restHeaders('return=minimal'),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `PATCH ${table} failed with ${response.status}`);
  }
}

async function restInsert(table: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(restUrl(table), {
    method: 'POST',
    headers: restHeaders('return=minimal'),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `POST ${table} failed with ${response.status}`);
  }
}

function inFilter(ids: string[]): string {
  return 'in.(' + ids.map((id) => '"' + id.replace(/"/g, '') + '"').join(',') + ')';
}

async function requireAdmin(request: Request): Promise<AdminContext | Response> {
  const user = await readAuthUser(request);
  if (!user?.id) {
    return jsonResponse({ ok: false, isAdmin: false, error: 'Not authenticated' }, 401);
  }

  const profiles = await restGet('profiles', {
    select: 'id,display_name,status,account_status',
    user_id: 'eq.' + user.id,
    limit: '1',
  });
  const profile = profiles[0] as { id?: string; display_name?: string; status?: string; account_status?: string } | undefined;

  if (!profile?.id || profile.status !== 'active' || profile.account_status !== 'active') {
    return jsonResponse({ ok: false, isAdmin: false, error: 'Active profile not found' }, 403);
  }

  const adminRows = await restGet('admin_users', {
    select: 'role,active',
    profile_id: 'eq.' + profile.id,
    active: 'eq.true',
    limit: '1',
  });
  const admin = adminRows[0] as { role?: AdminRole; active?: boolean } | undefined;

  if (!admin?.active || !admin.role) {
    return jsonResponse({ ok: true, isAdmin: false, role: null });
  }

  return {
    userId: user.id,
    profileId: profile.id,
    displayName: sanitize(profile.display_name) || 'Admin BauBook',
    role: admin.role,
  };
}

function normalizeTargetType(value: unknown): string {
  const raw = sanitize(value);
  if (['lost_dog_alert', 'danger_report', 'lost_dog_sighting', 'walk_plan', 'presence_session', 'dog_profile'].includes(raw)) {
    return raw;
  }
  return raw || 'unknown';
}

function buildTargetSummary(targetType: string, row: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!row) {
    return {
      targetLabel: targetType,
      targetStatus: null,
      targetModerationStatus: null,
      targetLocationLabel: null,
      targetDescription: null,
      targetOwnerId: null,
    };
  }

  const locationLabel = sanitize(row.location_label) || sanitize(row.manual_address) || null;
  const description = sanitize(row.description) || sanitize(row.note) || null;

  if (targetType === 'lost_dog_alert') {
    return {
      targetLabel: 'Smarrimento',
      targetStatus: row.status ?? null,
      targetModerationStatus: row.moderation_status ?? null,
      targetLocationLabel: locationLabel,
      targetDescription: description,
      targetOwnerId: sanitize(row.owner_id) || null,
    };
  }

  if (targetType === 'danger_report') {
    return {
      targetLabel: 'Pericolo: ' + (sanitize(row.danger_type) || 'altro'),
      targetStatus: row.status ?? null,
      targetModerationStatus: row.moderation_status ?? null,
      targetLocationLabel: locationLabel,
      targetDescription: description,
      targetOwnerId: sanitize(row.reporter_id) || null,
    };
  }

  if (targetType === 'lost_dog_sighting') {
    return {
      targetLabel: 'Avvistamento',
      targetStatus: row.status ?? null,
      targetModerationStatus: row.moderation_status ?? null,
      targetLocationLabel: locationLabel,
      targetDescription: description,
      targetOwnerId: sanitize(row.reporter_id) || null,
    };
  }

  if (targetType === 'walk_plan') {
    return {
      targetLabel: 'Passeggiata live',
      targetStatus: row.active === false ? 'inactive' : 'active',
      targetModerationStatus: row.moderation_status ?? null,
      targetLocationLabel: locationLabel,
      targetDescription: description,
      targetOwnerId: sanitize(row.owner_id) || null,
    };
  }

  if (targetType === 'presence_session') {
    return {
      targetLabel: 'Presenza live',
      targetStatus: row.active === false ? 'inactive' : 'active',
      targetModerationStatus: row.moderation_status ?? null,
      targetLocationLabel: locationLabel,
      targetDescription: description,
      targetOwnerId: sanitize(row.profile_id) || null,
    };
  }

  if (targetType === 'dog_profile') {
    return {
      targetLabel: 'Profilo cane: ' + (sanitize(row.name) || 'BauBook dog'),
      targetStatus: row.visibility ?? null,
      targetModerationStatus: row.moderation_status ?? null,
      targetLocationLabel: null,
      targetDescription: null,
      targetOwnerId: sanitize(row.owner_id) || null,
    };
  }

  return {
    targetLabel: targetType,
    targetStatus: row.status ?? null,
    targetModerationStatus: row.moderation_status ?? null,
    targetLocationLabel: locationLabel,
    targetDescription: description,
    targetOwnerId: sanitize(row.owner_id) || sanitize(row.reporter_id) || sanitize(row.profile_id) || null,
  };
}

async function readTargets(targetType: string, targetIds: string[]): Promise<Map<string, Record<string, unknown>>> {
  const uniqueIds = [...new Set(targetIds.filter(Boolean))];
  const result = new Map<string, Record<string, unknown>>();
  if (!uniqueIds.length) {
    return result;
  }

  let table = '';
  let select = '';

  if (targetType === 'lost_dog_alert') {
    table = 'lost_dog_alerts';
    select = 'id,description,status,moderation_status,owner_id,location_label,manual_address,created_at,expires_at';
  } else if (targetType === 'danger_report') {
    table = 'danger_reports';
    select = 'id,danger_type,description,severity,status,moderation_status,reporter_id,location_label,manual_address,created_at,expires_at';
  } else if (targetType === 'lost_dog_sighting') {
    table = 'lost_dog_sightings';
    select = 'id,note,status,moderation_status,reporter_id,location_label,manual_address,created_at,updated_at';
  } else if (targetType === 'walk_plan') {
    table = 'walk_plans';
    select = 'id,message,active,moderation_status,owner_id,location_label,manual_address,created_at,updated_at';
  } else if (targetType === 'presence_session') {
    table = 'presence_sessions';
    select = 'id,message,status,active,moderation_status,profile_id,location_label,manual_address,created_at,updated_at';
  } else if (targetType === 'dog_profile') {
    table = 'dogs';
    select = 'id,name,owner_id,visibility,moderation_status,created_at,updated_at';
  } else {
    return result;
  }

  const rows = await restGet(table, {
    select,
    id: inFilter(uniqueIds),
  });

  rows.forEach((row) => {
    const item = row as Record<string, unknown>;
    const id = sanitize(item.id);
    if (id) {
      result.set(id, item);
    }
  });

  return result;
}

async function listReports(payload: Record<string, unknown>) {
  const limit = normalizeLimit(payload.limit);
  const includeClosed = payload.includeClosed === true;
  const params: Record<string, string> = {
    select: 'id,reporter_id,target_type,target_id,reason,description,status,created_at,updated_at',
    order: 'created_at.desc',
    limit: String(limit),
  };

  if (!includeClosed) {
    params.status = 'in.(' + OPEN_REPORT_STATUSES.join(',') + ')';
  }

  const rows = await restGet('reports', params) as Record<string, unknown>[];

  const reporterIds = [...new Set(rows.map((row) => sanitize(row.reporter_id)).filter(Boolean))];
  const reporterNames = new Map<string, string>();
  if (reporterIds.length) {
    const profiles = await restGet('profiles', {
      select: 'id,display_name',
      id: inFilter(reporterIds),
    });
    profiles.forEach((profile) => {
      const item = profile as Record<string, unknown>;
      const id = sanitize(item.id);
      if (id) {
        reporterNames.set(id, sanitize(item.display_name) || 'Profilo BauBook');
      }
    });
  }

  const idsByType = new Map<string, string[]>();
  rows.forEach((row) => {
    const type = normalizeTargetType(row.target_type);
    const id = sanitize(row.target_id);
    if (!id) {
      return;
    }
    idsByType.set(type, [...(idsByType.get(type) ?? []), id]);
  });

  const targetMaps = new Map<string, Map<string, Record<string, unknown>>>();
  for (const [type, ids] of idsByType.entries()) {
    targetMaps.set(type, await readTargets(type, ids));
  }

  const targetOwnerIds = new Set<string>();
  rows.forEach((row) => {
    const targetType = normalizeTargetType(row.target_type);
    const targetId = sanitize(row.target_id);
    const target = targetMaps.get(targetType)?.get(targetId);
    const ownerId = sanitize((buildTargetSummary(targetType, target) as Record<string, unknown>).targetOwnerId);
    if (ownerId) {
      targetOwnerIds.add(ownerId);
    }
  });

  const targetOwnerNames = new Map<string, string>();
  if (targetOwnerIds.size) {
    const profiles = await restGet('profiles', {
      select: 'id,display_name',
      id: inFilter([...targetOwnerIds]),
    });
    profiles.forEach((profile) => {
      const item = profile as Record<string, unknown>;
      const id = sanitize(item.id);
      if (id) {
        targetOwnerNames.set(id, sanitize(item.display_name) || 'Profilo BauBook');
      }
    });
  }

  const reportIds = rows.map((row) => sanitize(row.id)).filter(Boolean);
  const closureActions = new Map<string, Record<string, unknown>>();
  if (reportIds.length) {
    const actionRows = await restGet('moderation_actions', {
      select: 'target_id,action,moderator_id,created_at',
      target_type: 'eq.report',
      target_id: inFilter(reportIds),
      order: 'created_at.desc',
    });
    actionRows.forEach((actionRow) => {
      const item = actionRow as Record<string, unknown>;
      const targetId = sanitize(item.target_id);
      const action = sanitize(item.action);
      if (targetId && REPORT_CLOSURE_ACTIONS.includes(action) && !closureActions.has(targetId)) {
        closureActions.set(targetId, item);
      }
    });
  }

  const reports = rows.map((row) => {
    const targetType = normalizeTargetType(row.target_type);
    const targetId = sanitize(row.target_id);
    const target = targetMaps.get(targetType)?.get(targetId);
    const targetSummary = buildTargetSummary(targetType, target);
    const reporterId = sanitize(row.reporter_id);
    const targetOwnerId = sanitize((targetSummary as Record<string, unknown>).targetOwnerId) || null;
    const closureAction = closureActions.get(sanitize(row.id));

    return {
      id: row.id,
      reporterId,
      reporterName: reporterNames.get(reporterId) ?? 'Profilo BauBook',
      targetType,
      targetId,
      reason: row.reason,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...targetSummary,
      targetOwnerId,
      targetOwnerName: targetOwnerId ? (targetOwnerNames.get(targetOwnerId) ?? 'Profilo BauBook') : null,
      closureAction: closureAction ? sanitize(closureAction.action) || null : null,
      closureActionAt: closureAction ? sanitize(closureAction.created_at) || null : null,
    };
  });

  return jsonResponse({ ok: true, reports });
}

async function setReportStatus(admin: AdminContext, payload: Record<string, unknown>) {
  const reportId = sanitize(payload.reportId);
  const requestedStatus = sanitize(payload.status);
  const note = sanitize(payload.note) || null;

  // The existing BauBook reports table is constrained to the legacy workflow
  // open -> reviewing -> actioned. The admin UI still exposes human actions
  // like "Risolvi" and "Ignora"; both close the queue item at DB level
  // by moving it to actioned, while moderation_actions keeps the semantic audit.
  const dbStatus = requestedStatus === 'resolved' || requestedStatus === 'dismissed'
    ? 'actioned'
    : requestedStatus;

  if (!reportId) {
    return jsonResponse({ ok: false, error: 'Missing reportId' }, 400);
  }

  if (!ALLOWED_REPORT_STATUSES.includes(requestedStatus)) {
    return jsonResponse({ ok: false, error: 'Invalid status' }, 400);
  }

  const rows = await restGet('reports', {
    select: 'id,reporter_id,target_type,target_id,reason,description,status,created_at,updated_at',
    id: 'eq.' + reportId,
    limit: '1',
  }) as Record<string, unknown>[];
  const report = rows[0];

  if (!report) {
    return jsonResponse({ ok: false, error: 'Report not found' }, 404);
  }

  const currentStatus = sanitize(report.status);
  if (CLOSED_REPORT_STATUSES.includes(currentStatus)) {
    return jsonResponse({
      ok: true,
      alreadyClosed: true,
      report,
    });
  }

  const updatedAt = new Date().toISOString();

  // Avoid relying on PostgREST return=representation here: if a project policy, trigger,
  // or generated column changes the returned payload, the admin action should not fail.
  await restPatchMinimal('reports', { id: 'eq.' + reportId }, {
    status: dbStatus,
    updated_at: updatedAt,
  });

  let auditWarning: string | null = null;
  try {
    await restInsert('moderation_actions', {
      moderator_id: admin.profileId,
      action: requestedStatus === dbStatus ? 'report_' + dbStatus : 'report_' + requestedStatus,
      target_type: 'report',
      target_id: reportId,
      reason: note,
      metadata: {
        report_requested_status: requestedStatus,
        report_db_status: dbStatus,
        report_target_type: report.target_type ?? null,
        report_target_id: report.target_id ?? null,
        moderator_role: admin.role,
      },
    });
  } catch (error) {
    // Do not block the moderator after the report status has been updated.
    // The warning is returned to the client and the root cause is visible in function logs.
    auditWarning = error instanceof Error ? error.message : 'moderation_actions insert failed';
    console.error('admin-moderation audit insert failed', auditWarning);
  }

  return jsonResponse({
    ok: true,
    report: {
      ...report,
      status: dbStatus,
      updated_at: updatedAt,
    },
    auditWarning,
  });
}


function targetUpdateConfig(targetType: string, mode: string): { table: string; body: Record<string, unknown> } | null {
  const hide = mode === 'hide';
  const now = new Date().toISOString();

  if (targetType === 'lost_dog_alert') {
    return {
      table: 'lost_dog_alerts',
      body: hide
        ? { status: 'removed', moderation_status: 'removed', closed_at: now, closed_reason: 'Nascosto da moderazione BauBook', updated_at: now }
        : { status: 'active', moderation_status: 'approved', closed_at: null, closed_reason: null, updated_at: now },
    };
  }

  if (targetType === 'danger_report') {
    return {
      table: 'danger_reports',
      body: hide
        ? { status: 'removed', moderation_status: 'removed', closed_reason: 'Nascosto da moderazione BauBook', updated_at: now }
        : { status: 'active', moderation_status: 'approved', closed_reason: null, updated_at: now },
    };
  }

  if (targetType === 'lost_dog_sighting') {
    return {
      table: 'lost_dog_sightings',
      body: hide
        ? { status: 'removed', moderation_status: 'removed', closed_at: now, updated_at: now }
        : { status: 'active', moderation_status: 'approved', closed_at: null, updated_at: now },
    };
  }

  if (targetType === 'walk_plan') {
    return {
      table: 'walk_plans',
      body: hide
        ? { active: false, moderation_status: 'removed', updated_at: now }
        : { active: true, moderation_status: 'approved', updated_at: now },
    };
  }

  if (targetType === 'presence_session') {
    return {
      table: 'presence_sessions',
      body: hide
        ? { active: false, moderation_status: 'removed', updated_at: now }
        : { active: true, moderation_status: 'approved', updated_at: now },
    };
  }

  if (targetType === 'dog_profile') {
    return {
      table: 'dogs',
      body: hide
        ? { visibility: 'removed', moderation_status: 'removed', updated_at: now }
        : { visibility: 'public', moderation_status: 'approved', updated_at: now },
    };
  }

  return null;
}

async function setTargetVisibility(admin: AdminContext, payload: Record<string, unknown>) {
  const reportId = sanitize(payload.reportId);
  const mode = sanitize(payload.mode);
  const note = sanitize(payload.note) || null;

  if (!['hide', 'restore'].includes(mode)) {
    return jsonResponse({ ok: false, error: 'Invalid target visibility mode' }, 400);
  }

  let report: Record<string, unknown> | null = null;
  let targetType = normalizeTargetType(payload.targetType);
  let targetId = sanitize(payload.targetId);

  if (reportId) {
    const rows = await restGet('reports', {
      select: 'id,reporter_id,target_type,target_id,reason,description,status,created_at,updated_at',
      id: 'eq.' + reportId,
      limit: '1',
    }) as Record<string, unknown>[];
    report = rows[0] ?? null;

    if (!report) {
      return jsonResponse({ ok: false, error: 'Report not found' }, 404);
    }

    targetType = normalizeTargetType(report.target_type);
    targetId = sanitize(report.target_id);
  }

  if (!targetType || !targetId) {
    return jsonResponse({ ok: false, error: 'Missing target' }, 400);
  }

  const config = targetUpdateConfig(targetType, mode);
  if (!config) {
    return jsonResponse({ ok: false, error: 'Unsupported target type' }, 400);
  }

  await restPatchMinimal(config.table, { id: 'eq.' + targetId }, config.body);

  const now = new Date().toISOString();
  if (reportId) {
    await restPatchMinimal('reports', { id: 'eq.' + reportId }, {
      status: 'actioned',
      updated_at: now,
    });
  }

  if (mode === 'hide') {
    try {
      await restInsert('content_removals', {
        moderator_id: admin.profileId,
        target_type: targetType,
        target_id: targetId,
        reason: note || 'Contenuto nascosto da moderazione BauBook',
      });
    } catch (error) {
      console.error('content_removals insert failed', error instanceof Error ? error.message : error);
    }
  }

  await restInsert('moderation_actions', {
    moderator_id: admin.profileId,
    action: mode === 'hide' ? 'content_hidden' : 'content_restored',
    target_type: targetType,
    target_id: targetId,
    reason: note,
    metadata: {
      report_id: reportId || null,
      moderator_role: admin.role,
      target_table: config.table,
      visibility_mode: mode,
    },
  });

  if (reportId) {
    await restInsert('moderation_actions', {
      moderator_id: admin.profileId,
      action: mode === 'hide' ? 'content_hidden' : 'content_restored',
      target_type: 'report',
      target_id: reportId,
      reason: note,
      metadata: {
        report_target_type: targetType,
        report_target_id: targetId,
        moderator_role: admin.role,
        target_table: config.table,
        visibility_mode: mode,
      },
    });
  }

  return jsonResponse({
    ok: true,
    targetType,
    targetId,
    mode,
  });
}

serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch (_error) {
    payload = {};
  }

  try {
    const admin = await requireAdmin(request);
    if (admin instanceof Response) {
      return admin;
    }

    const action = sanitize(payload.action) || 'status';

    if (action === 'status') {
      return jsonResponse({ ok: true, isAdmin: true, role: admin.role, profileId: admin.profileId, displayName: admin.displayName });
    }

    if (action === 'list_reports') {
      return await listReports(payload);
    }

    if (action === 'set_report_status') {
      return await setReportStatus(admin, payload);
    }

    if (action === 'set_target_visibility') {
      return await setTargetVisibility(admin, payload);
    }

    return jsonResponse({ ok: false, error: 'Unknown action' }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin moderation failed';
    return jsonResponse({ ok: false, error: message }, 500);
  }
});
