declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type GoogleAddressComponent = {
  long_name?: string;
  short_name?: string;
  types?: string[];
};

type GoogleGeocodeResult = {
  formatted_address?: string;
  types?: string[];
  address_components?: GoogleAddressComponent[];
};

type GoogleGeocodeResponse = {
  status?: string;
  results?: GoogleGeocodeResult[];
  error_message?: string;
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

function getComponent(components: GoogleAddressComponent[], type: string): string | null {
  const component = components.find((item) => item.types?.includes(type));
  return component?.long_name?.trim() || null;
}

function buildReadableLabel(result: GoogleGeocodeResult): string | null {
  const components = result.address_components ?? [];
  const route = getComponent(components, 'route');
  const streetNumber = getComponent(components, 'street_number');
  const locality =
    getComponent(components, 'locality') ||
    getComponent(components, 'postal_town') ||
    getComponent(components, 'administrative_area_level_3') ||
    getComponent(components, 'administrative_area_level_2');
  const sublocality =
    getComponent(components, 'sublocality') ||
    getComponent(components, 'sublocality_level_1') ||
    getComponent(components, 'neighborhood');

  if (route) {
    const street = [route, streetNumber].filter(Boolean).join(' ');
    const area = [sublocality, locality].filter(Boolean).join(', ');
    return [street, area].filter(Boolean).join(', ') || street;
  }

  if (sublocality && locality && sublocality !== locality) {
    return `${sublocality}, ${locality}`;
  }

  if (locality) {
    return locality;
  }

  return result.formatted_address?.trim() || null;
}

function scoreResult(result: GoogleGeocodeResult): number {
  const types = result.types ?? [];

  if (types.includes('street_address')) {
    return 100;
  }

  if (types.includes('premise') || types.includes('point_of_interest') || types.includes('establishment')) {
    return 90;
  }

  if (types.includes('route')) {
    return 80;
  }

  if (types.includes('neighborhood') || types.includes('sublocality') || types.includes('sublocality_level_1')) {
    return 70;
  }

  if (types.includes('locality')) {
    return 60;
  }

  return 10;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

  if (!apiKey) {
    return jsonResponse({ error: 'GOOGLE_MAPS_API_KEY is not configured' }, 500);
  }

  let payload: { latitude?: unknown; longitude?: unknown };

  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const latitude = Number(payload.latitude);
  const longitude = Number(payload.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return jsonResponse({ error: 'Invalid coordinates' }, 400);
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${latitude},${longitude}`);
  url.searchParams.set('language', 'it');
  url.searchParams.set('region', 'it');
  url.searchParams.set('key', apiKey);

  const googleResponse = await fetch(url.toString());

  if (!googleResponse.ok) {
    return jsonResponse({ error: 'Google Geocoding request failed' }, 502);
  }

  const data = (await googleResponse.json()) as GoogleGeocodeResponse;

  if (data.status !== 'OK' || !data.results?.length) {
    return jsonResponse({ error: data.error_message || data.status || 'No geocoding result' }, 404);
  }

  const bestResult = [...data.results].sort((a, b) => scoreResult(b) - scoreResult(a))[0];
  const label = buildReadableLabel(bestResult);

  if (!label) {
    return jsonResponse({ error: 'Unable to build readable location label' }, 404);
  }

  return jsonResponse({
    label,
    formattedAddress: bestResult.formatted_address ?? label,
    source: 'google_geocoding',
  });
});
