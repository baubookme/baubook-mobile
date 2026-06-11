const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const EXPECTED = {
  appVersion: '0.5.0',
  baseline: '2.2.0',
  androidVersionCode: 27,
  iosBuildNumber: '27',
};

function readText(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  return fs.readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function fail(message) {
  console.error(`[map-care-check] ${message}`);
  process.exitCode = 1;
}

function assertFile(relativePath, tokens) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`File mancante: ${relativePath}`);
    return;
  }

  const content = readText(relativePath);
  for (const token of tokens) {
    if (!content.includes(token)) {
      fail(`Token mancante in ${relativePath}: ${token}`);
    }
  }
}

const packageJson = readJson('package.json');
if (packageJson.version !== EXPECTED.appVersion) {
  fail(`package.json version attesa ${EXPECTED.appVersion}, trovata ${packageJson.version}`);
}
if (packageJson.scripts?.['map:care:check'] !== 'node scripts/check_map_care_command_center.js') {
  fail('Script map:care:check mancante o non allineato');
}
if (packageJson.baubook?.baseline !== EXPECTED.baseline) {
  fail(`package.json baubook.baseline attesa ${EXPECTED.baseline}`);
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
if (appJson.expo?.extra?.mapCareCommandCenter !== true) {
  fail('app.json extra.mapCareCommandCenter non attivo');
}

assertFile('src/features/map/placeFavoritesStorage.ts', [
  'baubook.map.placeFavorites.v1',
  'readPlaceFavoriteIds',
  'togglePlaceFavoriteId',
]);
assertFile('src/features/map/components/PlaceDetailCard.tsx', [
  'PlaceDetailCard',
  'Apri navigazione',
  'Segnala info',
  'Salva preferito',
]);
assertFile('src/features/map/components/MapCareCommandCenter.tsx', [
  'MapCareCommandCenter',
  'Map & Care Command Center',
  'Preferiti',
  'Aree cani',
]);
assertFile('src/features/home/components/HomeTodayCommandCenter.tsx', [
  'HomeTodayCommandCenter',
  'Care Command Center',
  'Prossima azione consigliata',
]);
assertFile('src/features/home/HomeScreen.tsx', [
  'HomeTodayCommandCenter',
  '<HomeTodayCommandCenter',
]);
assertFile('src/features/map/MapScreen.tsx', [
  'MapCareCommandCenter',
  '<MapCareCommandCenter',
]);

const forbiddenDocs = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/^(HOTFIX|BASELINE).*\.md$/i.test(entry.name)) {
      forbiddenDocs.push(path.relative(ROOT, full));
    }
  }
}
walk(path.join(ROOT, 'docs'));
if (forbiddenDocs.length) {
  fail(`File docs non ammessi: ${forbiddenDocs.join(', ')}`);
}

if (process.exitCode) {
  process.exit(process.exitCode);
}
console.log('[map-care-check] OK - BauBook 2.2.0 / app 0.5.0 Map & Care Command Center allineato.');
