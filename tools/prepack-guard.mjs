import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
	'dist/credentials/IbmiMapepireApi.credentials.js',
	'dist/nodes/IbmiMapepire/IbmiMapepire.node.js',
	'dist/nodes/IbmiMapepire/ibmi-mapepire-light.svg',
	'dist/nodes/IbmiMapepire/ibmi-mapepire-dark.svg',
	'dist/nodes/IbmiMapepire/lib/vendor/mapepire-js.cjs',
	'dist/vendor-licenses/mapepire-js-LICENSE.txt',
	'dist/vendor-licenses/mapepire-js-MANIFEST.json',
];

const missing = required.filter((file) => !existsSync(resolve(root, file)));
if (missing.length > 0) {
	console.error('Refusing to pack an incomplete n8n node. Missing verified build files:');
	for (const file of missing) console.error(`  - ${file}`);
	console.error('\nRun: npm run release:build');
	process.exit(1);
}

const manifestPath = resolve(root, 'dist/vendor-licenses/mapepire-js-MANIFEST.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const bundlePath = resolve(root, 'dist/nodes/IbmiMapepire/lib/vendor/mapepire-js.cjs');
const bundle = readFileSync(bundlePath);
const sha256 = createHash('sha256').update(bundle).digest('hex');

if (manifest.package !== '@ibm/mapepire-js' || manifest.version !== '0.6.1') {
	throw new Error('Embedded Mapepire manifest does not identify @ibm/mapepire-js 0.6.1');
}
if (manifest.bytes !== statSync(bundlePath).size || manifest.sha256 !== sha256) {
	throw new Error('Embedded Mapepire bundle does not match its integrity manifest');
}
if (bundle.length < 40_000 || !bundle.includes(Buffer.from('Pool'))) {
	throw new Error('Embedded Mapepire bundle failed structural validation');
}

console.log('Prepack guard passed: compiled node and verified Mapepire runtime are present.');
