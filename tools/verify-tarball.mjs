import { createHash } from 'node:crypto';
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const tarball = process.argv[2];
if (!tarball) throw new Error('Usage: node tools/verify-tarball.mjs <package.tgz>');
const directory = mkdtempSync(join(tmpdir(), 'ibmi-mapepire-tarball-'));
try {
	const extract = spawnSync('tar', ['-xzf', resolve(tarball), '-C', directory], {
		stdio: 'inherit',
	});
	if (extract.status !== 0) process.exit(extract.status ?? 1);

	const packageRoot = join(directory, 'package');
	const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
	if (pkg.name !== '@nicolaech/n8n-nodes-ibmi-db2-mapepire') {
		throw new Error(`Unexpected npm package identity: ${pkg.name}`);
	}
	if (pkg.publishConfig?.access !== 'public') {
		throw new Error('Scoped package must declare public npm access');
	}
	if (pkg.dependencies && Object.keys(pkg.dependencies).length) {
		throw new Error('Tarball declares runtime dependencies');
	}
	if (JSON.stringify(pkg.peerDependencies) !== JSON.stringify({ 'n8n-workflow': '*' })) {
		throw new Error('Tarball peerDependencies are invalid');
	}
	if (pkg.peerDependenciesMeta?.['n8n-workflow']?.optional !== true) {
		throw new Error('Tarball must mark n8n-workflow as an optional host peer');
	}

	const installRoot = join(directory, 'production-install');
	mkdirSync(installRoot, { recursive: true });
	writeFileSync(join(installRoot, 'package.json'), '{"private":true}\n');
	const productionInstall = spawnSync(
		'npm',
		[
			'install',
			resolve(tarball),
			'--omit=dev',
			'--ignore-scripts',
			'--no-audit',
			'--no-fund',
			'--package-lock=false',
			'--offline',
		],
		{ cwd: installRoot, encoding: 'utf8' },
	);
	if (productionInstall.status !== 0) {
		throw new Error(
			`Clean production install failed:\n${productionInstall.stdout}${productionInstall.stderr}`,
		);
	}
	for (const forbiddenDependency of ['n8n-workflow', 'isolated-vm']) {
		if (containsDirectoryNamed(join(installRoot, 'node_modules'), forbiddenDependency)) {
			throw new Error(`Production install unexpectedly contains ${forbiddenDependency}`);
		}
	}

	const allFiles = walk(packageRoot).map((file) => file.slice(packageRoot.length + 1));
	for (const forbiddenPrefix of [
		'credentials/',
		'nodes/',
		'test/',
		'tools/',
		'scripts/',
		'.github/',
		'.test-dist/',
	]) {
		if (allFiles.some((file) => file.startsWith(forbiddenPrefix))) {
			throw new Error(`Tarball contains development source: ${forbiddenPrefix}`);
		}
	}
	for (const suffix of ['.ts', '.d.ts', '.map']) {
		if (allFiles.some((file) => file.endsWith(suffix))) {
			throw new Error(`Tarball contains excluded build artifact: ${suffix}`);
		}
	}

	const runtimePath = join(
		packageRoot,
		'dist/nodes/IbmiMapepire/lib/mapepireRuntime.js',
	);
	const runtime = readFileSync(runtimePath, 'utf8');
	if (!runtime.includes('./vendor/mapepire-js.cjs')) {
		throw new Error('Compiled node does not load bundled Mapepire');
	}
	if (/require\(["']@ibm\/mapepire-js["']\)/.test(runtime)) {
		throw new Error('Compiled runtime retains external Mapepire require');
	}

	const vendorPath = join(
		packageRoot,
		'dist/nodes/IbmiMapepire/lib/vendor/mapepire-js.cjs',
	);
	const licensePath = join(
		packageRoot,
		'dist/vendor-licenses/mapepire-js-LICENSE.txt',
	);
	const manifestPath = join(
		packageRoot,
		'dist/vendor-licenses/mapepire-js-MANIFEST.json',
	);
	const vendor = readFileSync(vendorPath);
	const license = readFileSync(licensePath, 'utf8');
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
	if (vendor.length < 40_000) throw new Error('Bundled Mapepire runtime is missing or truncated');
	if (!license.includes('Apache License')) throw new Error('Bundled Mapepire license is invalid');
	if (manifest.package !== '@ibm/mapepire-js' || manifest.version !== '0.6.1') {
		throw new Error('Bundled Mapepire manifest identity is invalid');
	}
	if (manifest.license !== 'Apache-2.0') throw new Error('Bundled Mapepire manifest license is invalid');
	if (manifest.bytes !== vendor.length) throw new Error('Bundled Mapepire manifest size mismatch');
	const digest = createHash('sha256').update(vendor).digest('hex');
	if (manifest.sha256 !== digest) throw new Error('Bundled Mapepire manifest checksum mismatch');

	// Smoke-load the exact clean-installed JavaScript entry points while resolving
	// n8n-workflow only from a host NODE_PATH. n8n initializes NODE_PATH from its
	// own module paths before loading community packages.
	const hostNodeModules = join(directory, 'host', 'node_modules');
	const workflowDirectory = join(hostNodeModules, 'n8n-workflow');
	mkdirSync(workflowDirectory, { recursive: true });
	copyFileSync(
		new URL('../test/fakes/n8n-workflow/index.js', import.meta.url),
		join(workflowDirectory, 'index.js'),
	);
	const installedPackageRoot = join(
		installRoot,
		'node_modules',
		...pkg.name.split('/'),
	);
	const smokeScript = `
		const nodeModule = require(${JSON.stringify(join(installedPackageRoot, 'dist/nodes/IbmiMapepire/IbmiMapepire.node.js'))});
		const credentialModule = require(${JSON.stringify(join(installedPackageRoot, 'dist/credentials/IbmiMapepireApi.credentials.js'))});
		if (typeof nodeModule.IbmiMapepire !== 'function') throw new Error('Compiled node class could not be loaded');
		if (typeof credentialModule.IbmiMapepireApi !== 'function') throw new Error('Compiled credential class could not be loaded');
		const node = new nodeModule.IbmiMapepire();
		const credential = new credentialModule.IbmiMapepireApi();
		if (node.description.name !== 'ibmiMapepire') throw new Error('Loaded node identity is invalid');
		if (credential.name !== 'ibmiMapepireApi') throw new Error('Loaded credential identity is invalid');
	`;
	const smokeLoad = spawnSync(process.execPath, ['-e', smokeScript], {
		encoding: 'utf8',
		env: {
			...process.env,
			NODE_PATH: [hostNodeModules, process.env.NODE_PATH].filter(Boolean).join(delimiter),
		},
	});
	if (smokeLoad.status !== 0) {
		throw new Error(`Host-resolved runtime smoke load failed:
${smokeLoad.stdout}${smokeLoad.stderr}`);
	}

	console.log(
		`Tarball verification passed (${vendor.length} bundled Mapepire bytes, ${allFiles.length} files).`,
	);
} finally {
	rmSync(directory, { recursive: true, force: true });
}

function walk(directory) {
	if (!existsSync(directory)) return [];
	const files = [];
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const child = join(directory, entry.name);
		if (entry.isDirectory()) files.push(...walk(child));
		else files.push(child);
	}
	return files;
}

function containsDirectoryNamed(directory, targetName) {
	if (!existsSync(directory)) return false;
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		if (entry.name === targetName) return true;
		if (containsDirectoryNamed(join(directory, entry.name), targetName)) return true;
	}
	return false;
}
