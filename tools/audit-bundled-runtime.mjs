import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const directory = mkdtempSync(join(tmpdir(), 'ibmi-mapepire-audit-'));
try {
	writeFileSync(
		join(directory, 'package.json'),
		JSON.stringify(
			{
				private: true,
				dependencies: { '@ibm/mapepire-js': '0.6.1' },
			},
			null,
			2,
		) + '\n',
	);
	const install = spawnSync(
		'npm',
		['install', '--ignore-scripts', '--no-fund', '--no-audit'],
		{ cwd: directory, stdio: 'inherit' },
	);
	if (install.status !== 0) process.exit(install.status ?? 1);
	const audit = spawnSync(
		'npm',
		['audit', '--omit=dev', '--audit-level=high'],
		{ cwd: directory, stdio: 'inherit' },
	);
	process.exitCode = audit.status ?? 1;
} finally {
	rmSync(directory, { recursive: true, force: true });
}
