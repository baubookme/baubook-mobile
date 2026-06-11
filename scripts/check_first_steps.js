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
  const text = readText("src/features/home/data/firstSteps.ts");

  assert(pkg.version === "0.4.4", "package.json version attesa 0.4.4.");
  assert(app.expo.version === "0.4.4", "app.json expo.version attesa 0.4.4.");
  assert(Number(app.expo.android.versionCode) >= 25, "Android versionCode atteso >= 25.");
  assert(Number(app.expo.ios.buildNumber) >= 25, "iOS buildNumber atteso >= 25.");
  assert(app.expo.extra && app.expo.extra.baseline === "2.1.4", "extra.baseline attesa 2.1.4.");

  assert(text.includes("Completa il profilo cane"), "Step profilo cane mancante.");
  assert(text.includes("Esplora la mappa"), "Step mappa mancante.");
  assert(text.includes("Prova Safety"), "Step Safety mancante.");
  assert(!text.includes("Invia feedback beta"), "Feedback beta non deve essere nei Primi passi.");

  console.log("OK first-steps:check - command center primi passi presente e versioni allineate.");
}

main();
