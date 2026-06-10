#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const EXPECTED = {
  packageVersion: '0.4.0',
  appVersion: '0.4.0',
  baseline: '2.1.0',
  androidVersionCodeMin: 20,
  iosBuildNumber: '20',
};

const REQUIRED_SCRIPTS = [
  'launch:check',
  'launch:check:strict',
  'docs:check',
  'beta:check',
  'safety:smoke',
  'device:beta:check',
  'no-store:check',
  'sponsor:pilot:check',
  'store:fasttrack:check',
];

const FORBIDDEN_DOCS = [
  'DEVICE_BETA_QA.md',
  'NO_STORE_DEVICE_LAUNCH.md',
  'PLAY_STORE_FAST_TRACK.md',
  'SPONSOR_LITE_SALES_PACK.md',
];

let failed = false;
function ok(message) {
  console.log(`OK ${message}`);
}
function fail(message) {
  failed = true;
  console.error(`FAIL ${message}`);
}
function readJson(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    fail(`${rel} mancante`);
    return null;
  }
  try {
    const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(text);
  } catch (error) {
    fail(`${rel} non e' JSON valido: ${error.message}`);
    return null;
  }
}

const pkg = readJson('package.json');
const app = readJson('app.json');
const eas = readJson('eas.json');

if (pkg) {
  if (pkg.version === EXPECTED.packageVersion) ok(`package.json version ${EXPECTED.packageVersion}`);
  else fail(`package.json version attesa ${EXPECTED.packageVersion}, trovata '${pkg.version}'`);

  const scripts = pkg.scripts || {};
  for (const name of REQUIRED_SCRIPTS) {
    if (Object.prototype.hasOwnProperty.call(scripts, name)) ok(`script npm ${name} presente`);
    else fail(`script npm ${name} mancante`);
  }
}

const expo = app && app.expo ? app.expo : null;
if (expo) {
  if (expo.version === EXPECTED.appVersion) ok(`app.json expo.version ${EXPECTED.appVersion}`);
  else fail(`app.json expo.version attesa ${EXPECTED.appVersion}, trovata '${expo.version}'`);

  const androidVersionCode = expo.android && Number(expo.android.versionCode);
  if (Number.isFinite(androidVersionCode) && androidVersionCode >= EXPECTED.androidVersionCodeMin) {
    ok(`Android versionCode >= ${EXPECTED.androidVersionCodeMin}`);
  } else {
    fail(`Android versionCode atteso >= ${EXPECTED.androidVersionCodeMin}, trovato '${expo.android && expo.android.versionCode}'`);
  }

  const iosBuildNumber = expo.ios && String(expo.ios.buildNumber || '');
  if (iosBuildNumber === EXPECTED.iosBuildNumber) ok(`iOS buildNumber ${EXPECTED.iosBuildNumber}`);
  else fail(`iOS buildNumber atteso ${EXPECTED.iosBuildNumber}, trovato '${iosBuildNumber}'`);

  const baseline = expo.extra && expo.extra.baseline;
  if (baseline === EXPECTED.baseline) ok(`extra.baseline ${EXPECTED.baseline}`);
  else fail(`extra.baseline atteso ${EXPECTED.baseline}, trovato '${baseline}'`);
} else if (app) {
  fail('app.json non contiene expo');
}

if (eas) {
  const build = eas.build || {};
  if (build['device-beta']) ok('EAS profile device-beta presente');
  else fail('EAS profile device-beta mancante');
  if (build.preview) ok('EAS profile preview presente');
  else fail('EAS profile preview mancante');
}

const docsDir = path.join(root, 'docs');
if (fs.existsSync(docsDir)) {
  for (const file of FORBIDDEN_DOCS) {
    if (fs.existsSync(path.join(docsDir, file))) fail(`docs/${file} non fa parte della documentazione compatta`);
    else ok(`docs/${file} assente`);
  }
}

const nativeMap = path.join(root, 'src', 'features', 'map', 'NativePlacesMap.native.tsx');
const webMap = path.join(root, 'src', 'features', 'map', 'NativePlacesMap.web.tsx');
if (fs.existsSync(nativeMap)) ok('NativePlacesMap.native.tsx presente');
else fail('NativePlacesMap.native.tsx mancante');
if (fs.existsSync(webMap)) ok('NativePlacesMap.web.tsx presente');
else fail('NativePlacesMap.web.tsx mancante');

if (failed) {
  process.exit(1);
}
console.log('OK BauBook 2.1.0 launch/no-store readiness allineata.');
