const test = require('node:test');
const assert = require('node:assert/strict');
const { chmodSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

function runAuditScenario(scenario) {
  const directory = mkdtempSync(join(tmpdir(), 'ibmi-mapepire-audit-test-'));
  try {
    const fakeNpm = join(directory, 'npm');
    writeFileSync(
      fakeNpm,
      `#!/bin/sh\ncase "$AUDIT_SCENARIO" in\n` +
        `moderate) printf '%s\\n' '{"metadata":{"vulnerabilities":{"critical":0,"high":0,"moderate":6,"low":0}},"vulnerabilities":{"uuid":{"severity":"moderate"}}}'; exit 0 ;;\n` +
        `high) printf '%s\\n' '{"metadata":{"vulnerabilities":{"critical":0,"high":1,"moderate":0,"low":0}},"vulnerabilities":{"undici":{"severity":"high"}}}'; exit 1 ;;\n` +
        `error) printf '%s\\n' '{"error":{"code":"EAUDITENDPOINT","summary":"audit endpoint unavailable"}}'; exit 1 ;;\n` +
        `esac\n`,
    );
    chmodSync(fakeNpm, 0o755);
    return spawnSync(process.execPath, [resolve('tools/audit-toolchain.mjs')], {
      encoding: 'utf8',
      env: {
        ...process.env,
        AUDIT_SCENARIO: scenario,
        PATH: `${directory}:${process.env.PATH ?? ''}`,
      },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('development audit allows moderate-only findings and labels them as development-only', () => {
  const result = runAuditScenario('moderate');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /0 critical, 0 high, 6 moderate/);
  assert.match(result.stderr, /development-only tooling/);
});

test('development audit blocks high findings', () => {
  const result = runAuditScenario('high');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /High or critical vulnerabilities/);
  assert.match(result.stderr, /undici: high/);
});

test('development audit blocks an unavailable or malformed audit response', () => {
  const result = runAuditScenario('error');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /could not produce a valid vulnerability report/);
  assert.match(result.stderr, /EAUDITENDPOINT/);
});
