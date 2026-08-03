import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'));
const credentialSource = fs.readFileSync(
  new URL('credentials/IbmiMapepireApi.credentials.ts', root),
  'utf8',
);
const securitySource = fs.readFileSync(
  new URL('nodes/IbmiMapepire/lib/security.ts', root),
  'utf8',
);
const nodeSource = fs.readFileSync(
  new URL('nodes/IbmiMapepire/IbmiMapepire.node.ts', root),
  'utf8',
);
const errors = [];

if (!pkg.name.startsWith('n8n-nodes-')) errors.push('Package name must start with n8n-nodes-');
if (!pkg.keywords?.includes('n8n-community-node-package')) errors.push('Missing n8n community keyword');
if (pkg.license !== 'MIT') errors.push('Community package must use MIT license');
for (const file of [...(pkg.n8n?.credentials ?? []), ...(pkg.n8n?.nodes ?? [])]) {
  if (!file.startsWith('dist/')) errors.push(`n8n entry must point to dist: ${file}`);
}
if (pkg.engines?.node !== '>=22.22') {
  errors.push('Node engine must align with n8n 2.31.6 and permit Node.js 26');
}

if (pkg.dependencies?.['@ibm/mapepire-js'] !== '0.6.1') {
  errors.push('Mapepire client must be pinned to 0.6.1');
}

if (!nodeSource.includes("import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';")) {
  errors.push('Node must import the runtime NodeConnectionTypes constant');
}
if (!nodeSource.includes('inputs: [NodeConnectionTypes.Main]')) {
  errors.push('Node input must use NodeConnectionTypes.Main');
}
if (!nodeSource.includes('outputs: [NodeConnectionTypes.Main]')) {
  errors.push('Node output must use NodeConnectionTypes.Main');
}
if (/\bNodeConnectionType\.Main\b/.test(nodeSource)) {
  errors.push('Type-only NodeConnectionType must not be used as a runtime value');
}

const requiredCredentialNames = [
  'host',
  'port',
  'user',
  'password',
  'database',
  'ignoreUnauthorized',
  'caPath',
  'allowedReadSchemas',
  'allowedWriteSchema',
  'allowedFunctions',
  'poolEnabled',
  'poolSize',
  'poolWaitSeconds',
  'queryTraceEnabled',
  'slowQueryMs',
];
for (const name of requiredCredentialNames) {
  if (!credentialSource.includes(`name: '${name}'`)) {
    errors.push(`Missing credential field ${name}`);
  }
}
if (credentialSource.includes("name: 'allowedCreateLibraries'")) {
  errors.push('CREATE TABLE must use the singular SQL_ALLOWED_WRITE_SCHEMA, not a separate create list');
}
if (!securitySource.includes('Schema-qualified SQL routine')) {
  errors.push('Schema-qualified routine rejection is missing');
}
if (!securitySource.includes('SQL_ALLOWED_FUNCTIONS')) {
  errors.push('Function allowlist enforcement is missing');
}
if (!securitySource.includes('top-level WHERE')) {
  errors.push('Top-level UPDATE WHERE safeguard is missing');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Package metadata and required policy surface verification passed.');
