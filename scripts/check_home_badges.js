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
  const text = readText('src/features/home/components/HomeTopInsightBadges.tsx');

  assert(pkg.version === '0.4.2', 'package.json version attesa 0.4.2.');
  assert(app.expo.version === '0.4.2', 'app.json expo.version attesa 0.4.2.');
  assert(Number(app.expo.android.versionCode) === 23, 'Android versionCode atteso 23.');
  assert(String(app.expo.ios.buildNumber) === '23', 'iOS buildNumber atteso 23.');
  assert(app.expo.extra && app.expo.extra.baseline === '2.1.2', 'extra.baseline attesa 2.1.2.');

  assert(text.includes('Tip della settimana'), 'Tip della settimana mancante.');
  assert(text.includes('Richiedi partnership'), 'Richiedi partnership mancante.');
  assert(text.includes('Chiudi'), 'Pulsante Chiudi mancante.');
  assert(text.includes('AsyncStorage'), 'Persistenza tip mancante.');
  assert(text.includes('BauBookContactSheet'), 'Modal embedded partnership mancante.');
  assert(!text.includes('mailto:'), 'Non deve esserci mailto nel badge partnership.');

  console.log('OK home badges check passed');
}

main();
