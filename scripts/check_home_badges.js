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

function includes(file, value) {
  return readText(file).includes(value);
}

function main() {
  const app = readJson("app.json");
  const pkg = readJson("package.json");
  const file = "src/features/home/components/HomeTopInsightBadges.tsx";
  const text = readText(file);

// compat 2.3.0:   assert(pkg.version === "0.6.0", "package.json version attesa 0.6.0.");
// compat 2.3.0:   assert(app.expo.version === "0.6.0", "app.json expo.version attesa 0.6.0.");
  assert(Number(app.expo.android.versionCode) >= 28, "app.json android.versionCode atteso >= 28.");
  assert(Number(app.expo.ios.buildNumber) >= 28, "app.json ios.buildNumber atteso >= 28.");
// compat 2.3.0:   assert(app.expo.extra && app.expo.extra.baseline === "2.3.0", "extra.baseline attesa 2.3.0.");

  assert(fs.existsSync(file), "HomeTopInsightBadges.tsx mancante.");
  assert(fs.existsSync("src/features/home/data/weeklyDogTips.ts"), "weeklyDogTips.ts mancante.");
  assert(includes("src/features/home/HomeScreen.tsx", "HomeTopInsightBadges"), "HomeScreen non importa/usa HomeTopInsightBadges.");

  assert(text.includes("Tip della settimana"), "Tip della settimana mancante.");
  assert(text.includes("Chiudi"), "Chiudi mancante nel tip.");
  assert(text.includes("position: 'absolute'") || text.includes('position: "absolute"'), "Chiudi deve stare assoluto nell'angolo del tip.");
  assert(text.includes("top: 10") || text.includes("top: 8") || text.includes("top: 12"), "Chiudi deve avere posizione top.");
  assert(text.includes("right: 10") || text.includes("right: 8") || text.includes("right: 12"), "Chiudi deve avere posizione right.");
  assert(!/news utile/i.test(text), "Il badge news utile non deve essere nel tip.");
  assert(text.includes("AsyncStorage"), "Persistenza chiusura tip via AsyncStorage mancante.");
  assert(text.includes("Richiedi partnership"), "Richiedi partnership mancante.");
  assert(text.includes("BauBookContactSheet"), "Partnership deve usare form embedded.");
  assert(!/mailto:/i.test(text), "HomeTopInsightBadges non deve usare mailto.");

  console.log("OK home badges check passed");
}

main();