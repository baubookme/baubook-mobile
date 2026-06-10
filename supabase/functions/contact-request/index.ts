// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

type ContactPayload = {
  request_type?: 'partnership' | 'feedback';
  name?: string;
  city?: string;
  contact_email?: string;
  contact_phone?: string;
  message?: string;
  source?: string;
  app_version?: string;
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

function sanitize(value: unknown): string {
  return String(value || '').trim();
}

async function saveRequest(payload: ContactPayload): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const endpoint = supabaseUrl.replace(/\/$/, '') + '/rest/v1/contact_requests';

  await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + serviceRoleKey,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      request_type: payload.request_type || 'feedback',
      name: sanitize(payload.name) || null,
      city: sanitize(payload.city) || null,
      contact_email: sanitize(payload.contact_email) || null,
      contact_phone: sanitize(payload.contact_phone) || null,
      message: sanitize(payload.message),
      source: sanitize(payload.source) || 'app',
      app_version: sanitize(payload.app_version) || null
    })
  }).catch(() => undefined);
}

async function sendMailbox(payload: ContactPayload): Promise<boolean> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('CONTACT_TO_EMAIL') || 'admin@baubook.me';
  const from = Deno.env.get('CONTACT_FROM_EMAIL') || 'BauBook <onboarding@resend.dev>';

  if (!resendApiKey) {
    return false;
  }

  const requestType = payload.request_type === 'partnership' ? 'Partnership' : 'Feedback beta';
  const subject = '[BauBook] ' + requestType;

  const text = [
    'Nuovo messaggio da BauBook',
    '',
    'Tipo: ' + requestType,
    'Nome: ' + (sanitize(payload.name) || '-'),
    'Citta: ' + (sanitize(payload.city) || '-'),
    'Email: ' + (sanitize(payload.contact_email) || '-'),
    'Telefono: ' + (sanitize(payload.contact_phone) || '-'),
    'Fonte: ' + (sanitize(payload.source) || '-'),
    'App version: ' + (sanitize(payload.app_version) || '-'),
    '',
    'Messaggio:',
    sanitize(payload.message)
  ].join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + resendApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text
    })
  });

  return response.ok;
}

serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let payload: ContactPayload;

  try {
    payload = await request.json();
  } catch (_error) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!sanitize(payload.message)) {
    return jsonResponse({ error: 'Message is required' }, 400);
  }

  await saveRequest(payload);

  const emailed = await sendMailbox(payload);

  return jsonResponse({
    ok: true,
    emailed
  });
});