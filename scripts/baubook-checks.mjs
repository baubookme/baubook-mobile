import fs from 'fs';
import path from 'path';

const repo = path.resolve(process.cwd());
const args = new Set(process.argv.slice(2));

function readText(relativePath) {
  return fs.readFileSync(path.join(repo, relativePath), 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function exists(relativePath) {
  return fs.existsSync(path.join(repo, relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function listFiles(dir, extensions, out = []) {
  const absoluteDir = path.join(repo, dir);
  if (!fs.existsSync(absoluteDir)) return out;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const relativePath = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      listFiles(relativePath, extensions, out);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(relativePath);
    }
  }
  return out;
}

function checkVersion() {
  const pkg = readJson('package.json');
  const app = readJson('app.json');
  assert(pkg.version === '0.7.4', `package.json version attesa 0.7.4, trovata ${pkg.version}`);
  assert(app.expo?.version === '0.7.4', `app.json expo.version attesa 0.7.4, trovata ${app.expo?.version}`);
  assert(Number(app.expo?.android?.versionCode) === 34, 'Android versionCode atteso 34');
  assert(String(app.expo?.ios?.buildNumber) === '34', 'iOS buildNumber atteso 34');
  assert(String(app.expo?.extra?.baseline) === '2.3.0', 'extra.baseline atteso 2.3.0');
  console.log('[baubook-check] OK versioni 0.7.4 / 2.3.0');
}

function checkPackageScripts() {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts || {};
  const allowed = new Set([
    'start', 'dev', 'web', 'web:host',
    'android', 'android:start', 'android:start:localhost', 'android:expo-go', 'android:build',
    'typecheck', 'doctor', 'expo:check', 'install:clean',
    'bb:web', 'bb:android-build', 'bb:android-dev', 'bb:doctor', 'bb:supabase', 'supabase:doctor',
    'safety:smoke', 'check', 'production:check', 'launch:check', 'launch:check:strict',
  ]);
  const extra = Object.keys(scripts).filter((name) => !allowed.has(name));
  assert(extra.length === 0, `script package.json non ammessi: ${extra.join(', ')}`);
  assert(scripts.check === 'npm run typecheck && node scripts/baubook-checks.mjs', 'script check non allineato');
  assert(scripts['production:check'] === 'npm run typecheck && node scripts/baubook-checks.mjs --production', 'script production:check non allineato');
  assert(scripts['launch:check'] === 'node scripts/baubook-checks.mjs --launch', 'script launch:check non allineato');
  console.log('[baubook-check] OK package.json pulito');
}

function checkNoDemoRuntime() {
  const files = listFiles('src', ['.ts', '.tsx']).filter((file) => {
    return !file.includes('/__tests__/') && !file.includes('/test/') && !file.includes('/fixtures/');
  });
  const blocked = [
    'demoPlaces', 'mockPlaces', 'samplePlaces', 'fallbackPlaces',
    "source === 'supabase' ? 'live' : 'demo'",
    'Demo locale', 'dati demo locali', 'uso dati demo locali',
    'live/demo', 'mock data', 'sample data',
  ];
  const hits = [];
  for (const file of files) {
    const text = readText(file);
    for (const token of blocked) {
      if (text.toLowerCase().includes(token.toLowerCase())) {
        hits.push(`${file}: ${token}`);
      }
    }
  }
  assert(hits.length === 0, `token demo/runtime non ammessi:\n${hits.join('\n')}`);
  console.log('[baubook-check] OK no demo runtime');
}

function checkHomePresentability() {
  const home = exists('src/features/home/HomeScreen.tsx') ? readText('src/features/home/HomeScreen.tsx') : '';
  const blocked = [
    'Trust Command Center', 'BetaTrustCommandCenter', 'HomeTopInsightBadges',
    'HomeBetaPolishCards', 'HomeFirstStepsCommandCenter', 'HomeTodayCommandCenter',
    'live cockpit', 'Setup beta', 'Prontezza profilo', 'live/demo', 'Demo locale',
  ];
  const hits = blocked.filter((token) => home.toLowerCase().includes(token.toLowerCase()));
  assert(hits.length === 0, `Home contiene ancora elementi da sviluppatore: ${hits.join(', ')}`);
  assert(home.includes('BauBook v0.7.4'), 'Home deve mostrare solo il numero versione in basso: BauBook v0.7.4');
  console.log('[baubook-check] OK Home presentabile');
}

function checkBackendContract() {
  assert(exists('supabase/migrations/0012_production_backend_cutover.sql'), 'migration 0012 production backend mancante');
  const migration = readText('supabase/migrations/0012_production_backend_cutover.sql');
  for (const token of ['dog_diary_events', 'place_favorites', 'place_reports']) {
    assert(migration.includes(token), `migration non contiene ${token}`);
  }
  assert(exists('src/features/home/dogDiaryBackend.ts'), 'dogDiaryBackend.ts mancante');
  const diaryBackend = readText('src/features/home/dogDiaryBackend.ts');
  assert(diaryBackend.includes('dog_diary_events'), 'dogDiaryBackend non usa dog_diary_events');
  console.log('[baubook-check] OK backend contract');
}

function checkScriptHygiene() {
  const scripts = listFiles('scripts', ['.js', '.mjs']);
  const allowed = new Set(['scripts/baubook-checks.mjs']);
  const forbidden = scripts.filter((file) => !allowed.has(file));
  assert(forbidden.length === 0, `script JS/MJS non consolidati rimasti:\n${forbidden.join('\n')}`);
  console.log('[baubook-check] OK script hygiene');
}

function main() {
  checkVersion();
  checkPackageScripts();
  checkNoDemoRuntime();
  checkHomePresentability();
  checkBackendContract();
  checkScriptHygiene();

  if (args.has('--production')) {
    console.log('[baubook-check] OK production mode');
  }
  if (args.has('--launch')) {
    console.log('[baubook-check] OK launch mode');
  }
  if (args.has('--strict')) {
    console.log('[baubook-check] OK strict mode');
  }
}

main();
