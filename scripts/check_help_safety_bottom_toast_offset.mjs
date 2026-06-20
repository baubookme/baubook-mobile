import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'features', 'alerts', 'AlertsScreen.tsx');
const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');

const overlayMatches = [...text.matchAll(/toastOverlay\s*:\s*\{[\s\S]*?\n\s*\},/g)];
const textMatches = [...text.matchAll(/toastText\s*:\s*\{[\s\S]*?\n\s*\},/g)];

if (overlayMatches.length !== 1) {
  throw new Error(`toastOverlay duplicato o assente: trovati ${overlayMatches.length}.`);
}
if (textMatches.length !== 1) {
  throw new Error(`toastText duplicato o assente: trovati ${textMatches.length}.`);
}

const overlay = overlayMatches[0][0];
if (/\n\s*top\s*:/.test(overlay)) {
  throw new Error('toastOverlay usa ancora top; deve essere bottom-based.');
}
const bottomMatch = overlay.match(/\n\s*bottom\s*:\s*(\d+)\s*,/);
if (!bottomMatch) {
  throw new Error('toastOverlay non contiene bottom numerico.');
}
const bottom = Number(bottomMatch[1]);
if (bottom < 128) {
  throw new Error(`toastOverlay troppo basso: bottom=${bottom}.`);
}

console.log(`Check OK: toast bottom alzato a ${bottom}, nessun duplicato toastOverlay/toastText.`);
