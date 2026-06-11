const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGETS = [
  'src/features/map/MapScreen.tsx',
  'src/shared/api/supabaseContent.ts',
  'src/shared/hooks/useSupabasePublicData.ts',
  'src/features/home/components/HomeDogDiaryLite.tsx',
  'src/features/home/components/HomeTodayCommandCenter.tsx',
  'src/features/map/components/MapCareCommandCenter.tsx',
];

const FORBIDDEN_COPY = [
  'in preparazione',
  'fallback controllato',
  'agganceremo',
  'Range tecnico',
  'migration 0007',
  'debug',
  'mock',
  'fake',
];

let failed = false;
for (const relativePath of TARGETS) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    continue;
  }

  const content = fs.readFileSync(absolutePath, 'utf8').replace(/^\uFEFF/, '');
  for (const token of FORBIDDEN_COPY) {
    if (content.toLowerCase().includes(token.toLowerCase())) {
      console.error(`[presentability-check] Copy da cantiere in ${relativePath}: ${token}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('[presentability-check] OK - copy runtime ripulita da testi da cantiere nei file critici.');
