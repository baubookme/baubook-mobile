import fs from 'node:fs';
import path from 'node:path';

const repo = process.cwd();
const safetyPath = path.join(repo, 'src', 'shared', 'api', 'safety.ts');
const alertsPath = path.join(repo, 'src', 'features', 'alerts', 'AlertsScreen.tsx');

function read(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}
function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
}
function ensure(condition, message) {
  if (!condition) throw new Error(message);
}
function replaceOnce(text, search, replacement, label) {
  if (text.includes(replacement)) return text;
  ensure(text.includes(search), `Pattern non trovato: ${label}`);
  return text.replace(search, replacement);
}

function patchSafetyApi() {
  let text = read(safetyPath);

  // SafetyAlertModel may be formatted on one line or many lines. Insert before actionHint when missing.
  if (!/dogAvatarUrl\s*:/.test(text)) {
    text = text.replace(/(radiusLabel\s*:\s*string;\s*)actionHint\s*:/, '$1dogAvatarUrl: string | null; actionHint:');
    ensure(/dogAvatarUrl\s*:/.test(text), 'Non sono riuscito ad aggiungere dogAvatarUrl a SafetyAlertModel');
  }

  // The dog relation row is reused by lost alerts. Allow avatar_url there.
  if (!/avatar_url\??\s*:\s*string\s*\|\s*null/.test(text)) {
    text = text.replace(/interface\s+RelatedNameRow\s*\{\s*name\??\s*:\s*string\s*\|\s*null;\s*\}/, 'interface RelatedNameRow { name?: string | null; avatar_url?: string | null; }');
    ensure(/avatar_url\??\s*:\s*string\s*\|\s*null/.test(text), 'Non sono riuscito ad aggiungere avatar_url a RelatedNameRow');
  }

  // Fetch dog avatar with the dog name.
  text = text.replace(/dogs\(name\)/g, 'dogs(name, avatar_url)');

  // Put dog avatar in lost alert model.
  if (!/dogAvatarUrl:\s*dog\?\.avatar_url/.test(text)) {
    text = text.replace(/(dogName,\s*ownerName:)/, 'dogName, dogAvatarUrl: dog?.avatar_url ?? null, ownerName:');
    ensure(/dogAvatarUrl:\s*dog\?\.avatar_url/.test(text), 'Non sono riuscito ad aggiungere dogAvatarUrl nel modello smarrimento');
  }

  // Put null dogAvatarUrl in danger model.
  if (!/dogName:\s*null,\s*dogAvatarUrl:\s*null/.test(text)) {
    text = text.replace(/(dogName:\s*null,\s*ownerName:)/, 'dogName: null, dogAvatarUrl: null, ownerName:');
    ensure(/dogName:\s*null,\s*dogAvatarUrl:\s*null/.test(text), 'Non sono riuscito ad aggiungere dogAvatarUrl nel modello pericolo');
  }

  // Put null dogAvatarUrl in demo model.
  if (!/dogName:\s*danger \? null : 'Spritz demo',\s*dogAvatarUrl:\s*null/.test(text)) {
    text = text.replace(/(dogName:\s*danger \? null : 'Spritz demo',\s*ownerName:)/, "dogName: danger ? null : 'Spritz demo', dogAvatarUrl: null, ownerName:");
  }

  write(safetyPath, text);
}

function patchAlertsScreen() {
  let text = read(alertsPath);

  const marker = `{danger ? (\n            <Image source={dangerIconForType(alert.dangerType ?? "other")} style={styles.alertCircleIcon} />\n          ) : (\n            <Image source={baubookImages.safetyCircles.lostHelp} style={styles.alertCircleIcon} />\n          )}`;
  const replacement = `{danger ? (\n            <Image source={dangerIconForType(alert.dangerType ?? "other")} style={styles.alertCircleIcon} />\n          ) : (\n            <>\n              <Image source={baubookImages.safetyCircles.lostHelp} style={styles.alertCircleIcon} />\n              {alert.dogAvatarUrl ? (\n                <Image source={{ uri: alert.dogAvatarUrl }} style={styles.alertCircleIcon} />\n              ) : null}\n            </>\n          )}`;

  if (!/alert\.dogAvatarUrl/.test(text)) {
    text = replaceOnce(text, marker, replacement, 'avatar smarrimento nella colonna icone');
  }

  write(alertsPath, text);
}

patchSafetyApi();
patchAlertsScreen();
console.log('Patch avatar cane smarrito applicata.');
