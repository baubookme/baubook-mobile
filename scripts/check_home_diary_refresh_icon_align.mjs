import fs from 'node:fs';
import path from 'node:path';

const candidates = [
  path.join('src', 'features', 'home', 'components', 'HomeDogDiaryLite.tsx'),
  path.join('src', 'features', 'home', 'HomeDogDiaryLite.tsx'),
];
const file = candidates.find((candidate) => fs.existsSync(candidate));
if (!file) {
  throw new Error('HomeDogDiaryLite.tsx non trovato.');
}
const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const errors = [];
if (!/translateY\s*:\s*-3/.test(text)) {
  errors.push('manca translateY: -3 per alzare il refresh');
}
if (!/includeFontPadding\s*:\s*false/.test(text)) {
  errors.push('manca includeFontPadding: false sul refresh');
}
if (!/refresh/i.test(text)) {
  errors.push('non trovo riferimenti refresh nel file');
}
if (errors.length) {
  throw new Error(`Check fallito:\n- ${errors.join('\n- ')}`);
}
console.log(`Check OK: refresh Home Diary leggermente riallineato in ${file}.`);
