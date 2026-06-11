const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const EXPECTED = {
  appVersion: '0.6.0',
  baseline: '2.3.0',
  androidVersionCode: 28,
  iosBuildNumber: '28',
};

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function fail(message) {
  console.error('[production-backend-check] ' + message);
  process.exitCode = 1;
}

function assertFile(relativePath, tokens) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail('File mancante: ' + relativePath);
    return;
  }

  const content = readText(relativePath);
  for (const token of tokens) {
    if (!content.includes(token)) {
      fail('Token mancante in ' + relativePath + ': ' + token);
    }
  }
}

const packageJson = readJson('package.json');
if (packageJson.version !== EXPECTED.appVersion) {
  fail(`package.json version attesa ${EXPECTED.appVersion}, trovata ${packageJson.version}`);
}
if (packageJson.baubook?.baseline !== EXPECTED.baseline) {
  fail(`package.json baubook.baseline attesa ${EXPECTED.baseline}`);
}
for (const scriptName of ['production:backend:check', 'production:no-demo-check', 'presentability:check']) {
  if (!packageJson.scripts?.[scriptName]) {
    fail('Script npm mancante: ' + scriptName);
  }
}

const appJson = readJson('app.json');
if (appJson.expo?.version !== EXPECTED.appVersion) {
  fail(`app.json expo.version attesa ${EXPECTED.appVersion}`);
}
if (appJson.expo?.android?.versionCode !== EXPECTED.androidVersionCode) {
  fail(`app.json android.versionCode atteso ${EXPECTED.androidVersionCode}`);
}
if (appJson.expo?.ios?.buildNumber !== EXPECTED.iosBuildNumber) {
  fail(`app.json ios.buildNumber atteso ${EXPECTED.iosBuildNumber}`);
}
if (appJson.expo?.extra?.baseline !== EXPECTED.baseline || appJson.expo?.extra?.baubookBaseline !== EXPECTED.baseline) {
  fail(`app.json baseline extra attesa ${EXPECTED.baseline}`);
}
if (appJson.expo?.extra?.productionBackendCutover !== true) {
  fail('app.json extra.productionBackendCutover non attivo');
}

assertFile('supabase/migrations/0012_production_backend_cutover.sql', [
  'create table if not exists public.dog_diary_events',
  'create table if not exists public.place_favorites',
  'create table if not exists public.place_reports',
  'delete from public.places',
  'places_no_demo_source_check',
]);
assertFile('src/features/home/dogDiaryBackend.ts', [
  'dog_diary_events',
  'loadDogDiaryEvents',
  'saveDogDiaryEvents',
  'getSupabaseClient',
]);
assertFile('src/features/home/components/HomeDogDiaryLite.tsx', [
  'loadDogDiaryEvents',
  'saveDogDiaryEvents',
]);
assertFile('src/features/map/placeFavoritesStorage.ts', [
  'place_favorites',
  'readPlaceFavoriteIds',
  'togglePlaceFavoriteId',
  'getSupabaseClient',
]);
assertFile('src/shared/api/supabaseContent.ts', [
  'source: \'unavailable\'',
  'places: []',
  'Nessun luogo pubblico disponibile',
]);

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log('[production-backend-check] OK - BauBook 2.3.0 / app 0.6.0 production backend cutover allineato.');
