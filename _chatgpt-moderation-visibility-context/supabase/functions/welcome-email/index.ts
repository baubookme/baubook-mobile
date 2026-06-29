// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type WelcomePayload = {
  displayName?: string | null;
};

type AuthUser = {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown> | null;
};

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function getAuthenticatedUser(request: Request): Promise<AuthUser | null> {
  const token = getBearerToken(request);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!token || !supabaseUrl || !anonKey) {
    return null;
  }

  const response = await fetch(supabaseUrl.replace(/\/$/, '') + '/auth/v1/user', {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
      apikey: anonKey,
    },
  });

  if (!response.ok) {
    return null;
  }

  return await response.json().catch(() => null) as AuthUser | null;
}

function resolveDisplayName(payload: WelcomePayload, user: AuthUser): string {
  const fromBody = sanitize(payload.displayName);
  if (fromBody) {
    return fromBody;
  }

  const metadata = user.user_metadata || {};
  const fromMetadata = sanitize(metadata.display_name) || sanitize(metadata.displayName) || sanitize(metadata.name);
  if (fromMetadata) {
    return fromMetadata;
  }

  return 'il tuo profilo BauBook';
}

function buildText(displayName: string): string {
  return [
    'Benvenuto in BauBook!',
    '',
    'Il tuo account BauBook e pronto.',
    '',
    'Nome profilo visibile scelto: ' + displayName,
    '',
    'Puoi entrare quando vuoi usando email e password, oppure il codice email dalla schermata di accesso.',
    '',
    'Ora puoi completare il profilo del tuo 🐾 e iniziare a esplorare BauBook.',
    '',
    'Ci vediamo nel branco!',
    '',
    'BauBook',
  ].join('\n');
}

function buildHtml(displayName: string): string {
  const safeName = escapeHtml(displayName);

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#fff8ed;font-family:Arial,Helvetica,sans-serif;color:#2f251d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff8ed;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;border:1px solid #f0dfca;overflow:hidden;">
            <tr>
              <td style="padding:28px 24px 12px 24px;text-align:center;">
                <div style="font-size:40px;line-height:1;margin-bottom:12px;">🐾</div>
                <h1 style="margin:0;color:#2f251d;font-size:28px;line-height:1.15;font-weight:900;">Benvenuto in BauBook</h1>
                <p style="margin:10px 0 0 0;color:#7a6658;font-size:16px;line-height:1.5;">Il tuo account è pronto.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;">
                <div style="background:#ecfbf7;border:1px solid #bcece1;border-radius:18px;padding:18px;text-align:center;">
                  <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#0f8f7f;font-weight:900;margin-bottom:6px;">Nome visibile scelto</div>
                  <div style="font-size:22px;line-height:1.25;color:#2f251d;font-weight:900;">${safeName}</div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 24px 28px 24px;">
                <p style="margin:0 0 14px 0;color:#4f4036;font-size:16px;line-height:1.55;">Puoi entrare quando vuoi usando email e password, oppure il codice email dalla schermata di accesso.</p>
                <p style="margin:0 0 14px 0;color:#4f4036;font-size:16px;line-height:1.55;">Ora puoi completare il profilo del tuo 🐾 e iniziare a esplorare BauBook.</p>
                <p style="margin:22px 0 0 0;color:#2f251d;font-size:16px;line-height:1.55;font-weight:800;">Ci vediamo nel branco!</p>
                <p style="margin:6px 0 0 0;color:#0f8f7f;font-size:16px;line-height:1.55;font-weight:900;">BauBook 🐾</p>
              </td>
            </tr>
          </table>
          <p style="max-width:560px;margin:14px auto 0 auto;color:#9b897b;font-size:12px;line-height:1.4;text-align:center;">Ricevi questa email perché hai creato un account BauBook.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendWelcomeEmail(to: string, displayName: string): Promise<{ emailed: boolean; status: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('WELCOME_FROM_EMAIL') || Deno.env.get('CONTACT_FROM_EMAIL') || 'BauBook <onboarding@resend.dev>';
  const replyTo = Deno.env.get('CONTACT_TO_EMAIL') || 'info@baubook.me';

  if (!resendApiKey) {
    return { emailed: false, status: 'missing_resend_api_key' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + resendApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      reply_to: replyTo,
      subject: 'Benvenuto in BauBook 🐾',
      text: buildText(displayName),
      html: buildHtml(displayName),
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
    return jsonResponse({ ok: false, emailed: false, error: 'Method not allowed' }, 405);
  }

  let payload: WelcomePayload = {};

  try {
    payload = await request.json();
  } catch (_error) {
    payload = {};
  }

  const user = await getAuthenticatedUser(request);
  if (!user?.email) {
    return jsonResponse({ ok: false, emailed: false, error: 'Authenticated user email not available' }, 401);
  }

  const displayName = resolveDisplayName(payload, user);
  const result = await sendWelcomeEmail(user.email, displayName);

  return jsonResponse({
    ok: result.emailed,
    emailed: result.emailed,
    emailStatus: result.status,
  }, result.emailed ? 200 : 500);
});
