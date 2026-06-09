const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function writeText(file, text) {
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
  pkg.version = '0.3.5';
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['sponsored:rls:check'] = 'node scripts/check-sponsored-slots-rls-sql.js';
  writeJson(file, pkg);
  return true;
}

function updateAppJson() {
  const file = path.join(repoRoot, 'app.json');
  if (!fs.existsSync(file)) return false;
  const appJson = readJson(file);
  const expo = appJson.expo || appJson;

  expo.version = '0.3.5';
  expo.extra = expo.extra || {};
  expo.extra.baubookBaseline = '2.0.5';

  expo.android = expo.android || {};
  expo.android.versionCode = 18;

  expo.ios = expo.ios || {};
  expo.ios.buildNumber = '18';

  writeJson(file, appJson);
  return true;
}

function updatePackageLockText() {
  const file = path.join(repoRoot, 'package-lock.json');
  if (!fs.existsSync(file)) return false;
  let text = readText(file);
  text = text.replace(/("name"\s*:\s*"baubook"\s*,\s*"version"\s*:\s*)"[^"]+"/, '$1"0.3.5"');
  text = text.replace(/("packages"\s*:\s*\{\s*""\s*:\s*\{[\s\S]*?"version"\s*:\s*)"[^"]+"/, '$1"0.3.5"');
  writeText(file, text);
  return true;
}

const changed = [];
if (updatePackageJson()) changed.push('package.json');
if (updatePackageLockText()) changed.push('package-lock.json');
if (updateAppJson()) changed.push('app.json');

console.log(`Updated package/app metadata to BauBook 2.0.5 / app 0.3.5 where applicable. Files: ${changed.join(', ') || 'none'}.`);
