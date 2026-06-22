// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type ContactPayload = {
  request_type?: 'partnership' | 'feedback';
  name?: string;
  city?: string;
  contact_email?: string;
  email?: string;
  contact_phone?: string;
  phone?: string;
  message?: string;
  source?: string;
  app_version?: string;
};

type SaveResult =
  | { saved: true; id: string }
  | { saved: false; error: string };

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
  return String(value || '').trim();
}

function getSupabaseRestConfig() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const restKey = serviceRoleKey || anonKey;

  if (!supabaseUrl || !restKey) {
    return null;
  }

  return {
    endpoint: supabaseUrl.replace(/\/$/, '') + '/rest/v1/contact_requests',
    restKey,
  };
}

async function saveRequest(payload: ContactPayload): Promise<SaveResult> {
  const config = getSupabaseRestConfig();

  if (!config) {
    return { saved: false, error: 'Missing Supabase REST configuration' };
  }

  const requestType = payload.request_type === 'partnership' ? 'partnership' : 'feedback';
  const contactEmail = sanitize(payload.contact_email) || sanitize(payload.email) || null;
  const contactPhone = sanitize(payload.contact_phone) || sanitize(payload.phone) || null;

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + config.restKey,
      apikey: config.restKey,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      request_type: requestType,
      name: sanitize(payload.name) || null,
      city: sanitize(payload.city) || null,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      message: sanitize(payload.message),
      source: sanitize(payload.source) || 'app',
      app_version: sanitize(payload.app_version) || null,
      status: 'new',
      email_sent: false,
      email_status: 'not_attempted',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    return {
      saved: false,
      error: errorText || `contact_requests insert failed with status ${response.status}`,
    };
  }

  const rows = await response.json().catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : null;

  if (!row?.id) {
    return { saved: false, error: 'contact_requests insert returned no id' };
  }

  return { saved: true, id: row.id };
}

async function updateEmailStatus(id: string, emailed: boolean, emailStatus: string): Promise<void> {
  const config = getSupabaseRestConfig();

  if (!config) {
    return;
  }

  await fetch(config.endpoint + '?id=eq.' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + config.restKey,
      apikey: config.restKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      email_sent: emailed,
      email_status: emailStatus,
    }),
  }).catch(() => undefined);
}

async function sendMailbox(payload: ContactPayload): Promise<{ emailed: boolean; status: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('CONTACT_TO_EMAIL') || 'info@baubook.me';
  const from = Deno.env.get('CONTACT_FROM_EMAIL') || 'BauBook <onboarding@resend.dev>';

  if (!resendApiKey) {
    return { emailed: false, status: 'missing_resend_api_key' };
  }

  const requestType = payload.request_type === 'partnership' ? 'Partnership' : 'Feedback beta';
  const subject = '[BauBook] ' + requestType;

  const text = [
    'Nuovo messaggio da BauBook',
    '',
    'Tipo: ' + requestType,
    'Nome: ' + (sanitize(payload.name) || '-'),
    'Citta: ' + (sanitize(payload.city) || '-'),
    'Email: ' + (sanitize(payload.contact_email) || sanitize(payload.email) || '-'),
    'Telefono: ' + (sanitize(payload.contact_phone) || sanitize(payload.phone) || '-'),
    'Fonte: ' + (sanitize(payload.source) || '-'),
    'App version: ' + (sanitize(payload.app_version) || '-'),
    '',
    'Messaggio:',
    sanitize(payload.message),
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + resendApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    return {
      emailed: false,
      status: errorText || `resend_failed_${response.status}`,
    };
  }

  return { emailed: true, status: 'sent' };
}

serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, saved: false, emailed: false, error: 'Method not allowed' }, 405);
  }

  let payload: ContactPayload;

  try {
    payload = await request.json();
  } catch (_error) {
    return jsonResponse({ ok: false, saved: false, emailed: false, error: 'Invalid JSON' }, 400);
  }

  if (!sanitize(payload.message)) {
    return jsonResponse({ ok: false, saved: false, emailed: false, error: 'Message is required' }, 400);
  }

  const saveResult = await saveRequest(payload);

  if (!saveResult.saved) {
    return jsonResponse({
      ok: false,
      saved: false,
      emailed: false,
      error: saveResult.error,
    }, 500);
  }

  const emailResult = await sendMailbox(payload);
  await updateEmailStatus(saveResult.id, emailResult.emailed, emailResult.status);

  return jsonResponse({
    ok: true,
    saved: true,
    emailed: emailResult.emailed,
    emailStatus: emailResult.status,
    requestId: saveResult.id,
  });
});