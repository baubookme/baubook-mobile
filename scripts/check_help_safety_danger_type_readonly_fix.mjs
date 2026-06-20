import fs from 'node:fs';
import path from 'node:path';

const target = path.join(process.cwd(), 'src', 'features', 'alerts', 'AlertsScreen.tsx');
const text = fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, '');
const failures = [];

if (!text.includes('const displayDangerType = myActiveDangerAlert?.dangerType ?? dangerType;')) {
  failures.push('Manca displayDangerType basato su myActiveDangerAlert.dangerType.');
}

if (!text.includes('dangerIconForType(displayDangerType ?? "other")')) {
  failures.push('Icona header pericolo non usa displayDangerType.');
}

if (!text.includes('selected={displayDangerType === option.type}')) {
  failures.push('Chip Tipo pericolo non usa displayDangerType.');
}

if (text.includes('selected={dangerType === option.type}')) {
  failures.push('Rimane un chip Tipo pericolo basato solo su dangerType locale.');
}

if (failures.length) {
  console.error('Check fallito:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log('Check OK: Tipo pericolo readonly legge la segnalazione attiva.');
