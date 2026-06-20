import fs from "node:fs";

const files = [
  {
    path: "src/shared/components/AppCard.tsx",
    functionName: "AppCard",
    constName: "cardChildren",
  },
  {
    path: "src/shared/components/Screen.tsx",
    functionName: "Screen",
    constName: "screenChildren",
  },
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function patchReactImports(text, filePath) {
  if (!text.includes("from 'react'") && !text.includes('from "react"')) {
    fail(`${filePath}: import da react non trovato.`);
  }

  if (!/import\s+\{\s*Children\s*\}\s+from\s+['"]react['"];/.test(text)) {
    text = `import { Children } from "react";\n` + text;
  }

  text = text.replace(/import type \{([^}]+)\} from ['"]react['"];?/g, (match, names) => {
    const parts = names.split(',').map((part) => part.trim()).filter(Boolean);
    if (!parts.includes('ReactNode')) {
      parts.push('ReactNode');
    }
    return `import type { ${parts.join(', ')} } from "react";`;
  });

  if (!/import type \{[^}]*ReactNode[^}]*\} from ['"]react['"];/.test(text)) {
    text = text.replace(
      /import \{ Children \} from "react";\n/,
      `import { Children } from "react";\nimport type { ReactNode } from "react";\n`,
    );
  }

  return text;
}

function ensureHelper(text, filePath) {
  if (text.includes("function stripWhitespaceTextChildren")) {
    return text;
  }

  const helper = `\nfunction stripWhitespaceTextChildren(children: ReactNode) {\n  return Children.toArray(children).filter(\n    (child) => typeof child !== "string" || child.trim().length > 0,\n  );\n}\n`;

  const interfaceIndex = text.indexOf("interface ");
  if (interfaceIndex < 0) {
    fail(`${filePath}: interface props non trovata, non inserisco helper.`);
  }

  const functionIndex = text.indexOf("export function ", interfaceIndex);
  if (functionIndex < 0) {
    fail(`${filePath}: export function non trovata, non inserisco helper.`);
  }

  return text.slice(0, functionIndex) + helper + text.slice(functionIndex);
}

function patchFunction(text, filePath, functionName, constName) {
  const fnRegex = new RegExp(`export function ${functionName}\\s*\\(([^)]*)\\)\\s*\\{`);
  const match = fnRegex.exec(text);
  if (!match) {
    fail(`${filePath}: funzione ${functionName} non trovata.`);
  }

  const fnStart = match.index;
  const bodyStart = match.index + match[0].length;
  const nextStyles = text.indexOf("const styles", bodyStart);
  const fnEnd = nextStyles > 0 ? nextStyles : text.length;
  const fnBlock = text.slice(fnStart, fnEnd);

  let newFnBlock = fnBlock;
  if (!newFnBlock.includes(`const ${constName} = stripWhitespaceTextChildren(children);`)) {
    const open = new RegExp(`(export function ${functionName}\\s*\\([^)]*\\)\\s*\\{)`);
    newFnBlock = newFnBlock.replace(
      open,
      `$1\n  const ${constName} = stripWhitespaceTextChildren(children);`,
    );
  }

  // Replace rendered children only inside this component body. Leave prop names/types untouched.
  newFnBlock = newFnBlock.replace(/\{children\}/g, `{${constName}}`);

  return text.slice(0, fnStart) + newFnBlock + text.slice(fnEnd);
}

let changed = false;

for (const config of files) {
  if (!fs.existsSync(config.path)) {
    fail(`${config.path} non trovato.`);
  }

  let text = fs.readFileSync(config.path, "utf8").replace(/^\uFEFF/, "");
  const before = text;

  text = patchReactImports(text, config.path);
  text = ensureHelper(text, config.path);
  text = patchFunction(text, config.path, config.functionName, config.constName);

  if (text !== before) {
    fs.writeFileSync(config.path, text, "utf8");
    console.log(`Patch applicata a ${config.path}`);
    changed = true;
  } else {
    console.log(`${config.path} gia' allineato.`);
  }
}

if (!changed) {
  console.log("Nessuna modifica necessaria.");
}
