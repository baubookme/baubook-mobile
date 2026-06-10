const fs = require("fs");

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
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
  const app = readJson("app.json");
  const pkg = readJson("package.json");

  assert(pkg.version === "0.4.0", "package.json version attesa 0.4.0.");
  assert(app.expo.version === "0.4.0", "app.json expo.version attesa 0.4.0.");
  assert(Number(app.expo.android.versionCode) >= 21, "app.json android.versionCode atteso >= 21.");
  assert(Number(app.expo.ios.buildNumber) >= 21, "app.json ios.buildNumber atteso >= 21.");

  assert(fs.existsSync("src/features/home/components/HomeTopInsightBadges.tsx"), "HomeTopInsightBadges.tsx mancante.");
  assert(fs.existsSync("src/features/home/data/weeklyDogTips.ts"), "weeklyDogTips.ts mancante.");

  assert(includes("src/features/home/HomeScreen.tsx", "HomeTopInsightBadges"), "HomeScreen non importa/usa HomeTopInsightBadges.");
  assert(includes("src/features/home/components/HomeTopInsightBadges.tsx", "Tip della settimana"), "Tip della settimana mancante.");
  assert(includes("src/features/home/components/HomeTopInsightBadges.tsx", "Richiedi partnership"), "Richiedi partnership mancante.");
  assert(includes("src/features/home/components/HomeTopInsightBadges.tsx", "admin@baubook.me"), "Email partnership admin@baubook.me mancante.");
  assert(includes("src/features/home/components/HomeTopInsightBadges.tsx", "Chiudi"), "Pulsante Chiudi mancante.");
  assert(includes("src/features/home/components/HomeTopInsightBadges.tsx", "AsyncStorage"), "Persistenza chiusura tip via AsyncStorage mancante.");

  console.log("OK home badges check passed");
}

main();
