#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const appPath = path.join(root, 'app.json');
const easPath = path.join(root, 'eas.json');

function readJson(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(text);
}
function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
function backup(file) {
  if (!fs.existsSync(file)) return;
  const rel = path.relative(root, file).replace(/[\\/:]/g, '_');
  const backupDir = path.join(root, '_baubook_backups', `backup_${new Date().toISOString().replace(/[:.]/g, '-')}_2_0_7_launch_check_fix`);
  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(file, path.join(backupDir, rel));
}

if (!fs.existsSync(pkgPath)) throw new Error('package.json mancante');
if (!fs.existsSync(appPath)) throw new Error('app.json mancante');

backup(pkgPath);
backup(appPath);
if (fs.existsSync(easPath)) backup(easPath);

const pkg = readJson(pkgPath);
pkg.version = '0.4.3';
pkg.scripts = pkg.scripts || {};
pkg.scripts['launch:check'] = 'node scripts/check-launch-readiness-207.js';
pkg.scripts['launch:check:strict'] = 'node scripts/check-launch-readiness-207.js --strict';
pkg.scripts['device:beta:check'] = 'node scripts/check-launch-readiness-207.js --device-beta';
pkg.scripts['no-store:check'] = 'node scripts/check-launch-readiness-207.js --no-store';
pkg.scripts['sponsor:pilot:check'] = pkg.scripts['sponsor:pilot:check'] || 'node scripts/check-launch-readiness-207.js --sponsor-pilot';
pkg.scripts['store:fasttrack:check'] = pkg.scripts['store:fasttrack:check'] || 'node scripts/check-launch-readiness-207.js --store-fasttrack';
writeJson(pkgPath, pkg);

const app = readJson(appPath);
app.expo = app.expo || {};
app.expo.version = '0.4.3';
app.expo.android = app.expo.android || {};
const currentVersionCode = Number(app.expo.android.versionCode || 0);
app.expo.android.versionCode = Math.max(currentVersionCode, 22);
app.expo.ios = app.expo.ios || {};
app.expo.ios.buildNumber = "22";
app.expo.extra = app.expo.extra || {};
app.expo.extra.baseline = '2.1.3';
writeJson(appPath, app);

if (fs.existsSync(easPath)) {
  const eas = readJson(easPath);
  eas.build = eas.build || {};
  eas.build.preview = eas.build.preview || {};
  eas.build.preview.distribution = eas.build.preview.distribution || 'internal';
  eas.build.preview.android = eas.build.preview.android || {};
  eas.build.preview.android.buildType = eas.build.preview.android.buildType || 'apk';
  eas.build['device-beta'] = eas.build['device-beta'] || {};
  eas.build['device-beta'].distribution = eas.build['device-beta'].distribution || 'internal';
  eas.build['device-beta'].android = eas.build['device-beta'].android || {};
  eas.build['device-beta'].android.buildType = eas.build['device-beta'].android.buildType || 'apk';
  writeJson(easPath, eas);
}

const docsDir = path.join(root, 'docs');
for (const name of ['DEVICE_BETA_QA.md', 'NO_STORE_DEVICE_LAUNCH.md', 'PLAY_STORE_FAST_TRACK.md', 'SPONSOR_LITE_SALES_PACK.md']) {
  const file = path.join(docsDir, name);
  if (fs.existsSync(file)) {
    backup(file);
    fs.rmSync(file, { force: true });
  }
}

console.log('OK check scripts allineati a BauBook 2.1.3 / app 0.4.3.');
