import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const packageJson = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'));
const expectedVersion = packageJson.devDependencies?.['@n8n/node-cli'];
const packagePath = new URL('../node_modules/@n8n/node-cli/package.json', import.meta.url);

if (
	typeof expectedVersion !== 'string' ||
	expectedVersion.includes('*') ||
	expectedVersion.startsWith('^') ||
	expectedVersion.startsWith('~')
) {
	console.error('@n8n/node-cli must be pinned to one exact version in devDependencies.');
	process.exit(1);
}

if (!fs.existsSync(packagePath)) {
	console.error(
		[
			'@n8n/node-cli is not installed.',
			'Run a clean development install:',
			'  rm -rf node_modules',
			'  npm install',
		].join('\n'),
	);
	process.exit(1);
}

const installedPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (installedPackage.version !== expectedVersion) {
	console.error(
		[
			`Incorrect @n8n/node-cli version: ${installedPackage.version}`,
			`Required version: ${expectedVersion}`,
			'A stale node_modules directory is normally the cause.',
			'Run:',
			'  rm -rf node_modules',
			'  npm install',
			'  npm exec -- n8n-node --version',
		].join('\n'),
	);
	process.exit(1);
}

console.log(`@n8n/node-cli ${installedPackage.version} toolchain verified.`);
