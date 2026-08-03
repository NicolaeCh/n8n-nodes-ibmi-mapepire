const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseAndValidateParameters,
  parseFunctionList,
  parseOptionalSchema,
  parseSchemaList,
  validatePolicy,
  validateSql,
} = require('../.test-dist/security.js');

const policy = () => ({
  readSchemas: new Set(['APPDATA', 'QSYS2']),
  writeSchema: 'APPDATA',
  allowedFunctions: new Set(['COUNT', 'COALESCE', 'UPPER']),
});

test('parses and normalizes schema/function allowlists', () => {
  assert.deepEqual([...parseSchemaList('appdata, QSYS2 appdata', 'read', true)], ['APPDATA', 'QSYS2']);
  assert.deepEqual([...parseFunctionList('count upper', 'functions')], ['COUNT', 'UPPER']);
  assert.equal(parseOptionalSchema('appdata', 'write'), 'APPDATA');
  assert.equal(parseOptionalSchema('', 'write'), undefined);
  assert.throws(() => parseSchemaList('*ALL', 'read', true), /wildcards/);
  assert.throws(() => parseOptionalSchema('APPDATA, OTHER', 'write'), /exactly one/);
});

test('requires read schemas and rejects protected write schemas', () => {
  assert.throws(() => validatePolicy({ readSchemas: new Set(), allowedFunctions: new Set() }), /at least one schema/);
  assert.throws(() => validatePolicy({
    readSchemas: new Set(['APPDATA']),
    writeSchema: 'QSYS2',
    allowedFunctions: new Set(),
  }), /protected system schema/);
});

test('accepts qualified SELECT and JOIN', () => {
  const result = validateSql(
    'SELECT C.ID, O.TOTAL FROM APPDATA.CUSTOMERS C JOIN APPDATA.ORDERS O ON O.CUSTOMER_ID = C.ID WHERE C.ID = ?',
    'select',
    policy(),
  );
  assert.equal(result.placeholderCount, 1);
  assert.deepEqual(result.readLibraries, ['APPDATA']);
});

test('allows only explicitly listed unqualified functions', () => {
  const result = validateSql(
    'SELECT COUNT(*), UPPER(NAME) FROM APPDATA.CUSTOMERS WHERE ID IN (?, ?)',
    'select',
    policy(),
  );
  assert.equal(result.placeholderCount, 2);
  assert.throws(
    () => validateSql('SELECT LENGTH(NAME) FROM APPDATA.CUSTOMERS', 'select', policy()),
    /SQL_ALLOWED_FUNCTIONS/,
  );
});

test('rejects every schema-qualified routine and table function', () => {
  assert.throws(
    () => validateSql('SELECT APPDATA.SAFE_FN(ID) FROM APPDATA.T', 'select', policy()),
    /Schema-qualified SQL routine/,
  );
  assert.throws(
    () => validateSql('SELECT JOB_NAME FROM TABLE(QSYS2.ACTIVE_JOB_INFO()) X', 'select', policy()),
    /table functions|Schema-qualified SQL routine/,
  );
});

test('rejects comments and semicolons', () => {
  assert.throws(() => validateSql('SELECT * FROM APPDATA.T -- comment', 'select', policy()), /comments/);
  assert.throws(() => validateSql('SELECT * FROM APPDATA.T; DROP TABLE APPDATA.T', 'select', policy()), /Semicolons/);
});

test('rejects unqualified reads and comma joins', () => {
  assert.throws(() => validateSql('SELECT * FROM CUSTOMERS', 'select', policy()), /qualified/);
  assert.throws(() => validateSql('SELECT * FROM APPDATA.A A, APPDATA.B B', 'select', policy()), /Comma joins/);
});

test('accepts parenthesized SQL grammar without treating it as a function', () => {
  const result = validateSql(
    'SELECT (ID + 1) AS NEXT_ID FROM APPDATA.T WHERE (ID = ? OR ID = ?)',
    'select',
    policy(),
  );
  assert.equal(result.placeholderCount, 2);
});

test('rejects unauthorized read schemas', () => {
  assert.throws(() => validateSql('SELECT * FROM PRIVATE.SECRETS', 'select', policy()), /not allowlisted/);
});

test('rejects data-changing SELECT constructs and dangerous functions', () => {
  assert.throws(() => validateSql('SELECT * FROM FINAL TABLE (INSERT INTO APPDATA.T VALUES (1))', 'select', policy()), /not allowed|Data-change/);
  assert.throws(() => validateSql("SELECT QSYS2.QCMDEXC('DLTLIB X') FROM QSYS2.SYSDUMMY1", 'select', policy()), /Schema-qualified|side-effecting/);
  const dangerousPolicy = policy();
  dangerousPolicy.allowedFunctions.add('QCMDEXC');
  dangerousPolicy.allowedFunctions.add('HTTP_POST');
  assert.throws(() => validateSql("SELECT QCMDEXC('DLTLIB X') FROM QSYS2.SYSDUMMY1", 'select', dangerousPolicy), /side-effecting/);
  assert.throws(() => validateSql("SELECT HTTP_POST('https:\/\/example.invalid', '{}') FROM QSYS2.SYSDUMMY1", 'select', dangerousPolicy), /side-effecting/);
});

test('rejects operation/verb mismatch', () => {
  assert.throws(() => validateSql('UPDATE APPDATA.T SET C = 1 WHERE ID = 1', 'select', policy()), /beginning with SELECT/);
});

test('accepts INSERT VALUES and rejects INSERT SELECT', () => {
  const result = validateSql('INSERT INTO APPDATA.T (ID, NAME) VALUES (?, COALESCE(?, \'N/A\'))', 'insert', policy());
  assert.equal(result.targetLibrary, 'APPDATA');
  assert.equal(result.placeholderCount, 2);
  assert.throws(() => validateSql('INSERT INTO APPDATA.T SELECT * FROM APPDATA.S', 'insert', policy()), /INSERT \.\.\. SELECT/);
});

test('blank write schema disables writes and a second schema is rejected', () => {
  const noWrite = policy();
  noWrite.writeSchema = undefined;
  assert.throws(() => validateSql('INSERT INTO APPDATA.T VALUES (1)', 'insert', noWrite), /disabled/);
  assert.throws(() => validateSql('INSERT INTO OTHER.T VALUES (1)', 'insert', policy()), /SQL_ALLOWED_WRITE_SCHEMA/);
});

test('requires a top-level WHERE for UPDATE unless explicitly enabled', () => {
  assert.throws(() => validateSql('UPDATE APPDATA.T SET FLAG = 1', 'update', policy()), /top-level WHERE/);
  assert.throws(() => validateSql(
    'UPDATE APPDATA.T SET VALUE = (SELECT VALUE FROM APPDATA.S WHERE ID = 1)',
    'update',
    policy(),
  ), /top-level WHERE/);
  const p = { ...policy(), allowFullTableUpdate: true };
  assert.equal(validateSql('UPDATE APPDATA.T SET FLAG = 1', 'update', p).targetObject, 'T');
});

test('checks read schemas used by UPDATE subqueries', () => {
  assert.throws(() => validateSql(
    'UPDATE APPDATA.T SET VALUE = (SELECT VALUE FROM PRIVATE.S WHERE ID = ?) WHERE ID = ?',
    'update',
    policy(),
  ), /PRIVATE/);
});

test('accepts explicit base CREATE TABLE definitions and identity columns', () => {
  const result = validateSql(
    'CREATE TABLE APPDATA.NEW_T (ID BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1), NAME VARCHAR(100), PRIMARY KEY (ID))',
    'createTable',
    policy(),
  );
  assert.equal(result.targetObject, 'NEW_T');
});

test('rejects CREATE TABLE reads, derived definitions, unsafe constraints, and trailing options', () => {
  assert.throws(() => validateSql('CREATE TABLE APPDATA.NEW_T AS (SELECT * FROM APPDATA.T) WITH DATA', 'createTable', policy()), /explicit column definitions|SELECT/);
  assert.throws(() => validateSql('CREATE TABLE APPDATA.NEW_T LIKE APPDATA.T', 'createTable', policy()), /explicit column definitions|LIKE/);
  assert.throws(() => validateSql('CREATE TABLE APPDATA.C (ID INT, FOREIGN KEY (ID) REFERENCES APPDATA.P(ID))', 'createTable', policy()), /FOREIGN|REFERENCES/);
  assert.throws(() => validateSql('CREATE TABLE APPDATA.C (ID INT GENERATED ALWAYS AS (1 + 1))', 'createTable', policy()), /IDENTITY/);
  assert.throws(() => validateSql('CREATE TABLE APPDATA.C (ID INT DEFAULT APPDATA.F())', 'createTable', policy()), /schema-qualified objects/);
  assert.throws(() => validateSql('CREATE TABLE APPDATA.C (ID INT) RCDFMT C_FMT', 'createTable', policy()), /explicit column definitions/);
});

test('never permits writes to protected system schemas', () => {
  const p = policy();
  p.writeSchema = 'QSYS2';
  assert.throws(() => validateSql('UPDATE QSYS2.T SET C = 1 WHERE ID = 1', 'update', p), /protected system/);
});

test('validates scalar and batch parameters', () => {
  assert.deepEqual(parseAndValidateParameters('[1,"A"]', 2, 10), [1, 'A']);
  assert.deepEqual(parseAndValidateParameters([[1, 'A'], [2, 'B']], 2, 10), [[1, 'A'], [2, 'B']]);
  assert.throws(() => parseAndValidateParameters([1], 2, 10), /placeholders/);
  assert.throws(() => parseAndValidateParameters([null], 1, 10), /not supported/);
  assert.throws(() => parseAndValidateParameters([[1], [2], [3]], 1, 2), /maximum/);
  assert.throws(() => parseAndValidateParameters([[1], [2]], 1, 10, false), /only for INSERT and UPDATE/);
});
