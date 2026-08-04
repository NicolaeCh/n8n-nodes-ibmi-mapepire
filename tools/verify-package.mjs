import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const requireDist = process.argv.includes('--dist-required');
const pkg = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'));
const credentialSource = fs.readFileSync(new URL('credentials/IbmiMapepireApi.credentials.ts', root), 'utf8');
const securitySource = fs.readFileSync(new URL('nodes/IbmiMapepire/lib/security.ts', root), 'utf8');
const nodeSource = fs.readFileSync(new URL('nodes/IbmiMapepire/IbmiMapepire.node.ts', root), 'utf8');
const runtimeSource = fs.readFileSync(new URL('nodes/IbmiMapepire/lib/mapepireRuntime.ts', root), 'utf8');
const poolManagerSource = fs.readFileSync(new URL('nodes/IbmiMapepire/lib/poolManager.ts', root), 'utf8');
if (/throw new IbmiMapepireError\(`Mapepire pool initialization failed/.test(poolManagerSource)) errors.push('Pool initialization must not throw a custom error from the infrastructure helper');
const errors = [];

const eslintConfig = fs.readFileSync(new URL('eslint.config.mjs', root), 'utf8');
if (!eslintConfig.includes("import { config } from '@n8n/node-cli/eslint'")) errors.push('ESLint must load the official @n8n/node-cli configuration');
if (!eslintConfig.includes('...config')) errors.push('ESLint must extend the official n8n configuration');
if (!pkg.name.startsWith('n8n-nodes-')) errors.push('Package name must start with n8n-nodes-');
if (!pkg.keywords?.includes('n8n-community-node-package')) errors.push('Missing n8n community keyword');
if (pkg.license !== 'MIT') errors.push('Community package must use MIT license');
if (pkg.n8n?.strict !== false) errors.push('This filesystem-capable self-hosted node must explicitly set n8n.strict=false');
for (const file of [...(pkg.n8n?.credentials ?? []), ...(pkg.n8n?.nodes ?? [])]) {
	if (!file.startsWith('dist/')) errors.push(`n8n entry must point to dist: ${file}`);
}
if (pkg.engines?.node) errors.push('Do not impose a package Node.js range; use the n8n host support matrix');
if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) errors.push('Community package must not declare runtime dependencies');
const peerEntries = Object.entries(pkg.peerDependencies ?? {});
if (peerEntries.length !== 1 || pkg.peerDependencies?.['n8n-workflow'] !== '*') {
	errors.push('peerDependencies must contain only n8n-workflow: "*"');
}
if (pkg.devDependencies?.['@ibm/mapepire-js'] !== '0.6.1') errors.push('Mapepire build input must be pinned to 0.6.1');
if (pkg.devDependencies?.['@n8n/node-cli'] !== '0.41.2') errors.push('Development CLI must be pinned to 0.41.2');
for (const forbidden of ['prepare', 'preinstall', 'install', 'postinstall', 'prepublish', 'preprepare', 'postprepare']) {
	if (pkg.scripts?.[forbidden]) errors.push(`Forbidden installation lifecycle script: ${forbidden}`);
}
if (!pkg.scripts?.postbuild?.includes('vendor-mapepire.mjs')) errors.push('Build must vendor the official Mapepire bundle');
if (!nodeSource.includes("light: 'file:ibmi-mapepire-light.svg'")) errors.push('Light node icon is missing');
if (!nodeSource.includes("dark: 'file:ibmi-mapepire-dark.svg'")) errors.push('Dark node icon is missing');
const lightIcon = nodeSource.match(/light:\s*'file:([^']+)'/)?.[1];
const darkIcon = nodeSource.match(/dark:\s*'file:([^']+)'/)?.[1];
if (lightIcon && darkIcon && lightIcon === darkIcon) errors.push('Light and dark icons must differ');
if (!nodeSource.includes('inputs: [NodeConnectionTypes.Main]')) errors.push('Node input must use NodeConnectionTypes.Main');
if (!nodeSource.includes('outputs: [NodeConnectionTypes.Main]')) errors.push('Node output must use NodeConnectionTypes.Main');
if (/\bNodeConnectionType\.Main\b/.test(nodeSource)) errors.push('Type-only NodeConnectionType used as runtime value');
if (!nodeSource.includes('usableAsTool: false')) errors.push('Write-capable node must not be exposed as an AI tool');
if (/description:\s*'Run a qualified, allowlisted SELECT statement\.'/m.test(nodeSource)) errors.push('SELECT option description must not end in a period');
if (/description:\s*'Run INSERT INTO \.\.\. VALUES against an allowlisted library\.'/m.test(nodeSource)) errors.push('INSERT option description must not end in a period');
if (/description:\s*'Run an UPDATE against an allowlisted library\.'/m.test(nodeSource)) errors.push('UPDATE option description must not end in a period');
if (/description:\s*'Create a table with explicit column definitions\.'/m.test(nodeSource)) errors.push('CREATE TABLE option description must not end in a period');
if (/description:\s*'Whether to add SQL state\/code, row counts, timing, and truncation information\.'/m.test(nodeSource)) errors.push('Metadata option description must not end in a period');
if (!nodeSource.includes("testedBy: 'ibmiMapepireCredentialTest'")) errors.push('Credential test association is missing');
if (!credentialSource.includes("displayName = 'IBM I Mapepire API'")) errors.push('Credential display name is invalid');
if (!credentialSource.includes("light: 'file:../nodes/IbmiMapepire/ibmi-mapepire-light.svg'") || !credentialSource.includes("dark: 'file:../nodes/IbmiMapepire/ibmi-mapepire-dark.svg'")) errors.push('Credential must use distinct themed icons');
if (!credentialSource.includes('typeOptions: { rows: 6, password: true }')) errors.push('CA certificate must be sensitive');
for (const name of ['host','port','user','password','database','ignoreUnauthorized','caPath','allowedReadSchemas','allowedWriteSchema','allowedFunctions','poolEnabled','poolSize','poolWaitSeconds','queryTraceEnabled','slowQueryMs']) {
	if (!credentialSource.includes(`name: '${name}'`)) errors.push(`Missing credential field ${name}`);
}
if (!securitySource.includes('Schema-qualified SQL routine')) errors.push('Schema-qualified routine rejection is missing');
if (!securitySource.includes('SQL_ALLOWED_FUNCTIONS')) errors.push('Function allowlist is missing');
if (!securitySource.includes('top-level WHERE')) errors.push('Top-level UPDATE WHERE safeguard is missing');
if (/throw new Error\(/.test(securitySource)) errors.push('Security helpers must not throw native Error');
if (!runtimeSource.includes("loadBundledModule('./vendor/mapepire-js.cjs')")) errors.push('Runtime must load the relative bundled Mapepire client');
for (const sourceFile of walk(new URL('nodes/', root))) {
	if (!sourceFile.pathname.endsWith('.ts')) continue;
	const contents = fs.readFileSync(sourceFile, 'utf8');
	if (/from ['"]@ibm\/mapepire-js['"]/.test(contents) || /require\(["']@ibm\/mapepire-js["']\)/.test(contents)) {
		errors.push(`Source-level Mapepire package import remains in ${sourceFile.pathname}`);
	}
}

const distRoot = new URL('dist/', root);
if (requireDist && !fs.existsSync(distRoot)) errors.push('dist is required but missing');
if (requireDist && fs.existsSync(distRoot)) {
	const vendor = new URL('nodes/IbmiMapepire/lib/vendor/mapepire-js.cjs', distRoot);
	const license = new URL('vendor-licenses/mapepire-js-LICENSE.txt', distRoot);
	const manifest = new URL('vendor-licenses/mapepire-js-MANIFEST.json', distRoot);
	for (const [name, file] of [['Mapepire bundle', vendor], ['Mapepire license', license], ['Mapepire manifest', manifest]]) {
		if (!fs.existsSync(file)) errors.push(`${name} missing from dist`);
	}
	if (fs.existsSync(vendor)) {
		const stat = fs.statSync(vendor);
		if (stat.size < 40_000) errors.push(`Vendored Mapepire bundle is unexpectedly small (${stat.size} bytes)`);
	}
	for (const file of walk(distRoot)) {
		if (file.pathname.endsWith('.d.ts') || file.pathname.endsWith('.map')) {
			errors.push(`Development-only TypeScript artifact remains in dist: ${file.pathname}`);
		}
	}
	for (const file of walk(new URL('nodes/', distRoot))) {
		if (!file.pathname.endsWith('.js') && !file.pathname.endsWith('.cjs')) continue;
		const contents = fs.readFileSync(file, 'utf8');
		if (/require\(["']@ibm\/mapepire-js["']\)/.test(contents)) errors.push(`External Mapepire runtime require remains in ${file.pathname}`);
	}
}

if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}
console.log(requireDist ? 'Built package verification passed.' : 'Source/package policy verification passed.');

function walk(directoryUrl) {
	if (!fs.existsSync(directoryUrl)) return [];
	const files = [];
	for (const entry of fs.readdirSync(directoryUrl, { withFileTypes: true })) {
		const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl);
		if (entry.isDirectory()) files.push(...walk(child));
		else files.push(child);
	}
	return files;
}
