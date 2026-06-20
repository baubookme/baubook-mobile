import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'src', 'features', 'alerts', 'AlertsScreen.tsx');
let text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');

const matches = [...text.matchAll(/toastOverlay\s*:\s*\{[\s\S]*?\n\s*\},/g)];
if (matches.length !== 1) {
  throw new Error(`Atteso un solo blocco styles.toastOverlay, trovati ${matches.length}. Esegui prima il dedupe/fix del toast.`);
}

const originalBlock = matches[0][0];
let block = originalBlock;

// Il toast deve essere bottom-based, non top-based.
block = block.replace(/\n\s*top\s*:\s*[^,\n]+,?/g, '');

const targetBottom = 132;
if (/\n\s*bottom\s*:\s*[^,\n]+,?/.test(block)) {
  block = block.replace(/\n(\s*)bottom\s*:\s*[^,\n]+,?/, `\n$1bottom: ${targetBottom},`);
} else if (/position\s*:\s*["']absolute["']\s*,/.test(block)) {
  block = block.replace(/position\s*:\s*["']absolute["']\s*,/, `position: "absolute",\n    bottom: ${targetBottom},`);
} else {
  block = block.replace(/toastOverlay\s*:\s*\{/, `toastOverlay: {\n    bottom: ${targetBottom},`);
}

if (block === originalBlock) {
  console.log('toastOverlay gia allineato. Nessuna modifica necessaria.');
} else {
  text = text.replace(originalBlock, block);
  fs.writeFileSync(file, text, 'utf8');
  console.log(`toastOverlay alzato: bottom impostato a ${targetBottom}.`);
}
