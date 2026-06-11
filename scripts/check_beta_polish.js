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

function findFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      if (
        name === "node_modules" ||
        name === ".git" ||
        name === "_baubook_work" ||
        name === "_baubook_backups"
      ) {
        continue;
      }
      findFiles(full, predicate, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }

  return out;
}

function readExisting(files) {
  return files.filter((file) => fs.existsSync(file)).map(readText).join("\n");
}

function main() {
  const app = readJson("app.json");
  const pkg = readJson("package.json");

  assert(pkg.version === "0.4.5", "package.json version attesa 0.4.5.");
  assert(app.expo.version === "0.4.5", "app.json expo.version attesa 0.4.5.");
  assert(Number(app.expo.android.versionCode) >= 26, "Android versionCode atteso >= 26.");
  assert(Number(app.expo.ios.buildNumber) >= 26, "iOS buildNumber atteso >= 26.");
  assert(app.expo.extra && app.expo.extra.baseline === "2.1.5", "extra.baseline attesa 2.1.5.");

  const homeFiles = findFiles("src/features/home", (file) => file.endsWith(".tsx") || file.endsWith(".ts"));
  const homeText = readExisting(homeFiles);

  assert(/HomeTopInsightBadges/i.test(homeText), "HomeTopInsightBadges mancante.");
  assert(/HomeFirstStepsCommandCenter/i.test(homeText), "HomeFirstStepsCommandCenter mancante.");

  assert(
    /BauBook Beta|beta/i.test(homeText) &&
      /AsyncStorage|dismiss|Chiudi|first[-_ ]?run/i.test(homeText),
    "Box beta first-run/dismissibile mancante."
  );

  assert(
    fs.existsSync("src/components/BauBookEmptyState.tsx") ||
      fs.existsSync("src/features/home/components/BauBookEmptyState.tsx"),
    "BauBookEmptyState mancante."
  );

  assert(
    /Invia feedback beta|feedback beta/i.test(homeText) ||
      /Invia feedback beta|feedback beta/i.test(readExisting(findFiles("src", (file) => file.endsWith(".tsx") || file.endsWith(".ts")))),
    "Feedback beta embedded mancante."
  );

  assert(!/mailto:/i.test(homeText), "La Home non deve usare mailto.");

  console.log("OK beta:polish:check - first run, feedback beta ed empty states curati presenti.");
}

main();