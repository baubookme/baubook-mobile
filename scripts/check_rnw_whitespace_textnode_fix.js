const fs = require('fs');

const checks = [];

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const appCard = read('src/shared/components/AppCard.tsx');
checks.push(['AppCard imports Children', appCard.includes('import { Children }')]);
checks.push(['AppCard helper', appCard.includes('function stripWhitespaceTextChildren')]);
checks.push(['AppCard sanitizes children', appCard.includes('const cardChildren = stripWhitespaceTextChildren(children);')]);
checks.push(['AppCard renders sanitized children', appCard.includes('{cardChildren}')]);

const screen = read('src/shared/components/Screen.tsx');
checks.push(['Screen imports Children', screen.includes('import { Children }')]);
checks.push(['Screen helper', screen.includes('function stripWhitespaceTextChildren')]);
checks.push(['Screen sanitizes children', screen.includes('const screenChildren = stripWhitespaceTextChildren(children);')]);
checks.push(['Screen renders sanitized children', screen.includes('{screenChildren}')]);

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Check RNW whitespace textnode fix fallito:');
  for (const [name] of failed) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log('Check RNW whitespace textnode fix OK');
