const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const migrationPath = path.join(repoRoot, 'supabase', 'migrations', '0006_sponsored_slots_public_read_policy.sql');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(migrationPath)) {
  fail(`Missing migration: ${migrationPath}`);
}

const sql = fs.readFileSync(migrationPath, 'utf8').replace(/^\uFEFF/, '');
const required = [
  /alter\s+table\s+if\s+exists\s+public\.sponsored_slots\s+enable\s+row\s+level\s+security/i,
  /grant\s+select\s+on\s+table\s+public\.sponsored_slots\s+to\s+anon\s*,\s*authenticated/i,
  /create\s+policy\s+"sponsored_slots_public_read_active"/i,
  /for\s+select\s+to\s+anon\s*,\s*authenticated/i,
  /status\s*=\s*'active'/i,
  /starts_at\s+is\s+null\s+or\s+starts_at\s*<=\s*now\(\)/i,
  /ends_at\s+is\s+null\s+or\s+ends_at\s*>=\s*now\(\)/i,
];

for (const pattern of required) {
  if (!pattern.test(sql)) {
    fail(`Migration does not contain expected clause: ${pattern}`);
  }
}

console.log('OK: sponsored_slots RLS migration is present and contains the expected public active-slot read policy.');
