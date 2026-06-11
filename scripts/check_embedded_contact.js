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

function exists(file) {
  return fs.existsSync(file);
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
  return files.filter(exists).map(readText).join("\n");
}

function main() {
  const app = readJson("app.json");
  const pkg = readJson("package.json");

// compat 2.3.0:   assert(pkg.version === "0.6.0", "package.json version attesa 0.6.0.");
// compat 2.3.0:   assert(app.expo.version === "0.6.0", "app.json expo.version attesa 0.6.0.");
  assert(Number(app.expo.android.versionCode) >= 28, "Android versionCode atteso >= 28.");
  assert(Number(app.expo.ios.buildNumber) >= 28, "iOS buildNumber atteso >= 28.");
// compat 2.3.0:   assert(app.expo.extra && app.expo.extra.baseline === "2.3.0", "extra.baseline attesa 2.3.0.");

  const homeFiles = findFiles("src/features/home", (file) => file.endsWith(".tsx") || file.endsWith(".ts"));
  const homeText = readExisting(homeFiles);

  assert(/Primi passi/i.test(homeText), "Box Primi passi mancante.");
  assert(/profilo[^\n]{0,120}cane|cane[^\n]{0,120}profilo/i.test(homeText), "Step profilo cane mancante.");
  assert(/mappa/i.test(homeText), "Step mappa mancante.");
  assert(/Safety/i.test(homeText), "Step Safety mancante.");

  const firstStepsFiles = homeFiles.filter((file) => /FirstSteps|CommandCenter/i.test(path.basename(file)));
  const firstStepsText = readExisting(firstStepsFiles);

  if (firstStepsText) {
    assert(!/Invia feedback beta/i.test(firstStepsText), "Invia feedback beta non deve essere nella checklist Primi passi.");
    assert(!/id:\s*['"`]feedback/i.test(firstStepsText), "Step feedback non deve essere nella checklist Primi passi.");
  }

  assert(/Richiedi partnership/i.test(homeText), "CTA Richiedi partnership mancante.");
  assert(/Tip della settimana/i.test(homeText), "Tip della settimana mancante.");

  const contactFiles = findFiles("src", (file) => file.endsWith(".tsx") || file.endsWith(".ts"));
  const contactText = readExisting(contactFiles);

  assert(/contact-request|contact_requests|ContactRequest|EmbeddedContact|BauBookContactSheet/i.test(contactText), "Flusso contatto embedded mancante.");
  assert(!/mailto:/i.test(contactText), "mailto non deve essere usato per feedback/partnership.");
  assert(/AsyncStorage/i.test(contactText), "Fallback/outbox locale AsyncStorage mancante.");

  assert(exists("supabase/functions/contact-request/index.ts"), "Supabase Edge Function contact-request mancante.");
  assert(
    exists("supabase/migrations/0010_contact_requests.sql") ||
      exists("supabase/migrations/0007_contact_requests.sql") ||
      exists("supabase/migrations/0006_contact_requests.sql"),
    "Migration contact_requests mancante."
  );

  const functionText = readText("supabase/functions/contact-request/index.ts");
  const migrationFile = exists("supabase/migrations/0010_contact_requests.sql")
    ? "supabase/migrations/0010_contact_requests.sql"
    : exists("supabase/migrations/0007_contact_requests.sql")
      ? "supabase/migrations/0007_contact_requests.sql"
      : "supabase/migrations/0006_contact_requests.sql";

  const migrationText = readText(migrationFile);

  assert(/CONTACT_TO_EMAIL/i.test(functionText), "CONTACT_TO_EMAIL mancante nella Edge Function.");
  assert(/RESEND_API_KEY/i.test(functionText), "RESEND_API_KEY mancante nella Edge Function.");
  assert(/admin@baubook\.me|CONTACT_TO_EMAIL/i.test(functionText), "Destinatario mailbox admin non configurato.");
  assert(/contact_requests/i.test(migrationText), "Tabella contact_requests mancante nella migration.");

  assert(!/contact_phone[^\n]{0,120}not null/i.test(migrationText), "Il telefono non deve essere obbligatorio.");
  assert(!/phone[^\n]{0,120}not null/i.test(migrationText), "Il telefono non deve essere obbligatorio.");

  console.log("OK embedded contact check passed");
}

main();