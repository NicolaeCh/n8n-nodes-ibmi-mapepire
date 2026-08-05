const test = require('node:test');
const assert = require('node:assert/strict');
const { executeSelect, executeWrite } = require('../.test-dist/execute.js');
const { invalidateManagedPool } = require('../.test-dist/poolManager.js');

const node = { name: 'IBM i Db2 (Mapepire)', type: 'ibmiMapepire', typeVersion: 1, position: [0, 0], parameters: {} };

let hostCounter = 0;
function config(overrides = {}) {
  hostCounter += 1;
  return {
    credentials: {
      host: `test-${hostCounter}.example`,
      port: 8076,
      user: 'N8NTEST',
      password: 'secret',
      database: '*LOCAL',
      ignoreUnauthorized: false,
      caCertificate: 'TEST-CA',
      allowedReadSchemas: 'APPDATA',
      allowedWriteSchema: 'APPDATA',
      allowedFunctions: 'COUNT',
      poolEnabled: true,
      poolSize: 2,
      poolWaitSeconds: 1,
      queryTraceEnabled: false,
      slowQueryMs: 750,
      maxRows: 3,
      pageSize: 2,
      maxBatchSize: 10,
      retrySelectOnce: true,
      dateFormat: 'iso',
      decimalSeparator: '.',
      ...overrides,
    },
    readSchemas: new Set(['APPDATA']),
    writeSchema: 'APPDATA',
    allowedFunctions: new Set(['COUNT']),
    jdbcOptions: {
      naming: 'sql',
      access: 'all',
      'auto commit': true,
      'transaction isolation': 'none',
      errors: 'full',
      'database name': '*LOCAL',
      'date format': 'iso',
      'decimal separator': '.',
      trace: false,
    },
  };
}

function page(data, isDone, executionTime = 1) {
  return {
    success: true,
    sql_rc: 0,
    sql_state: '00000',
    execution_time: executionTime,
    metadata: { column_count: 1 },
    is_done: isDone,
    has_results: true,
    update_count: 0,
    data,
  };
}

function reset(plans) {
  global.__MAPEPIRE_FAKE__ = { pools: [], plans: [...plans] };
}

test('SELECT configures Mapepire Pool, pages rows, truncates, and closes the cursor', async () => {
  reset([{ query: { firstPage: page([{ ID: 1 }, { ID: 2 }], false, 4), morePages: [page([{ ID: 3 }, { ID: 4 }], false, 5)] } }]);
  const cfg = config();
  const result = await executeSelect(node, cfg, 'SELECT ID FROM APPDATA.T', []);
  assert.deepEqual(result.rows, [{ ID: 1 }, { ID: 2 }, { ID: 3 }]);
  assert.equal(result.rowCount, 3);
  assert.equal(result.truncated, true);
  assert.equal(result.executionTimeMs, 9);
  const pool = global.__MAPEPIRE_FAKE__.pools[0];
  assert.equal(pool.options.maxSize, 2);
  assert.equal(pool.options.startingSize, 2);
  assert.deepEqual(pool.options.creds, {
    host: cfg.credentials.host,
    port: 8076,
    user: 'N8NTEST',
    password: 'secret',
    rejectUnauthorized: true,
    ca: 'TEST-CA',
  });
  assert.deepEqual(pool.options.opts, cfg.jdbcOptions);
  assert.equal(pool.firstFetchSize, 2);
  assert.deepEqual(pool.fetchSizes, [1]);
  assert.equal(pool.queryCloseCalls, 1);
  await invalidateManagedPool(cfg);
});



test('successful SELECT accepts Mapepire responses that omit SQLCODE and SQLSTATE', async () => {
  const successfulPage = page([{ ID: 1 }], true);
  delete successfulPage.sql_rc;
  delete successfulPage.sql_state;
  reset([{ query: { firstPage: successfulPage } }]);
  const cfg = config();
  const result = await executeSelect(node, cfg, 'SELECT ID FROM APPDATA.T', []);
  assert.deepEqual(result.rows, [{ ID: 1 }]);
  assert.equal(result.sqlCode, 0);
  assert.equal(result.sqlState, '');
  await invalidateManagedPool(cfg);
});

test('SELECT retries exactly once after a transport failure and recreates the pool', async () => {
  reset([
    { query: { executeError: new Error('ECONNRESET websocket closed') } },
    { query: { firstPage: page([{ OK: 1 }], true) } },
  ]);
  const cfg = config();
  const result = await executeSelect(node, cfg, 'SELECT 1 AS OK FROM APPDATA.T', []);
  assert.deepEqual(result.rows, [{ OK: 1 }]);
  assert.equal(global.__MAPEPIRE_FAKE__.pools.length, 2);
  assert.equal(global.__MAPEPIRE_FAKE__.pools[0].ended, true);
  await invalidateManagedPool(cfg);
});

test('SELECT does not retry SQL errors and preserves the primary error if close also fails', async () => {
  const primary = new Error('SQL0204 APPDATA.MISSING not found');
  reset([{ query: { executeError: primary, closeError: new Error('close failed') } }]);
  const cfg = config();
  await assert.rejects(
    executeSelect(node, cfg, 'SELECT * FROM APPDATA.MISSING', []),
    /SQL0204 APPDATA.MISSING not found/,
  );
  assert.equal(global.__MAPEPIRE_FAKE__.pools.length, 1);
  await invalidateManagedPool(cfg);
});

test('unsuccessful Mapepire result objects become errors and are not retried as transport failures', async () => {
  const failed = page([], true);
  failed.success = false;
  failed.sql_rc = -204;
  failed.sql_state = '42704';
  failed.error = 'APPDATA.MISSING not found';
  reset([{ query: { firstPage: failed } }]);
  const cfg = config();
  await assert.rejects(
    executeSelect(node, cfg, 'SELECT * FROM APPDATA.MISSING', []),
    /APPDATA.MISSING not found/,
  );
  assert.equal(global.__MAPEPIRE_FAKE__.pools.length, 1);
  assert.equal(global.__MAPEPIRE_FAKE__.pools[0].queryCloseCalls, 1);
  await invalidateManagedPool(cfg);
});

test('pool-disabled mode creates and closes a one-connection pool per execution', async () => {
  reset([{ query: { firstPage: page([{ ID: 1 }], true) } }]);
  const cfg = config({ poolEnabled: false, poolSize: 8 });
  const result = await executeSelect(node, cfg, 'SELECT ID FROM APPDATA.T', []);
  assert.equal(result.rowCount, 1);
  const pool = global.__MAPEPIRE_FAKE__.pools[0];
  assert.equal(pool.options.maxSize, 1);
  assert.equal(pool.options.startingSize, 1);
  assert.equal(pool.ended, true);
});

test('writes pass batch parameters unchanged and are never retried', async () => {
  reset([{ executeResult: page([], true, 7) }]);
  global.__MAPEPIRE_FAKE__.plans[0].executeResult.update_count = 2;
  const cfg = config();
  const parameters = [[1, 'A'], [2, 'B']];
  const result = await executeWrite(
    node,
    cfg,
    'INSERT INTO APPDATA.T (ID, NAME) VALUES (?, ?)',
    parameters,
  );
  assert.equal(result.updateCount, 2);
  assert.deepEqual(global.__MAPEPIRE_FAKE__.pools[0].lastExecute.opts.parameters, parameters);
  await invalidateManagedPool(cfg);

  reset([{ executeError: new Error('ECONNRESET after possible commit') }]);
  const failingCfg = config();
  await assert.rejects(
    executeWrite(node, failingCfg, 'UPDATE APPDATA.T SET NAME = ? WHERE ID = ?', ['X', 1]),
    /ECONNRESET/,
  );
  assert.equal(global.__MAPEPIRE_FAKE__.pools.length, 1);
  assert.equal(global.__MAPEPIRE_FAKE__.pools[0].writeCalls, 1);
  await invalidateManagedPool(failingCfg);
});

test('failed pool initialization is evicted so a later execution can reconnect', async () => {
  reset([
    { initError: new Error('authentication failed') },
    { query: { firstPage: page([{ OK: 1 }], true) } },
  ]);
  const cfg = config({ retrySelectOnce: false });
  await assert.rejects(
    executeSelect(node, cfg, 'SELECT 1 AS OK FROM APPDATA.T', []),
    /authentication failed/,
  );
  const result = await executeSelect(node, cfg, 'SELECT 1 AS OK FROM APPDATA.T', []);
  assert.deepEqual(result.rows, [{ OK: 1 }]);
  assert.equal(global.__MAPEPIRE_FAKE__.pools.length, 2);
  assert.equal(global.__MAPEPIRE_FAKE__.pools[0].ended, true);
  await invalidateManagedPool(cfg);
});
