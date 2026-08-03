import fs from 'node:fs';

const expectedVersion = '0.41.2';
const packagePath = new URL('../node_modules/@n8n/node-cli/package.json', import.meta.url);

if (!fs.existsSync(packagePath)) {
  console.error([
    '@n8n/node-cli is not installed.',
    'Run a clean development install:',
    '  rm -rf node_modules package-lock.json',
    '  npm install',
  ].join('\n'));
  process.exit(1);
}

const installed = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;
if (installed !== expectedVersion) {
  console.error([
    `Incorrect @n8n/node-cli version: ${installed}`,
    `Required version: ${expectedVersion}`,
    'A stale node_modules directory or package-lock.json is normally the cause.',
    'Run:',
    '  rm -rf node_modules package-lock.json',
    '  npm install',
    '  npm exec -- n8n-node --version',
  ].join('\n'));
  process.exit(1);
}

console.log(`@n8n/node-cli ${installed} verified.`);
