import fs from 'node:fs';
import path from 'node:path';

const candidates = [
  path.join('src', 'features', 'home', 'components', 'HomeDogDiaryLite.tsx'),
  path.join('src', 'features', 'home', 'HomeDogDiaryLite.tsx'),
];

const file = candidates.find((candidate) => fs.existsSync(candidate));
if (!file) {
  throw new Error('HomeDogDiaryLite.tsx non trovato nei path attesi.');
}

let text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
const original = text;
let patchedCount = 0;

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = openBraceIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function patchStyleBlockByName(source, styleName) {
  const styleRegex = new RegExp(`(\\n\\s*${styleName}\\s*:\\s*\\{)`, 'm');
  const match = styleRegex.exec(source);
  if (!match) return source;

  const openIndex = match.index + match[0].lastIndexOf('{');
  const closeIndex = findMatchingBrace(source, openIndex);
  if (closeIndex < 0) return source;

  const before = source.slice(0, openIndex + 1);
  let body = source.slice(openIndex + 1, closeIndex);
  const after = source.slice(closeIndex);

  let changed = false;

  if (/translateY\s*:\s*-?\d+/.test(body)) {
    body = body.replace(/translateY\s*:\s*-?\d+/g, 'translateY: -3');
    changed = true;
  } else if (/transform\s*:/.test(body)) {
    body = body.replace(/transform\s*:\s*\[[\s\S]*?\],?/m, 'transform: [{ translateY: -3 }],');
    changed = true;
  } else {
    body = `\n    transform: [{ translateY: -3 }],${body.startsWith('\n') ? '' : '\n'}${body}`;
    changed = true;
  }

  if (!/includeFontPadding\s*:/.test(body)) {
    body = body.replace(/^\n?/, '\n    includeFontPadding: false,');
    changed = true;
  }

  if (!/textAlignVertical\s*:/.test(body)) {
    body = body.replace(/^\n?/, "\n    textAlignVertical: 'center',");
    changed = true;
  }

  if (changed) patchedCount += 1;
  return before + body + after;
}

const styleNames = new Set();
const styleNameRegex = /\n\s*([A-Za-z0-9_]*[Rr]efresh[A-Za-z0-9_]*(?:Icon|Text|Glyph)[A-Za-z0-9_]*)\s*:\s*\{/g;
let styleMatch;
while ((styleMatch = styleNameRegex.exec(text)) !== null) {
  styleNames.add(styleMatch[1]);
}

for (const styleName of styleNames) {
  text = patchStyleBlockByName(text, styleName);
}

function ensureRefreshIconLiftStyle(source) {
  if (/\n\s*refreshIconLift\s*:/.test(source)) return source;
  const marker = '\n});';
  const insertIndex = source.lastIndexOf(marker);
  if (insertIndex < 0) {
    throw new Error('StyleSheet.create finale non trovato per inserire refreshIconLift.');
  }
  const entry = `,\n  refreshIconLift: {\n    transform: [{ translateY: -3 }],\n    includeFontPadding: false,\n    textAlignVertical: 'center',\n  }`;
  return source.slice(0, insertIndex) + entry + source.slice(insertIndex);
}

function patchRefreshGlyphText(source) {
  let changed = false;

  source = source.replace(
    /<Text([^>]*style=\{styles\.([A-Za-z0-9_]*[Rr]efresh[A-Za-z0-9_]*)\}[^>]*)>\s*(↻|⟳|🔄)\s*<\/Text>/g,
    (full, attrs, styleName, glyph) => {
      changed = true;
      return `<Text${attrs.replace(`style={styles.${styleName}}`, `style={[styles.${styleName}, styles.refreshIconLift]}`)}>${glyph}</Text>`;
    },
  );

  source = source.replace(
    /<Text([^>]*style=\{\[([^\]]*styles\.[A-Za-z0-9_]*[Rr]efresh[A-Za-z0-9_]*[^\]]*)\]\}[^>]*)>\s*(↻|⟳|🔄)\s*<\/Text>/g,
    (full, attrs, stylesList, glyph) => {
      if (stylesList.includes('styles.refreshIconLift')) return full;
      changed = true;
      const updatedAttrs = attrs.replace(`style={[${stylesList}]}`, `style={[${stylesList}, styles.refreshIconLift]}`);
      return `<Text${updatedAttrs}>${glyph}</Text>`;
    },
  );

  if (changed) {
    patchedCount += 1;
    return ensureRefreshIconLiftStyle(source);
  }
  return source;
}

text = patchRefreshGlyphText(text);

if (patchedCount === 0) {
  throw new Error('Nessuno stile/testo refresh trovato da patchare. Controlla HomeDogDiaryLite.tsx.');
}

if (text !== original) {
  fs.writeFileSync(file, text, 'utf8');
}

console.log(`Refresh icon allineata in ${file}. Patch applicate: ${patchedCount}.`);
