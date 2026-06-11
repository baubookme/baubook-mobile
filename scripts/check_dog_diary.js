const fs = require("fs");

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
  const homeScreen = readText("src/features/home/HomeScreen.tsx");
  const diary = readText("src/features/home/components/HomeDogDiaryLite.tsx");
  const icon = readText("src/components/BauBookIcon.tsx");

  assert(pkg.version === "0.4.4", "package.json version attesa 0.4.4.");
  assert(app.expo.version === "0.4.4", "app.json expo.version attesa 0.4.4.");
  assert(Number(app.expo.android.versionCode) >= 25, "Android versionCode atteso >= 25.");
  assert(Number(app.expo.ios.buildNumber) >= 25, "iOS buildNumber atteso >= 25.");
  assert(app.expo.extra && app.expo.extra.baseline === "2.1.4", "extra.baseline attesa 2.1.4.");

  assert(homeScreen.includes("HomeDogDiaryLite"), "HomeDogDiaryLite non montato in HomeScreen.");
  assert(diary.includes("Dog Diary"), "Label Dog Diary mancante.");
  assert(!/Diario Cane/i.test(diary), "Non usare Diario Cane come label app.");
  assert(diary.includes("AsyncStorage"), "Dog Diary deve salvare localmente via AsyncStorage.");
  assert(diary.includes("Aggiungi") && diary.includes("Salva evento"), "Form Dog Diary mancante.");
  assert(diary.includes("Passeggiata") && diary.includes("Veterinario") && diary.includes("Nota"), "Tipi evento Dog Diary incompleti.");
  assert(icon.includes("BauBookIcon") && icon.includes("diary") && icon.includes("partnership"), "BauBookIcon incompleto.");

  console.log("OK dog:diary:check - Dog Diary Lite e icon refresh presenti.");
}

main();
