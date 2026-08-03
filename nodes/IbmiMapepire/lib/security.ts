import { IbmiMapepireError } from './errors';

export type SqlOperation = 'select' | 'insert' | 'update' | 'createTable';

export interface SqlPolicy {
	readSchemas: Set<string>;
	writeSchema?: string;
	allowedFunctions: Set<string>;
	allowFullTableUpdate?: boolean;
	maxSqlLength?: number;
}

export interface ValidationResult {
	operation: SqlOperation;
	targetLibrary?: string;
	targetObject?: string;
	readLibraries: string[];
	placeholderCount: number;
}

interface Token {
	value: string;
	kind: 'word' | 'symbol' | 'number';
	depth: number;
}

const IDENTIFIER = /^[A-Z_#$@][A-Z0-9_#$@]{0,127}$/;
const SYSTEM_WRITE_DENYLIST = new Set([
	'QSYS',
	'QSYS2',
	'SYSIBM',
	'SYSCAT',
	'SYSSTAT',
	'SYSTOOLS',
	'QSYS2000',
]);

const DANGEROUS_FUNCTION_NAMES = new Set([
	'QCMDEXC',
	'IFS_WRITE',
	'IFS_WRITE_BINARY',
	'IFS_WRITE_UTF8',
	'HTTP_DELETE',
	'HTTP_POST',
	'HTTP_PUT',
	'SEND_EMAIL',
	'HTTPDELETECLOB',
	'HTTPPOSTCLOB',
	'HTTPPUTCLOB',
]);

const SELECT_FORBIDDEN = new Set([
	'INSERT',
	'UPDATE',
	'DELETE',
	'MERGE',
	'CREATE',
	'ALTER',
	'DROP',
	'TRUNCATE',
	'CALL',
	'GRANT',
	'REVOKE',
	'COMMIT',
	'ROLLBACK',
	'BEGIN',
	'DECLARE',
	'EXECUTE',
	'PREPARE',
	'LOCK',
	'SAVEPOINT',
	'TRANSFER',
	'REFRESH',
]);

const WRITE_FORBIDDEN = new Set([
	'DELETE',
	'MERGE',
	'CREATE',
	'ALTER',
	'DROP',
	'TRUNCATE',
	'CALL',
	'GRANT',
	'REVOKE',
	'COMMIT',
	'ROLLBACK',
	'BEGIN',
	'DECLARE',
	'EXECUTE',
	'PREPARE',
	'LOCK',
	'SAVEPOINT',
	'TRANSFER',
	'REFRESH',
	'NEXT',
]);

const FROM_END_WORDS = new Set([
	'WHERE',
	'GROUP',
	'HAVING',
	'ORDER',
	'UNION',
	'EXCEPT',
	'INTERSECT',
	'FETCH',
	'OFFSET',
	'FOR',
	'QUALIFY',
	'CONNECT',
	'START',
]);

// Words followed by '(' that are SQL grammar rather than routine calls.
const NON_FUNCTION_PAREN_WORDS = new Set([
	'IN',
	'EXISTS',
	'NOT',
	'AND',
	'OR',
	'WHEN',
	'CASE',
	'VALUES',
	'OVER',
	'PARTITION',
	'WHERE',
	'HAVING',
	'ON',
	'SELECT',
	'FROM',
	'JOIN',
	'SET',
	'AS',
	'THEN',
	'ELSE',
	'BY',
	'ORDER',
	'GROUP',
	'UNION',
	'EXCEPT',
	'INTERSECT',
]);

const CREATE_ALLOWED_PAREN_WORDS = new Set([
	'CHAR',
	'CHARACTER',
	'VARCHAR',
	'CLOB',
	'GRAPHIC',
	'VARGRAPHIC',
	'VARYING',
	'NCHAR',
	'NVARCHAR',
	'DBCLOB',
	'BINARY',
	'VARBINARY',
	'BLOB',
	'DECIMAL',
	'DEC',
	'NUMERIC',
	'FLOAT',
	'DECFLOAT',
	'TIMESTAMP',
	'TIME',
	'KEY',
	'UNIQUE',
	'IDENTITY',
]);

export function parseIdentifierList(
	raw: unknown,
	fieldName: string,
	required = false,
): Set<string> {
	const text = typeof raw === 'string' ? raw.trim() : '';
	if (!text) {
		if (required) throw new IbmiMapepireError(`${fieldName} must contain at least one identifier`);
		return new Set<string>();
	}

	const result = new Set<string>();
	for (const value of text.split(/[\s,]+/)) {
		const identifier = value.trim().toUpperCase();
		if (!identifier) continue;
		if (identifier.includes('*') || identifier === 'ALL' || identifier === '*ALL') {
			throw new IbmiMapepireError(`${fieldName} does not accept wildcards or *ALL`);
		}
		if (!IDENTIFIER.test(identifier)) {
			throw new IbmiMapepireError(`${fieldName} contains an invalid unquoted SQL identifier: ${value}`);
		}
		result.add(identifier);
	}
	if (required && result.size === 0) {
		throw new IbmiMapepireError(`${fieldName} must contain at least one identifier`);
	}
	return result;
}

export function parseSchemaList(raw: unknown, fieldName: string, required = false): Set<string> {
	return parseIdentifierList(raw, fieldName, required);
}

export function parseFunctionList(raw: unknown, fieldName: string): Set<string> {
	return parseIdentifierList(raw, fieldName, false);
}

export function parseOptionalSchema(raw: unknown, fieldName: string): string | undefined {
	const schemas = parseIdentifierList(raw, fieldName, false);
	if (schemas.size > 1) throw new IbmiMapepireError(`${fieldName} accepts exactly one schema`);
	return schemas.values().next().value as string | undefined;
}

// Kept as a compatibility alias for users/tests of the initial package draft.
export const parseLibraryList = parseSchemaList;

export function validatePolicy(policy: SqlPolicy): void {
	if (policy.readSchemas.size === 0) {
		throw new IbmiMapepireError('SQL_ALLOWED_READ_SCHEMAS must contain at least one schema');
	}
	if (policy.writeSchema && SYSTEM_WRITE_DENYLIST.has(policy.writeSchema)) {
		throw new IbmiMapepireError(`Writes to protected system schema ${policy.writeSchema} are never allowed`);
	}
}

function maskSql(sql: string, maxSqlLength: number): string {
	if (typeof sql !== 'string' || sql.trim().length === 0) throw new IbmiMapepireError('SQL statement is required');
	if (sql.length > maxSqlLength) {
		throw new IbmiMapepireError(`SQL statement exceeds the ${maxSqlLength} character limit`);
	}

	let result = '';
	let inString = false;
	let depth = 0;
	for (let index = 0; index < sql.length; index += 1) {
		const char = sql[index];
		const next = sql[index + 1];
		if (inString) {
			result += ' ';
			if (char === "'" && next === "'") {
				result += ' ';
				index += 1;
				continue;
			}
			if (char === "'") inString = false;
			continue;
		}
		if (char === "'") {
			inString = true;
			result += ' ';
			continue;
		}
		if (char === '"') {
			throw new IbmiMapepireError('Delimited/quoted SQL identifiers are not supported; use regular identifiers');
		}
		if (char === ';') throw new IbmiMapepireError('Semicolons and multiple SQL statements are not allowed');
		if ((char === '-' && next === '-') || (char === '/' && next === '*') || (char === '*' && next === '/')) {
			throw new IbmiMapepireError('SQL comments are not allowed');
		}
		if (char === '\0' || (char < ' ' && !['\t', '\r', '\n'].includes(char))) {
			throw new IbmiMapepireError('SQL contains unsupported control characters');
		}
		if (char === '(') depth += 1;
		if (char === ')') {
			depth -= 1;
			if (depth < 0) throw new IbmiMapepireError('SQL has unbalanced parentheses');
		}
		result += char.toUpperCase();
	}
	if (inString) throw new IbmiMapepireError('SQL has an unterminated string literal');
	if (depth !== 0) throw new IbmiMapepireError('SQL has unbalanced parentheses');
	return result;
}

function tokenize(masked: string): Token[] {
	const tokens: Token[] = [];
	let index = 0;
	let depth = 0;
	while (index < masked.length) {
		const char = masked[index];
		if (/\s/.test(char)) {
			index += 1;
			continue;
		}
		if (/[A-Z_#$@]/.test(char)) {
			let end = index + 1;
			while (end < masked.length && /[A-Z0-9_#$@]/.test(masked[end])) end += 1;
			tokens.push({ value: masked.slice(index, end), kind: 'word', depth });
			index = end;
			continue;
		}
		if (/[0-9]/.test(char)) {
			let end = index + 1;
			while (end < masked.length && /[0-9]/.test(masked[end])) end += 1;
			tokens.push({ value: masked.slice(index, end), kind: 'number', depth });
			index = end;
			continue;
		}
		if (char === '(') {
			tokens.push({ value: char, kind: 'symbol', depth });
			depth += 1;
			index += 1;
			continue;
		}
		if (char === ')') {
			depth -= 1;
			tokens.push({ value: char, kind: 'symbol', depth });
			index += 1;
			continue;
		}
		tokens.push({ value: char, kind: 'symbol', depth });
		index += 1;
	}
	return tokens;
}

function wordSet(tokens: Token[]): Set<string> {
	return new Set(tokens.filter((token) => token.kind === 'word').map((token) => token.value));
}

function assertNoForbiddenWords(tokens: Token[], forbidden: Set<string>): void {
	for (const token of tokens) {
		if (token.kind === 'word' && forbidden.has(token.value)) {
			throw new IbmiMapepireError(`SQL keyword ${token.value} is not allowed for this operation`);
		}
	}
}

function parseQualifiedName(
	tokens: Token[],
	startIndex: number,
	context: string,
): { library: string; object: string; nextIndex: number } {
	const library = tokens[startIndex];
	const dot = tokens[startIndex + 1];
	const object = tokens[startIndex + 2];
	if (!library || library.kind !== 'word' || !dot || dot.value !== '.' || !object || object.kind !== 'word') {
		throw new IbmiMapepireError(`${context} must use an explicitly qualified SCHEMA.OBJECT name`);
	}
	return { library: library.value, object: object.value, nextIndex: startIndex + 3 };
}

function assertSchemaAllowed(schema: string, allowed: Set<string>, action: string): void {
	if (!allowed.has(schema)) throw new IbmiMapepireError(`Schema ${schema} is not allowlisted for ${action}`);
}

function assertWriteSchema(schema: string, writeSchema: string | undefined, action: string): void {
	if (SYSTEM_WRITE_DENYLIST.has(schema)) {
		throw new IbmiMapepireError(`Writes to protected system schema ${schema} are never allowed`);
	}
	if (!writeSchema) throw new IbmiMapepireError(`${action} is disabled because SQL_ALLOWED_WRITE_SCHEMA is blank`);
	if (schema !== writeSchema) {
		throw new IbmiMapepireError(`Schema ${schema} is not the configured SQL_ALLOWED_WRITE_SCHEMA`);
	}
}

function rejectCommaJoins(tokens: Token[]): void {
	const activeFromDepths = new Set<number>();
	for (const token of tokens) {
		for (const depth of [...activeFromDepths]) if (depth > token.depth) activeFromDepths.delete(depth);
		if (token.kind === 'word' && token.value === 'FROM') {
			activeFromDepths.add(token.depth);
			continue;
		}
		if (token.kind === 'word' && FROM_END_WORDS.has(token.value) && activeFromDepths.has(token.depth)) {
			activeFromDepths.delete(token.depth);
			continue;
		}
		if (token.value === ',' && activeFromDepths.has(token.depth)) {
			throw new IbmiMapepireError('Comma joins are not allowed; use explicit JOIN with qualified objects');
		}
	}
}

function extractReadSchemas(tokens: Token[]): string[] {
	rejectCommaJoins(tokens);
	const schemas = new Set<string>();
	for (let index = 0; index < tokens.length; index += 1) {
		const token = tokens[index];
		if (token.kind !== 'word' || (token.value !== 'FROM' && token.value !== 'JOIN')) continue;
		const next = tokens[index + 1];
		if (!next) throw new IbmiMapepireError(`${token.value} is missing a source object`);
		if (next.value === '(') continue;
		if (next.kind === 'word' && next.value === 'TABLE') {
			throw new IbmiMapepireError('SQL table functions are not allowed');
		}
		const qualified = parseQualifiedName(tokens, index + 1, 'Read object');
		schemas.add(qualified.library);
	}
	return [...schemas];
}

function validateFunctionCalls(tokens: Token[], allowedFunctions: Set<string>): void {
	for (let index = 0; index + 3 < tokens.length; index += 1) {
		const schema = tokens[index];
		const dot = tokens[index + 1];
		const routine = tokens[index + 2];
		const open = tokens[index + 3];
		if (schema.kind === 'word' && dot.value === '.' && routine.kind === 'word' && open.value === '(') {
			throw new IbmiMapepireError(`Schema-qualified SQL routine ${schema.value}.${routine.value} is not allowed`);
		}
	}

	for (let index = 0; index + 1 < tokens.length; index += 1) {
		const name = tokens[index];
		const open = tokens[index + 1];
		if (name.kind !== 'word' || open.value !== '(') continue;
		if (tokens[index - 1]?.value === '.') continue;
		if (NON_FUNCTION_PAREN_WORDS.has(name.value)) continue;
		if (name.value === 'TABLE') throw new IbmiMapepireError('SQL table functions are not allowed');
		if (DANGEROUS_FUNCTION_NAMES.has(name.value) || name.value.startsWith('IFS_WRITE')) {
			throw new IbmiMapepireError(`Potentially side-effecting SQL function ${name.value} is not allowed`);
		}
		if (!allowedFunctions.has(name.value)) {
			throw new IbmiMapepireError(`SQL function ${name.value} is not listed in SQL_ALLOWED_FUNCTIONS`);
		}
	}
}

function validateReads(tokens: Token[], policy: SqlPolicy): string[] {
	const readSchemas = extractReadSchemas(tokens);
	for (const schema of readSchemas) assertSchemaAllowed(schema, policy.readSchemas, 'read');
	validateFunctionCalls(tokens, policy.allowedFunctions);
	return readSchemas;
}

function countPlaceholders(masked: string): number {
	return [...masked].filter((char) => char === '?').length;
}

function hasTopLevelWord(tokens: Token[], value: string, startIndex = 0): boolean {
	return tokens.slice(startIndex).some((token) => token.kind === 'word' && token.value === value && token.depth === 0);
}

function validateCreateDefinitions(tokens: Token[], startIndex: number): void {
	const definitions = tokens.slice(startIndex);
	const forbidden = new Set([
		'REPLACE',
		'TEMPORARY',
		'GLOBAL',
		'LIKE',
		'MATERIALIZED',
		'SELECT',
		'INSERT',
		'UPDATE',
		'DELETE',
		'MERGE',
		'CALL',
		'REFERENCES',
		'FOREIGN',
		'CHECK',
		'TRIGGER',
		'PROCEDURE',
		'FUNCTION',
		'VIEW',
		'INDEX',
		'SCHEMA',
		'LIBRARY',
		'PARTITION',
		'ORGANIZE',
		'IN',
		'TABLESPACE',
		'DISTRIBUTE',
	]);
	assertNoForbiddenWords(definitions, forbidden);

	for (let index = 0; index + 2 < definitions.length; index += 1) {
		if (definitions[index].kind === 'word' && definitions[index + 1].value === '.' && definitions[index + 2].kind === 'word') {
			throw new IbmiMapepireError('CREATE TABLE definitions may not reference schema-qualified objects');
		}
	}

	for (let index = 0; index < definitions.length; index += 1) {
		if (definitions[index].value !== 'GENERATED') continue;
		const alwaysIdentity =
			definitions[index + 1]?.value === 'ALWAYS' &&
			definitions[index + 2]?.value === 'AS' &&
			definitions[index + 3]?.value === 'IDENTITY';
		const defaultIdentity =
			definitions[index + 1]?.value === 'BY' &&
			definitions[index + 2]?.value === 'DEFAULT' &&
			definitions[index + 3]?.value === 'AS' &&
			definitions[index + 4]?.value === 'IDENTITY';
		if (!alwaysIdentity && !defaultIdentity) {
			throw new IbmiMapepireError('Only GENERATED ... AS IDENTITY columns are allowed');
		}
	}

	for (let index = 0; index + 1 < definitions.length; index += 1) {
		const name = definitions[index];
		const open = definitions[index + 1];
		if (name.kind !== 'word' || open.value !== '(') continue;
		if (!CREATE_ALLOWED_PAREN_WORDS.has(name.value)) {
			throw new IbmiMapepireError(`CREATE TABLE expression or routine ${name.value}(...) is not allowed`);
		}
	}
}

export function validateSql(sql: string, operation: SqlOperation, policy: SqlPolicy): ValidationResult {
	validatePolicy(policy);
	const masked = maskSql(sql, policy.maxSqlLength ?? 100_000).trim();
	const tokens = tokenize(masked);
	if (tokens.length === 0 || tokens[0].kind !== 'word') throw new IbmiMapepireError('SQL statement is empty');
	const words = wordSet(tokens);
	const placeholderCount = countPlaceholders(masked);

	if (operation === 'select') {
		if (tokens[0].value !== 'SELECT') throw new IbmiMapepireError('SELECT operation requires a statement beginning with SELECT');
		assertNoForbiddenWords(tokens, SELECT_FORBIDDEN);
		if (words.has('INTO')) throw new IbmiMapepireError('SELECT INTO is not allowed');
		if (masked.includes('FINAL TABLE') || masked.includes('OLD TABLE') || masked.includes('NEW TABLE')) {
			throw new IbmiMapepireError('Data-change table references are not allowed');
		}
		const readLibraries = validateReads(tokens, policy);
		return { operation, readLibraries, placeholderCount };
	}

	if (operation === 'insert') {
		if (tokens[0].value !== 'INSERT' || tokens[1]?.value !== 'INTO') {
			throw new IbmiMapepireError('INSERT operation requires INSERT INTO SCHEMA.TABLE');
		}
		assertNoForbiddenWords(tokens.slice(1), new Set([...WRITE_FORBIDDEN, 'UPDATE']));
		if (words.has('SELECT') || words.has('WITH')) {
			throw new IbmiMapepireError('INSERT ... SELECT and CTE-based INSERT are not allowed; use VALUES');
		}
		const target = parseQualifiedName(tokens, 2, 'INSERT target');
		assertWriteSchema(target.library, policy.writeSchema, 'INSERT');
		if (!hasTopLevelWord(tokens, 'VALUES', target.nextIndex)) {
			throw new IbmiMapepireError('INSERT must use an explicit VALUES clause');
		}
		validateFunctionCalls(tokens.slice(target.nextIndex), policy.allowedFunctions);
		return {
			operation,
			targetLibrary: target.library,
			targetObject: target.object,
			readLibraries: [],
			placeholderCount,
		};
	}

	if (operation === 'update') {
		if (tokens[0].value !== 'UPDATE') throw new IbmiMapepireError('UPDATE operation requires UPDATE SCHEMA.TABLE SET ...');
		assertNoForbiddenWords(tokens.slice(1), new Set([...WRITE_FORBIDDEN, 'INSERT']));
		const target = parseQualifiedName(tokens, 1, 'UPDATE target');
		assertWriteSchema(target.library, policy.writeSchema, 'UPDATE');
		if (!hasTopLevelWord(tokens, 'SET', target.nextIndex)) throw new IbmiMapepireError('UPDATE statement must contain SET');
		if (!policy.allowFullTableUpdate && !hasTopLevelWord(tokens, 'WHERE', target.nextIndex)) {
			throw new IbmiMapepireError('UPDATE without a top-level WHERE is blocked; explicitly enable full-table update to proceed');
		}
		const readLibraries = validateReads(tokens, policy);
		return {
			operation,
			targetLibrary: target.library,
			targetObject: target.object,
			readLibraries,
			placeholderCount,
		};
	}

	if (tokens[0].value !== 'CREATE' || tokens[1]?.value !== 'TABLE') {
		throw new IbmiMapepireError('CREATE TABLE operation requires CREATE TABLE SCHEMA.TABLE (...)');
	}
	const target = parseQualifiedName(tokens, 2, 'CREATE TABLE target');
	assertWriteSchema(target.library, policy.writeSchema, 'CREATE TABLE');
	if (tokens[target.nextIndex]?.value !== '(' || !masked.endsWith(')')) {
		throw new IbmiMapepireError('Only CREATE TABLE SCHEMA.TABLE (explicit column definitions) is allowed');
	}
	validateCreateDefinitions(tokens, target.nextIndex);
	return {
		operation,
		targetLibrary: target.library,
		targetObject: target.object,
		readLibraries: [],
		placeholderCount,
	};
}

function assertBindingScalar(value: unknown, location: string): asserts value is string | number {
	if (typeof value === 'string') return;
	if (typeof value === 'number' && Number.isFinite(value)) return;
	throw new IbmiMapepireError(`${location} must be a finite number or string; null and booleans are not supported`);
}

export function parseAndValidateParameters(
	raw: unknown,
	placeholderCount: number,
	maxBatchSize: number,
	allowBatch = true,
): Array<string | number | Array<string | number>> {
	let value = raw;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) value = [];
		else {
			value = JSON.parse(trimmed) as unknown;
		}
	}
	if (value === undefined || value === null || value === '') value = [];
	if (!Array.isArray(value)) throw new IbmiMapepireError('Parameters must be a JSON array');

	const isBatch = value.some((entry) => Array.isArray(entry));
	if (isBatch) {
		if (!allowBatch) throw new IbmiMapepireError('Batch parameters are supported only for INSERT and UPDATE');
		if (!value.every((entry) => Array.isArray(entry))) {
			throw new IbmiMapepireError('Batch parameters must be a two-dimensional array');
		}
		if (value.length > maxBatchSize) {
			throw new IbmiMapepireError(`Batch contains ${value.length} rows; maximum is ${maxBatchSize}`);
		}
		for (let rowIndex = 0; rowIndex < value.length; rowIndex += 1) {
			const row = value[rowIndex] as unknown[];
			if (row.length !== placeholderCount) {
				throw new IbmiMapepireError(`Batch row ${rowIndex + 1} has ${row.length} values; SQL has ${placeholderCount} placeholders`);
			}
			for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
				assertBindingScalar(row[columnIndex], `Batch row ${rowIndex + 1}, value ${columnIndex + 1}`);
			}
		}
		return value as Array<Array<string | number>>;
	}

	if (value.length !== placeholderCount) {
		throw new IbmiMapepireError(`Parameters contain ${value.length} values; SQL has ${placeholderCount} placeholders`);
	}
	for (let index = 0; index < value.length; index += 1) {
		assertBindingScalar(value[index], `Parameter ${index + 1}`);
	}
	return value as Array<string | number>;
}
