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
  const polishCards = readText('src/features/home/components/HomeBetaPolishCards.tsx');

  assert(pkg.version === '0.4.2', 'package.json version attesa 0.4.2.');
  assert(app.expo.version === '0.4.2', 'app.json expo.version attesa 0.4.2.');
  assert(Number(app.expo.android.versionCode) === 23, 'Android versionCode atteso 23.');
  assert(String(app.expo.ios.buildNumber) === '23', 'iOS buildNumber atteso 23.');
  assert(app.expo.extra && app.expo.extra.baseline === '2.1.2', 'extra.baseline attesa 2.1.2.');

  assert(fs.existsSync('src/features/home/components/HomeBetaPolishCards.tsx'), 'HomeBetaPolishCards mancante.');
  assert(fs.existsSync('src/components/BauBookEmptyState.tsx'), 'BauBookEmptyState mancante.');
  assert(polishCards.includes('Benvenuto in BauBook Beta'), 'Box beta welcome mancante.');
  assert(polishCards.includes('Invia feedback beta'), 'CTA feedback beta mancante.');
  assert(polishCards.includes('BauBookContactSheet'), 'Feedback beta non usa modal embedded.');
  assert(!polishCards.includes('mailto:'), 'Feedback beta usa ancora mailto.');
  assert(!polishCards.includes('Linking.openURL'), 'Feedback beta apre ancora client esterno.');

  console.log('OK beta:polish:check - first run, feedback beta embedded ed empty states curati presenti.');
}

main();
