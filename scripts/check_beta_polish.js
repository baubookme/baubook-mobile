const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function stripBom(value) {
  return value.replace(/^\uFEFF/, '');
}

function readText(relativePath) {
  return stripBom(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function main() {
  const pkg = readJson('package.json');
  const homeScreen = readText('src/features/home/HomeScreen.tsx');
  const polishCards = readText('src/features/home/components/HomeBetaPolishCards.tsx');
  const emptyState = readText('src/components/BauBookEmptyState.tsx');
  const emptyCopy = readText('src/features/home/data/betaEmptyStates.ts');

  assert(pkg.version === '0.4.0', `package.json version attesa 0.4.0, trovata ${pkg.version}.`);
  assert(pkg.baubook && pkg.baubook.baseline === '2.1.0', 'baseline BauBook 2.1.0 mancante in package.json.');
  assert(pkg.scripts && pkg.scripts['beta:polish:check'] === 'node scripts/check_beta_polish.js', 'script beta:polish:check mancante.');

  const appJsonPath = path.join(repoRoot, 'app.json');
  if (fs.existsSync(appJsonPath)) {
    const appConfig = JSON.parse(stripBom(fs.readFileSync(appJsonPath, 'utf8')));
    const expo = appConfig.expo || appConfig;
    assert(expo.version === '0.4.0', `app.json expo.version attesa 0.4.0, trovata ${expo.version}.`);
    assert(Number(expo.android && expo.android.versionCode) >= 21, 'app.json android.versionCode atteso >= 21.');
    assert(Number(expo.ios && expo.ios.buildNumber) >= 21, 'app.json ios.buildNumber atteso >= 21.');
  }

  assert(exists('src/features/home/components/HomeBetaPolishCards.tsx'), 'HomeBetaPolishCards.tsx mancante.');
  assert(exists('src/components/BauBookEmptyState.tsx'), 'BauBookEmptyState.tsx mancante.');
  assert(exists('src/features/home/data/betaEmptyStates.ts'), 'betaEmptyStates.ts mancante.');

  assert(homeScreen.includes("./components/HomeBetaPolishCards"), 'HomeScreen non importa HomeBetaPolishCards.');
  assert(homeScreen.includes('<HomeBetaPolishCards />'), 'HomeScreen non renderizza HomeBetaPolishCards.');

  assert(polishCards.includes('Benvenuto in BauBook Beta'), 'Welcome beta mancante.');
  assert(polishCards.includes('Chiudi'), 'Pulsante Chiudi welcome beta mancante.');
  assert(polishCards.includes('DISMISSED_BETA_WELCOME_STORAGE_KEY'), 'Storage key welcome beta mancante.');
  assert(polishCards.includes('@react-native-async-storage/async-storage'), 'Persistenza welcome beta via AsyncStorage mancante.');
  assert(polishCards.includes('Invia feedback beta'), 'CTA feedback beta mancante.');
  assert(polishCards.includes('admin@baubook.me'), 'Email feedback admin@baubook.me mancante.');
  assert(polishCards.includes('Feedback beta BauBook'), 'Oggetto email feedback mancante.');

  assert(emptyState.includes('BauBookEmptyState'), 'Componente BauBookEmptyState non valido.');
  assert(emptyCopy.includes('Aggiungi il tuo primo cane'), 'Copy empty state cane mancante.');
  assert(emptyCopy.includes('Inizia una passeggiata'), 'Copy empty state passeggiata mancante.');
  assert(emptyCopy.includes('Stiamo popolando le aree della tua zona'), 'Copy empty state mappa mancante.');
  assert(emptyCopy.includes('Nessuna segnalazione attiva vicino a te'), 'Copy empty state safety mancante.');

  const combinedNewCopy = `${polishCards}\n${emptyState}\n${emptyCopy}`.toLowerCase();
  assert(!combinedNewCopy.includes('work in progress'), 'Copy work in progress presente nei nuovi file.');
  assert(!combinedNewCopy.includes('todo'), 'Copy TODO presente nei nuovi file.');
  assert(!combinedNewCopy.includes('placeholder'), 'Copy placeholder presente nei nuovi file.');

  console.log('OK beta:polish:check - first run, feedback beta ed empty states curati presenti.');
}

main();
