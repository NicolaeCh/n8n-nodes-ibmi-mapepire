import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const EXPECTED_VERSION = '0.6.1';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = resolve(root, 'node_modules/@ibm/mapepire-js');
const packageJsonPath = resolve(packageRoot, 'package.json');
const bundlePath = resolve(packageRoot, 'dist/index.js');
const licensePath = resolve(packageRoot, 'LICENSE');
const vendorDirectory = resolve(root, 'dist/nodes/IbmiMapepire/lib/vendor');
const licenseDirectory = resolve(root, 'dist/vendor-licenses');
const targetBundle = resolve(vendorDirectory, 'mapepire-js.cjs');
const targetLicense = resolve(licenseDirectory, 'mapepire-js-LICENSE.txt');
const targetManifest = resolve(licenseDirectory, 'mapepire-js-MANIFEST.json');

removeDevelopmentBuildArtifacts(resolve(root, 'dist'));

const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
if (pkg.version !== EXPECTED_VERSION) {
	throw new Error(`Expected @ibm/mapepire-js ${EXPECTED_VERSION}, found ${pkg.version}`);
}
if (pkg.license !== 'Apache-2.0') {
	throw new Error(`Unexpected @ibm/mapepire-js license: ${pkg.license}`);
}
const bundle = readFileSync(bundlePath);
if (bundle.length < 40_000) {
	throw new Error(`Mapepire bundle is unexpectedly small (${bundle.length} bytes)`);
}
if (!bundle.includes(Buffer.from('Pool'))) {
	throw new Error('Mapepire bundle does not appear to export the Pool implementation');
}
const bundleText = bundle.toString('utf8');
if (/require\(["']ws["']\)/.test(bundleText)) {
	throw new Error('Mapepire published bundle unexpectedly retains an external ws runtime dependency');
}
const loadPackage = createRequire(import.meta.url);
const loadedRuntime = loadPackage(bundlePath);
if (typeof loadedRuntime?.Pool !== 'function') {
	throw new Error('Mapepire published bundle does not expose a Pool constructor');
}

mkdirSync(vendorDirectory, { recursive: true });
mkdirSync(licenseDirectory, { recursive: true });
copyFileSync(bundlePath, targetBundle);
copyFileSync(licensePath, targetLicense);
writeFileSync(
	targetManifest,
	JSON.stringify(
		{
			package: '@ibm/mapepire-js',
			version: EXPECTED_VERSION,
			license: pkg.license,
			upstream: pkg.repository?.url ?? 'https://github.com/Mapepire-IBMi/mapepire-js',
			sha256: createHash('sha256').update(bundle).digest('hex'),
			bytes: bundle.length,
		},
		null,
		2,
	) + '\n',
);
console.log(`Bundled official @ibm/mapepire-js ${EXPECTED_VERSION} (${bundle.length} bytes).`);

function removeDevelopmentBuildArtifacts(directory) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const child = resolve(directory, entry.name);
		if (entry.isDirectory()) {
			removeDevelopmentBuildArtifacts(child);
			continue;
		}
		if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.map')) {
			rmSync(child);
		}
	}
}
