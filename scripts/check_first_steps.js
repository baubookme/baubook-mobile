const fs = require('fs');

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const app = readJson('app.json');
  const pkg = readJson('package.json');
  const component = readText('src/features/home/components/HomeFirstStepsCommandCenter.tsx');
  const data = readText('src/features/home/data/firstSteps.ts');

  assert(pkg.version === '0.4.2', 'package.json version attesa 0.4.2.');
  assert(app.expo.version === '0.4.2', 'app.json expo.version attesa 0.4.2.');
  assert(Number(app.expo.android.versionCode) === 23, 'Android versionCode atteso 23.');
  assert(String(app.expo.ios.buildNumber) === '23', 'iOS buildNumber atteso 23.');
  assert(app.expo.extra && app.expo.extra.baseline === '2.1.2', 'extra.baseline attesa 2.1.2.');

  assert(component.includes('Primi passi'), 'Titolo Primi passi mancante.');
  assert(data.includes('Completa il profilo cane'), 'Step profilo cane mancante.');
  assert(data.includes('Esplora la mappa'), 'Step mappa mancante.');
  assert(data.includes('Prova Safety'), 'Step Safety mancante.');
  assert(!component.includes('Invia feedback beta'), 'Step feedback beta deve essere rimosso dal componente.');
  assert(!data.includes('Invia feedback beta'), 'Step feedback beta deve essere rimosso dai dati.');
  assert(!component.includes('mailto:'), 'First steps non deve usare mailto.');

  console.log('OK first-steps:check - checklist a 3 step e versioni allineate.');
}

main();
