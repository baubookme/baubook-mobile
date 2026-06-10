const fs = require('fs');

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function includes(file, value) {
  return readText(file).includes(value);
}

function main() {
  const app = readJson('app.json');
  const pkg = readJson('package.json');

  assert(pkg.version === '0.4.1', `package.json version attesa 0.4.1, trovata '${pkg.version}'.`);
  assert(app.expo.version === '0.4.1', `app.json expo.version attesa 0.4.1, trovata '${app.expo.version}'.`);
  assert(Number(app.expo.android.versionCode) >= 22, `Android versionCode atteso >= 22, trovato '${app.expo.android.versionCode}'.`);
  assert(Number(app.expo.ios.buildNumber) >= 22, `iOS buildNumber atteso >= 22, trovato '${app.expo.ios.buildNumber}'.`);

  const baseline = app.expo.extra?.baseline || app.expo.extra?.baubookBaseline || app.expo.extra?.baubook?.baseline;
  assert(baseline === '2.1.1', `extra.baseline attesa 2.1.1, trovata '${baseline}'.`);

  assert(pkg.scripts && pkg.scripts['first-steps:check'], 'script npm first-steps:check mancante.');
  assert(fs.existsSync('src/features/home/components/HomeFirstStepsCommandCenter.tsx'), 'HomeFirstStepsCommandCenter.tsx mancante.');
  assert(fs.existsSync('src/features/home/data/firstSteps.ts'), 'firstSteps.ts mancante.');

  assert(includes('src/features/home/HomeScreen.tsx', 'HomeFirstStepsCommandCenter'), 'HomeScreen non importa/usa HomeFirstStepsCommandCenter.');
  assert(includes('src/features/home/components/HomeFirstStepsCommandCenter.tsx', 'PRIMI PASSI'), 'titolo PRIMI PASSI mancante.');
  assert(includes('src/features/home/components/HomeFirstStepsCommandCenter.tsx', 'Cosa provare nella beta'), 'copy checklist beta mancante.');
  assert(includes('src/features/home/components/HomeFirstStepsCommandCenter.tsx', 'AsyncStorage'), 'persistenza checklist via AsyncStorage mancante.');
  assert(includes('src/features/home/components/HomeFirstStepsCommandCenter.tsx', 'admin@baubook.me'), 'feedback beta admin@baubook.me mancante.');
  assert(includes('src/features/home/data/firstSteps.ts', 'Completa il profilo cane'), 'step profilo cane mancante.');
  assert(includes('src/features/home/data/firstSteps.ts', 'Esplora la mappa'), 'step mappa mancante.');
  assert(includes('src/features/home/data/firstSteps.ts', 'Prova Safety'), 'step Safety mancante.');
  assert(includes('src/features/home/data/firstSteps.ts', 'Invia feedback beta'), 'step feedback beta mancante.');

  console.log('OK first-steps:check - command center primi passi presente e versioni allineate.');
}

main();
