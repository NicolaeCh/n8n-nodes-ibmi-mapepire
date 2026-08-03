import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = new URL('./type-templates/', import.meta.url);
const targetRoot = new URL('../node_modules/.ibmi-mapepire-offline-types/', import.meta.url);
const files = ['n8n-workflow.d.ts.txt', 'node-globals.d.ts.txt'];

mkdirSync(targetRoot, { recursive: true });
for (const file of files) {
  const targetName = basename(file, '.txt');
  writeFileSync(new URL(targetName, targetRoot), readFileSync(new URL(file, sourceRoot), 'utf8'));
}

console.log(`Offline type declarations prepared in ${fileURLToPath(targetRoot)}`);
