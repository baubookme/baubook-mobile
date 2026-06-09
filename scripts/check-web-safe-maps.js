const fs = require('fs');
const path = require('path');

const root = process.cwd();
const blockedDirs = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'web-build', '_baubook_work', '_baubook_backups']);
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const offenders = [];

function readText(file) {
  return fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (blockedDirs.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!sourceExtensions.has(ext)) {
      continue;
    }
    if (entry.name.includes('.native.')) {
      continue;
    }
    const text = readText(fullPath);
    const importsNativeMaps = /from\s+['"]react-native-maps['"]|require\(\s*['"]react-native-maps['"]\s*\)/.test(text);
    if (importsNativeMaps) {
      offenders.push(path.relative(root, fullPath));
    }
  }
}

walk(path.join(root, 'src'));

if (offenders.length > 0) {
  console.error('Found web-unsafe react-native-maps imports outside *.native files:');
  for (const offender of offenders) {
    console.error(`- ${offender}`);
  }
  process.exit(1);
}

console.log('OK: react-native-maps is isolated from the web bundle.');
