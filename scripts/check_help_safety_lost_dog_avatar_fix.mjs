import fs from 'node:fs';
import path from 'node:path';

const repo = process.cwd();
const safety = fs.readFileSync(path.join(repo, 'src', 'shared', 'api', 'safety.ts'), 'utf8');
const alerts = fs.readFileSync(path.join(repo, 'src', 'features', 'alerts', 'AlertsScreen.tsx'), 'utf8');
const errors = [];

if (!/dogAvatarUrl\s*:\s*string\s*\|\s*null/.test(safety)) errors.push('SafetyAlertModel non espone dogAvatarUrl.');
if (!/avatar_url\??\s*:\s*string\s*\|\s*null/.test(safety)) errors.push('RelatedNameRow non espone avatar_url.');
if (!/dogs\(name, avatar_url\)/.test(safety)) errors.push('La query lost_dog_alerts non legge dogs(name, avatar_url).');
if (!/dogAvatarUrl:\s*dog\?\.avatar_url\s*\?\?\s*null/.test(safety)) errors.push('remoteLostToModel non popola dogAvatarUrl.');
if (!/dogAvatarUrl:\s*null/.test(safety)) errors.push('I modelli non-smarrimento/demo non impostano dogAvatarUrl null.');
if (!/alert\.dogAvatarUrl/.test(alerts)) errors.push('SafetyCard non renderizza alert.dogAvatarUrl.');
if (!/source=\{\{ uri: alert\.dogAvatarUrl \}\}/.test(alerts)) errors.push('L avatar cane smarrito non usa source={{ uri: alert.dogAvatarUrl }}.');

if (errors.length) {
  console.error('Check fallito:\n- ' + errors.join('\n- '));
  process.exit(1);
}
console.log('Check avatar cane smarrito OK.');
