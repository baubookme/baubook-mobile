const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const TARGET_APP_VERSION = '0.4.3';
const TARGET_BASELINE = '2.1.3';
const TARGET_ANDROID_VERSION_CODE = 20;
const TARGET_IOS_BUILD_NUMBER = '20';

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function writeText(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, 'utf8');
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function writeJson(file, data) {
  writeText(file, JSON.stringify(data, null, 2) + '\n');
}

function updatePackageJson() {
  const file = path.join(repoRoot, 'package.json');
  if (!fs.existsSync(file)) return false;

  const pkg = readJson(file);
  pkg.version = TARGET_APP_VERSION;
  pkg.scripts = pkg.scripts || {};

  pkg.scripts['device:beta:check'] = 'node scripts/check-no-store-device-launch.js';
  pkg.scripts['no-store:check'] = 'node scripts/check-no-store-device-launch.js --no-store';
  pkg.scripts['store:fasttrack:check'] = 'node scripts/check-no-store-device-launch.js --store';
  pkg.scripts['sponsor:pilot:check'] = 'node scripts/check-no-store-device-launch.js --sponsor';

  writeJson(file, pkg);
  return true;
}

function updateAppJson() {
  const file = path.join(repoRoot, 'app.json');
  if (!fs.existsSync(file)) return false;

  const appJson = readJson(file);
  const expo = appJson.expo || appJson;

  expo.version = TARGET_APP_VERSION;
  expo.extra = expo.extra || {};
  expo.extra.baubookBaseline = TARGET_BASELINE;
  expo.extra.baubookLaunchMode = 'no-store-device-beta';

  expo.android = expo.android || {};
  expo.android.versionCode = TARGET_ANDROID_VERSION_CODE;

  expo.ios = expo.ios || {};
  expo.ios.buildNumber = TARGET_IOS_BUILD_NUMBER;

  writeJson(file, appJson);
  return true;
}

function updatePackageLockText() {
  const file = path.join(repoRoot, 'package-lock.json');
  if (!fs.existsSync(file)) return false;

  let text = readText(file);
  text = text.replace(/("name"\s*:\s*"baubook"\s*,\s*"version"\s*:\s*)"[^"]+"/, `$1"${TARGET_APP_VERSION}"`);
  text = text.replace(/("packages"\s*:\s*\{\s*""\s*:\s*\{[\s\S]*?"version"\s*:\s*)"[^"]+"/, `$1"${TARGET_APP_VERSION}"`);
  writeText(file, text);
  return true;
}

function updateEasJson() {
  const file = path.join(repoRoot, 'eas.json');
  let eas = {};
  if (fs.existsSync(file)) {
    eas = readJson(file);
  }

  eas.cli = eas.cli || {};
  eas.cli.version = eas.cli.version || '>= 7.0.0';

  eas.build = eas.build || {};

  eas.build.preview = {
    ...(eas.build.preview || {}),
    distribution: 'internal',
    android: {
      ...((eas.build.preview && eas.build.preview.android) || {}),
      buildType: 'apk',
    },
  };

  eas.build['device-beta'] = {
    ...(eas.build['device-beta'] || {}),
    distribution: 'internal',
    android: {
      ...((eas.build['device-beta'] && eas.build['device-beta'].android) || {}),
      buildType: 'apk',
    },
  };

  eas.build.production = {
    ...(eas.build.production || {}),
    autoIncrement: true,
  };

  eas.submit = eas.submit || {};
  eas.submit.production = eas.submit.production || {};

  writeJson(file, eas);
  return true;
}

const changed = [];
if (updatePackageJson()) changed.push('package.json');
if (updatePackageLockText()) changed.push('package-lock.json');
if (updateAppJson()) changed.push('app.json');
if (updateEasJson()) changed.push('eas.json');

console.log(`Updated BauBook ${TARGET_BASELINE} / app ${TARGET_APP_VERSION} no-store device launch metadata. Files: ${changed.join(', ') || 'none'}.`);
