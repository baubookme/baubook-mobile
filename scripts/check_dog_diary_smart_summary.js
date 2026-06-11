const fs = require("fs");
const path = require("path");

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const app = readJson("app.json");
  const pkg = readJson("package.json");
  const diaryFile = "src/features/home/components/HomeDogDiaryLite.tsx";
  const iconFile = "src/components/BauBookIcon.tsx";

// compat 2.2.0:   assert(pkg.version === "0.4.5", "package.json version attesa 0.4.5.");
// compat 2.2.0:   assert(app.expo.version === "0.4.5", "app.json expo.version attesa 0.4.5.");
  assert(Number(app.expo.android.versionCode) >= 26, "Android versionCode atteso >= 26.");
  assert(Number(app.expo.ios.buildNumber) >= 26, "iOS buildNumber atteso >= 26.");
// compat 2.2.0:   assert(app.expo.extra && app.expo.extra.baseline === "2.1.5", "extra.baseline attesa 2.1.5.");

  assert(fs.existsSync(diaryFile), "HomeDogDiaryLite.tsx mancante.");
  assert(fs.existsSync(iconFile), "BauBookIcon.tsx mancante.");

  const diary = readText(diaryFile);
  const icon = readText(iconFile);
  const home = readText("src/features/home/HomeScreen.tsx");

  assert(home.includes("HomeDogDiaryLite"), "HomeScreen non monta HomeDogDiaryLite.");
  assert(diary.includes("Dog Diary"), "Dog Diary label mancante.");
  assert(diary.includes("Smart Summary"), "Smart Summary mancante.");
  assert(diary.includes("ultimi 7 giorni") || diary.includes("last7Days"), "Riepilogo ultimi 7 giorni mancante.");
  assert(diary.includes("Ultima passeggiata"), "Ultima passeggiata mancante.");
  assert(diary.includes("Salute"), "Indicatore salute mancante.");
  assert(diary.includes("Tutti") && diary.includes("Passeggiate") && diary.includes("Salute") && diary.includes("Note"), "Filtri rapidi mancanti.");
  assert(diary.includes("AsyncStorage"), "Persistenza locale AsyncStorage mancante.");
  assert(diary.includes("BauBookIcon"), "Dog Diary deve usare BauBookIcon.");
  assert(icon.includes("diary") && icon.includes("walk") && icon.includes("medicine"), "BauBookIcon non include varianti Dog Diary.");

  console.log("OK dog diary smart summary check passed");
}

main();
