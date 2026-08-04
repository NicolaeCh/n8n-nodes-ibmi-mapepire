import { spawnSync } from 'node:child_process';

const audit = spawnSync(
	'npm',
	['audit', '--include=dev', '--omit=peer', '--audit-level=high', '--json'],
	{ encoding: 'utf8' },
);

let report;
try {
	report = JSON.parse(audit.stdout || '{}');
} catch {
	process.stderr.write(audit.stderr || audit.stdout || 'npm audit returned invalid JSON\n');
	process.exit(audit.status ?? 1);
}

if (report.error || !report.metadata?.vulnerabilities) {
	console.error('npm audit could not produce a valid vulnerability report.');
	if (report.error) console.error(JSON.stringify(report.error));
	if (audit.stderr) process.stderr.write(audit.stderr);
	process.exit(audit.status ?? 1);
}

const totals = report.metadata.vulnerabilities;
const critical = Number(totals.critical ?? 0);
const high = Number(totals.high ?? 0);
const moderate = Number(totals.moderate ?? 0);
const low = Number(totals.low ?? 0);

console.log(
	`Development toolchain audit: ${critical} critical, ${high} high, ${moderate} moderate, ${low} low.`,
);

if (critical > 0 || high > 0) {
	console.error('High or critical vulnerabilities were found in the development toolchain.');
	for (const [name, details] of Object.entries(report.vulnerabilities ?? {})) {
		if (details?.severity === 'high' || details?.severity === 'critical') {
			console.error(`- ${name}: ${details.severity}`);
		}
	}
	console.error('Run npm run audit:toolchain:report for the complete npm advisory report.');
	process.exit(1);
}

if (moderate > 0 || low > 0) {
	console.warn(
		'Moderate/low findings are inherited by development-only tooling and do not enter the published tarball.',
	);
	console.warn('Run npm run audit:toolchain:report to inspect them in full.');
}
