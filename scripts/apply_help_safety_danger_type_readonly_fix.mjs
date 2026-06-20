import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const target = path.join(repoRoot, 'src', 'features', 'alerts', 'AlertsScreen.tsx');

if (!fs.existsSync(target)) {
  throw new Error(`File non trovato: ${target}`);
}

let text = fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, '');
const original = text;

if (!text.includes('const myActiveDangerAlert = useMemo(')) {
  throw new Error('Non trovo myActiveDangerAlert: baseline inattesa.');
}

if (!text.includes('const dangerTypeReady = Boolean(dangerType);')) {
  throw new Error('Non trovo dangerTypeReady: baseline inattesa.');
}

if (!text.includes('const displayDangerType =')) {
  text = text.replace(
    '  const dangerTypeReady = Boolean(dangerType);',
    '  const dangerTypeReady = Boolean(dangerType);\n  const displayDangerType = myActiveDangerAlert?.dangerType ?? dangerType;'
  );
}

text = text.replace(
  /<Image\s+source=\{dangerIconForType\(dangerType \?\? "other"\)\}\s+style=\{styles\.cardIcon\}\s*\/?>/,
  '<Image source={dangerIconForType(displayDangerType ?? "other")} style={styles.cardIcon} />'
);

text = text.replace(
  'selected={dangerType === option.type}',
  'selected={displayDangerType === option.type}'
);

if (text === original) {
  console.log('Nessuna modifica necessaria: fix gia applicato.');
} else {
  fs.writeFileSync(target, text, 'utf8');
  console.log('Applicato fix danger type readonly su AlertsScreen.tsx');
}
