const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGETS = [
  'src/shared/api/supabaseContent.ts',
  'src/shared/hooks/useSupabasePublicData.ts',
  'src/features/map/MapScreen.tsx',
  'src/features/map/placeFavoritesStorage.ts',
  'src/features/home/components/HomeDogDiaryLite.tsx',
  'src/features/home/dogDiaryBackend.ts',
];

const FORBIDDEN = [
  'demoPlaces',
  '../data/mockData',
  'source === \'demo\'',
  'source: \'demo\'',
  'source: "demo"',
  'uso dati demo',
  'dati demo',
  'demo locali',
  'fallback_demo',
  'Demo locale',
  'Backend in fallback controllato',
  'Qui agganceremo',
  'AsyncStorage.getItem',
  'AsyncStorage.setItem',
];

let failed = false;
for (const relativePath of TARGETS) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    console.error('[no-demo-runtime-check] File mancante: ' + relativePath);
    failed = true;
    continue;
  }

  const content = fs.readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '');
  for (const token of FORBIDDEN) {
    if (content.includes(token)) {
      console.error(`[no-demo-runtime-check] Token runtime non ammesso in ${relativePath}: ${token}`);
      failed = true;
    }
  }
}

const migration = path.join(ROOT, 'supabase/migrations/0012_production_backend_cutover.sql');
if (!fs.existsSync(migration)) {
  console.error('[no-demo-runtime-check] Migration production cutover mancante.');
  failed = true;
} else {
  const sql = fs.readFileSync(migration, 'utf8').replace(/^\uFEFF/, '');
  if (!/delete\s+from\s+public\.places/i.test(sql)) {
    console.error('[no-demo-runtime-check] La migration non rimuove righe demo da public.places.');
    failed = true;
  }
  if (!/places_no_demo_source_check/i.test(sql)) {
    console.error('[no-demo-runtime-check] La migration non aggiunge il vincolo anti-demo su public.places.source.');
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('[no-demo-runtime-check] OK - nessun fallback demo nei runtime critici e migration anti-demo presente.');
