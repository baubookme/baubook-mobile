const fs = require('fs');
const path = require('path');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const repo = path.resolve(__dirname, '..');

  const pkg = readJson(path.join(repo, 'package.json'));
  const app = readJson(path.join(repo, 'app.json'));

  const diaryFile = path.join(repo, 'src', 'features', 'home', 'components', 'HomeDogDiaryLite.tsx');
  const backendFile = path.join(repo, 'src', 'features', 'home', 'dogDiaryBackend.ts');

  assert(pkg.version === '0.6.0', `package.json version attesa 0.6.0, trovata ${pkg.version}`);
  assert(app.expo.version === '0.6.0', `app.json expo.version attesa 0.6.0, trovata ${app.expo.version}`);
  assert(String(app.expo.extra && app.expo.extra.baseline) === '2.3.0', 'extra.baseline atteso 2.3.0');

  assert(fs.existsSync(diaryFile), 'HomeDogDiaryLite.tsx mancante.');
  assert(fs.existsSync(backendFile), 'dogDiaryBackend.ts mancante.');

  const diary = readText(diaryFile);
  const backend = readText(backendFile);

  assert(!diary.includes('AsyncStorage.getItem'), 'HomeDogDiaryLite non deve più usare AsyncStorage.getItem.');
  assert(!diary.includes('AsyncStorage.setItem'), 'HomeDogDiaryLite non deve più usare AsyncStorage.setItem.');
  assert(!diary.includes('@react-native-async-storage/async-storage'), 'HomeDogDiaryLite non deve importare AsyncStorage.');

  assert(diary.includes('loadDogDiaryEvents'), 'HomeDogDiaryLite deve caricare gli eventi da dogDiaryBackend.');
  assert(diary.includes('saveDogDiaryEvents'), 'HomeDogDiaryLite deve salvare gli eventi tramite dogDiaryBackend.');

  assert(backend.includes('loadDogDiaryEvents'), 'dogDiaryBackend deve esporre loadDogDiaryEvents.');
  assert(backend.includes('saveDogDiaryEvents'), 'dogDiaryBackend deve esporre saveDogDiaryEvents.');
  assert(backend.includes('dog_diary_events'), 'dogDiaryBackend deve usare la tabella dog_diary_events.');

  assert(diary.includes('Passeggiate') || diary.includes('passeggiate'), 'Filtro/categoria Passeggiate mancante.');
  assert(diary.includes('Salute') || diary.includes('salute'), 'Filtro/categoria Salute mancante.');
  assert(diary.includes('Note') || diary.includes('note'), 'Filtro/categoria Note mancante.');

  console.log('[dog-diary-check] OK - Dog Diary allineato a backend Supabase, senza persistenza locale runtime.');
}

main();
