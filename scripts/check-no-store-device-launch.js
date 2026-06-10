const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const failures = [];
const warnings = [];
const oks = [];

const TARGET_APP_VERSION = '0.4.0';
const TARGET_BASELINE = '2.1.0';
const TARGET_ANDROID_VERSION_CODE = 20;
const TARGET_IOS_BUILD_NUMBER = '20';

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function abs(rel) {
  return path.join(repoRoot, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function ok(message) {
  oks.push(message);
}

function warn(message) {
  warnings.push(message);
}

function fail(message) {
  failures.push(message);
}

function walk(dir, matcher, hits = []) {
  const root = abs(dir);
  if (!fs.existsSync(root)) return hits;

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    const rel = path.relative(repoRoot, full).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (['_baubook_work', '_baubook_backups', 'node_modules', '.git', '.expo', 'android', 'ios'].includes(entry.name)) continue;
      walk(rel, matcher, hits);
    } else if (matcher(rel, entry.name)) {
      hits.push(rel);
    }
  }
  return hits;
}

function hasScript(pkg, name) {
  return Boolean(pkg.scripts && pkg.scripts[name]);
}

function checkPackageJson() {
  if (!exists('package.json')) return fail('package.json missing. Run from repository root C:\\baubook.');

  const pkg = readJson(abs('package.json'));
  if (pkg.version === TARGET_APP_VERSION) ok(`package.json version is ${TARGET_APP_VERSION}.`);
  else warn(`package.json version is ${pkg.version || 'missing'}, expected ${TARGET_APP_VERSION}.`);

  for (const script of ['device:beta:check', 'no-store:check', 'sponsor:pilot:check', 'store:fasttrack:check']) {
    if (hasScript(pkg, script)) ok(`npm script present: ${script}.`);
    else warn(`npm script missing: ${script}.`);
  }

  for (const expected of ['typecheck', 'safety:smoke', 'launch:check']) {
    if (hasScript(pkg, expected)) ok(`existing quality gate present: ${expected}.`);
    else warn(`existing quality gate missing: ${expected}.`);
  }

  if (hasScript(pkg, 'map:web-safe:check')) ok('web-safe map check script is present from 2.0.4+.');
  else warn('map:web-safe:check is missing; verify react-native-maps is isolated manually.');

  if (hasScript(pkg, 'sponsored:rls:check')) ok('sponsored_slots RLS check script is present from 2.0.5+.');
  else warn('sponsored:rls:check is missing; verify sponsored_slots migration manually.');
}

function checkAppJson() {
  if (!exists('app.json')) return fail('app.json missing.');

  const appJson = readJson(abs('app.json'));
  const expo = appJson.expo || appJson;

  if (expo.version === TARGET_APP_VERSION) ok(`Expo app version is ${TARGET_APP_VERSION}.`);
  else warn(`Expo app version is ${expo.version || 'missing'}, expected ${TARGET_APP_VERSION}.`);

  if (expo.extra && expo.extra.baubookBaseline === TARGET_BASELINE) ok(`BauBook baseline is ${TARGET_BASELINE}.`);
  else warn(`expo.extra.baubookBaseline is not ${TARGET_BASELINE}.`);

  if (expo.extra && expo.extra.baubookLaunchMode === 'no-store-device-beta') ok('Launch mode is no-store-device-beta.');
  else warn('expo.extra.baubookLaunchMode is not no-store-device-beta.');

  if (expo.android && expo.android.versionCode === TARGET_ANDROID_VERSION_CODE) ok(`Android versionCode is ${TARGET_ANDROID_VERSION_CODE}.`);
  else warn(`Android versionCode is not ${TARGET_ANDROID_VERSION_CODE}.`);

  if (expo.ios && String(expo.ios.buildNumber) === TARGET_IOS_BUILD_NUMBER) ok(`iOS buildNumber is ${TARGET_IOS_BUILD_NUMBER}.`);
  else warn(`iOS buildNumber is not ${TARGET_IOS_BUILD_NUMBER}.`);

  if (expo.android && expo.android.package) ok(`Android package is set: ${expo.android.package}.`);
  else warn('Android package is not set; set it before Play Console/AAB upload. APK device testing may still proceed.');

  if (expo.name) ok(`Expo app name is set: ${expo.name}.`);
  else warn('Expo app name is missing.');

  if (expo.slug) ok(`Expo slug is set: ${expo.slug}.`);
  else warn('Expo slug is missing.');

  const androidMapsKey = expo.android && expo.android.config && expo.android.config.googleMaps && expo.android.config.googleMaps.apiKey;
  if (androidMapsKey) ok('Android Google Maps API key is configured.');
  else warn('Android Google Maps API key not found; native release maps may need it. Device auth tests can still proceed.');
}

function checkEasJson() {
  if (!exists('eas.json')) return warn('eas.json missing; EAS build cannot start until configured.');

  const eas = readJson(abs('eas.json'));
  const preview = eas.build && eas.build.preview;
  const deviceBeta = eas.build && eas.build['device-beta'];

  if (preview && preview.distribution === 'internal') ok('EAS preview profile uses internal distribution.');
  else warn('EAS preview profile is not internal distribution.');

  if (preview && preview.android && preview.android.buildType === 'apk') ok('EAS preview Android buildType is apk.');
  else warn('EAS preview Android buildType is not apk.');

  if (deviceBeta && deviceBeta.distribution === 'internal') ok('EAS device-beta profile uses internal distribution.');
  else warn('EAS device-beta profile missing/internal distribution not set.');

  if (deviceBeta && deviceBeta.android && deviceBeta.android.buildType === 'apk') ok('EAS device-beta Android buildType is apk.');
  else warn('EAS device-beta Android buildType is not apk.');

  if (eas.build && eas.build.production) ok('EAS production profile exists for later Play Store AAB.');
  else warn('EAS production profile missing.');
}

function checkEnv() {
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production'].filter(exists);
  const envText = envFiles.map((rel) => readText(abs(rel))).join('\n');

  const hasUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || /EXPO_PUBLIC_SUPABASE_URL\s*=\s*.+/i.test(envText);
  const hasAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || /EXPO_PUBLIC_SUPABASE_ANON_KEY\s*=\s*.+/i.test(envText);

  if (hasUrl) ok('EXPO_PUBLIC_SUPABASE_URL found in env/process.');
  else warn('EXPO_PUBLIC_SUPABASE_URL not found in visible env files/process env.');

  if (hasAnon) ok('EXPO_PUBLIC_SUPABASE_ANON_KEY found in env/process.');
  else warn('EXPO_PUBLIC_SUPABASE_ANON_KEY not found in visible env files/process env.');
}

function checkMapsIsolation() {
  const sourceFiles = walk('src', (rel, name) => /\.(ts|tsx|js|jsx)$/.test(name));
  const unsafeImports = [];

  for (const rel of sourceFiles) {
    if (/\.native\.(ts|tsx|js|jsx)$/.test(rel)) continue;
    const text = readText(abs(rel));
    if (/from\s+['"]react-native-maps['"]|require\(['"]react-native-maps['"]\)/.test(text)) {
      unsafeImports.push(rel);
    }
  }

  if (unsafeImports.length === 0) ok('react-native-maps is isolated from non-native source files.');
  else fail(`react-native-maps imported outside native files: ${unsafeImports.join(', ')}`);

  if (exists('src/features/map/NativePlacesMap.native.tsx')) ok('NativePlacesMap.native.tsx exists.');
  else warn('NativePlacesMap.native.tsx missing; native map may not be active.');

  if (exists('src/features/map/NativePlacesMap.web.tsx')) ok('NativePlacesMap.web.tsx exists.');
  else warn('NativePlacesMap.web.tsx missing; browser may crash if react-native-maps is imported.');
}

function checkSupabaseMigrations() {
  if (exists('supabase/migrations/0006_sponsored_slots_public_read_policy.sql')) ok('sponsored_slots RLS migration 0006 exists.');
  else warn('sponsored_slots RLS migration 0006 missing; browser may still see 403 on sponsored_slots.');
}

function checkCompactDocs() {
  const forbidden = [
    'docs/DEVICE_BETA_QA.md',
    'docs/NO_STORE_DEVICE_LAUNCH.md',
    'docs/PLAY_STORE_FAST_TRACK.md',
    'docs/SPONSOR_LITE_SALES_PACK.md',
  ].filter(exists);

  if (forbidden.length === 0) ok('No extra 2.1.0 docs found; compact documentation rule preserved.');
  else fail(`Extra docs not allowed by compact documentation: ${forbidden.join(', ')}`);

  const badDocs = walk('docs', (rel, name) => /^HOTFIX_.*\.md$/i.test(name) || /^BASELINE_.*\.md$/i.test(name));
  if (badDocs.length === 0) ok('No HOTFIX_*.md or BASELINE_*.md docs found.');
  else fail(`Forbidden docs found: ${badDocs.join(', ')}`);
}

function checkGitIgnores() {
  if (!exists('.gitignore')) return warn('.gitignore missing; make sure zips/backups are not committed.');
  const text = readText(abs('.gitignore'));
  for (const pattern of ['_baubook_work/', '_baubook_backups/', 'baubook_*.zip']) {
    if (text.includes(pattern)) ok(`.gitignore includes ${pattern}.`);
    else warn(`.gitignore does not include ${pattern}; do not commit generated packages/backups.`);
  }
}

function checkSponsorPilot() {
  checkSupabaseMigrations();

  const sourceFiles = walk('src', (rel, name) => /\.(ts|tsx|js|jsx)$/.test(name));
  const sponsoredRefs = sourceFiles.filter((rel) => /sponsored_slots|Sponsor|sponsor/i.test(readText(abs(rel))));
  if (sponsoredRefs.length > 0) ok(`Sponsored Lite references found in source (${sponsoredRefs.length} files).`);
  else warn('No Sponsored Lite source references found; verify sponsor slot UI manually.');
}

function checkStoreFastTrackMode() {
  if (!args.has('--store')) return;
  warn('Store fast-track is informational only in 2.1.0: no 12-tester dependency is required for device-beta APK.');
}

checkPackageJson();
checkAppJson();
checkEasJson();
checkEnv();
checkMapsIsolation();
checkSupabaseMigrations();
checkCompactDocs();
checkGitIgnores();
checkStoreFastTrackMode();

if (args.has('--sponsor')) {
  checkSponsorPilot();
}

console.log('');
console.log('BauBook 2.1.0 No-Store Device Launch readiness');
console.log('='.repeat(56));
for (const message of oks) console.log(`OK: ${message}`);
for (const message of warnings) console.warn(`WARN: ${message}`);
for (const message of failures) console.error(`FAIL: ${message}`);

if (failures.length > 0) {
  console.error('');
  console.error(`${failures.length} blocking issue(s) found.`);
  process.exit(1);
}

console.log('');
console.log(`Ready with ${warnings.length} warning(s). Warnings can be handled during device QA unless they block your actual build.`);
