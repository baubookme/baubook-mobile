#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i];
  const value = process.argv[i + 1];
  if (key.startsWith('--')) {
    args.set(key.slice(2), value ?? 'true');
    i += 1;
  }
}

const expected = {
  version: args.get('expected-version') ?? '0.3.1',
  baseline: args.get('expected-baseline') ?? '2.0.1',
  androidVersionCode: Number(args.get('expected-android-version-code') ?? 14),
  iosBuildNumber: String(args.get('expected-ios-build-number') ?? '14'),
};

const errors = [];
const warnings = [];

function readText(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8');
}

function readJson(rel) {
  const text = readText(rel);
  if (text === null) return null;
  return JSON.parse(text.replace(/^\uFEFF/, ''));
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function hasBom(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return false;
  const buffer = fs.readFileSync(file);
  return buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
}

const pkg = readJson('package.json');
assert(Boolean(pkg), 'package.json non leggibile');
if (pkg) {
  assert(pkg.version === expected.version, `package.json version attesa ${expected.version}, trovata ${pkg.version}`);
  assert(pkg.baubook?.baseline === expected.baseline, `package.json baubook.baseline attesa ${expected.baseline}, trovata ${pkg.baubook?.baseline}`);
  assert(pkg.baubook?.releaseName === 'Beta Trust Command Center', 'package.json baubook.releaseName non aggiornato');
  assert(Boolean(pkg.scripts?.['baubook:release:doctor']), 'script npm baubook:release:doctor mancante');
}

assert(!hasBom('package.json'), 'package.json contiene BOM');
assert(!hasBom('package-lock.json'), 'package-lock.json contiene BOM');

const appJson = readJson('app.json');
if (appJson?.expo) {
  assert(appJson.expo.version === expected.version, `app.json expo.version attesa ${expected.version}, trovata ${appJson.expo.version}`);
  if (appJson.expo.android?.versionCode !== undefined) {
    assert(Number(appJson.expo.android.versionCode) >= expected.androidVersionCode, `app.json android.versionCode deve essere >= ${expected.androidVersionCode}`);
  }
  if (appJson.expo.ios?.buildNumber !== undefined) {
    assert(String(appJson.expo.ios.buildNumber) === expected.iosBuildNumber, `app.json ios.buildNumber attesa ${expected.iosBuildNumber}`);
  }
}

assert(exists('src/shared/version/baubookVersion.ts'), 'src/shared/version/baubookVersion.ts mancante');
assert(exists('src/features/beta/BetaTrustCommandCenter.tsx'), 'BetaTrustCommandCenter.tsx mancante');
assert(exists('src/features/beta/index.ts'), 'src/features/beta/index.ts mancante');

const versionFile = readText('src/shared/version/baubookVersion.ts') ?? '';
assert(versionFile.includes("appVersion: '0.3.1'"), 'baubookVersion.ts non contiene appVersion 0.3.1');
assert(versionFile.includes("baseline: '2.0.1'"), 'baubookVersion.ts non contiene baseline 2.0.1');

const home = readText('src/features/home/HomeScreen.tsx');
if (home !== null) {
  warn(home.includes('BetaTrustCommandCenter'), 'HomeScreen non contiene BetaTrustCommandCenter: integrazione Home saltata o da verificare manualmente');
} else {
  warnings.push('HomeScreen.tsx non trovato in src/features/home: componente beta creato ma non integrato in Home');
}

const gitignore = readText('.gitignore') ?? '';
for (const entry of ['_baubook_work/', '_baubook_backups/', 'baubook_*.zip']) {
  warn(gitignore.includes(entry), `.gitignore non contiene ${entry}`);
}

const docsRoot = path.join(root, 'docs');
if (fs.existsSync(docsRoot)) {
  const forbidden = [];
  for (const name of fs.readdirSync(docsRoot)) {
    if (/^(HOTFIX|BASELINE).*\.md$/i.test(name)) forbidden.push(name);
  }
  assert(forbidden.length === 0, `docs contiene file non ammessi: ${forbidden.join(', ')}`);
}

console.log('');
console.log('BauBook release doctor');
console.log(`Expected version:  ${expected.version}`);
console.log(`Expected baseline: ${expected.baseline}`);

if (warnings.length) {
  console.log('');
  console.log('Warnings:');
  for (const item of warnings) console.log(`- ${item}`);
}

if (errors.length) {
  console.log('');
  console.log('Errors:');
  for (const item of errors) console.log(`- ${item}`);
  process.exit(1);
}

console.log('');
console.log('OK BauBook 2.0.1 release checks passed.');
