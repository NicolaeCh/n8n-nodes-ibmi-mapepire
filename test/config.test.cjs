const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runtimeConfigFromCredentials } = require('../.test-dist/config.js');

function base(overrides = {}) {
  return {
    host: 'ibmi.example.com',
    port: 8076,
    user: 'N8NUSER',
    password: 'secret',
    database: '*LOCAL',
    ignoreUnauthorized: false,
    allowedReadSchemas: 'APPDATA, QSYS2',
    allowedWriteSchema: 'APPDATA',
    allowedFunctions: 'COUNT, UPPER',
    poolEnabled: true,
    poolSize: 4,
    poolWaitSeconds: 30,
    queryTraceEnabled: false,
    slowQueryMs: 750,
    maxRows: 1000,
    pageSize: 250,
    maxBatchSize: 500,
    retrySelectOnce: true,
    dateFormat: 'iso',
    decimalSeparator: '.',
    ...overrides,
  };
}

test('maps the former environment variables to runtime/JDBC configuration', () => {
  const config = runtimeConfigFromCredentials(base({
    database: 'MYRDB',
    ignoreUnauthorized: true,
    queryTraceEnabled: true,
  }));
  assert.deepEqual([...config.readSchemas], ['APPDATA', 'QSYS2']);
  assert.equal(config.writeSchema, 'APPDATA');
  assert.deepEqual([...config.allowedFunctions], ['COUNT', 'UPPER']);
  assert.equal(config.credentials.ignoreUnauthorized, true);
  assert.equal(config.jdbcOptions['database name'], 'MYRDB');
  assert.equal(config.jdbcOptions.trace, true);
  assert.equal(config.jdbcOptions.access, 'all');
});

test('blank SQL_ALLOWED_WRITE_SCHEMA produces a read-only JDBC configuration', () => {
  const config = runtimeConfigFromCredentials(base({ allowedWriteSchema: '' }));
  assert.equal(config.writeSchema, undefined);
  assert.equal(config.jdbcOptions.access, 'read only');
});

test('loads MAPEPIRE_CA_PATH and forbids setting both CA sources', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ibmi-mapepire-'));
  const caPath = path.join(directory, 'ca.pem');
  fs.writeFileSync(caPath, '-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n');
  const config = runtimeConfigFromCredentials(base({ caPath }));
  assert.match(config.credentials.caCertificate, /BEGIN CERTIFICATE/);
  assert.throws(
    () => runtimeConfigFromCredentials(base({ caPath, caCertificate: 'INLINE' })),
    /not both/,
  );
  fs.rmSync(directory, { recursive: true, force: true });
});
