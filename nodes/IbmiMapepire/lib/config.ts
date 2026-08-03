import { readFileSync } from 'node:fs';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import {
	parseFunctionList,
	parseOptionalSchema,
	parseSchemaList,
	validatePolicy,
} from './security';
import type { IbmiMapepireCredentials, RuntimeConfig } from './types';

function requiredString(value: unknown, name: string): string {
	if (typeof value !== 'string' || value.trim() === '') throw new Error(`${name} is required`);
	return value.trim();
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function integerInRange(value: unknown, name: string, minimum: number, maximum: number): number {
	const parsed = typeof value === 'number' ? value : Number(value);
	if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
		throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
	}
	return parsed;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
	if (typeof value === 'boolean') return value;
	if (value === 'true' || value === 1 || value === '1') return true;
	if (value === 'false' || value === 0 || value === '0') return false;
	return fallback;
}

function loadCaCertificate(inlinePem: string | undefined, caPath: string | undefined): string | undefined {
	if (inlinePem && caPath) {
		throw new Error('Set either CA Certificate PEM or MAPEPIRE_CA_PATH, not both');
	}
	if (inlinePem) {
		if (inlinePem.length > 1_000_000) throw new Error('CA Certificate PEM exceeds 1 MB');
		return inlinePem;
	}
	if (!caPath) return undefined;
	let content: string | undefined;
	let readError: string | undefined;
	try {
		content = readFileSync(caPath, 'utf8');
	} catch (error) {
		readError = error instanceof Error ? error.message : String(error);
	}
	if (readError !== undefined || content === undefined) {
		throw new Error(`Unable to read MAPEPIRE_CA_PATH ${caPath}: ${readError ?? 'unknown error'}`);
	}
	if (!content.trim()) throw new Error(`MAPEPIRE_CA_PATH ${caPath} is empty`);
	if (content.length > 1_000_000) throw new Error('CA certificate file exceeds 1 MB');
	return content.trim();
}

export function runtimeConfigFromCredentials(
	input: ICredentialDataDecryptedObject,
): RuntimeConfig {
	const inlineCaCertificate = optionalString(input.caCertificate);
	const caPath = optionalString(input.caPath);
	const credentials: IbmiMapepireCredentials = {
		host: requiredString(input.host, 'MAPEPIRE_HOST'),
		port: integerInRange(input.port ?? 8076, 'MAPEPIRE_PORT', 1, 65535),
		user: requiredString(input.user, 'MAPEPIRE_USER'),
		password: requiredString(input.password, 'MAPEPIRE_PASSWORD'),
		database: requiredString(input.database ?? '*LOCAL', 'MAPEPIRE_DATABASE'),
		ignoreUnauthorized: booleanValue(input.ignoreUnauthorized, false),
		caCertificate: loadCaCertificate(inlineCaCertificate, caPath),
		caPath,
		allowedReadSchemas: requiredString(
			input.allowedReadSchemas,
			'SQL_ALLOWED_READ_SCHEMAS',
		),
		allowedWriteSchema: optionalString(input.allowedWriteSchema),
		allowedFunctions: optionalString(input.allowedFunctions),
		poolEnabled: booleanValue(input.poolEnabled, true),
		poolSize: integerInRange(input.poolSize ?? 4, 'MAPEPIRE_POOL_SIZE', 1, 20),
		poolWaitSeconds: integerInRange(
			input.poolWaitSeconds ?? 30,
			'MAPEPIRE_POOL_WAIT_SECONDS',
			1,
			300,
		),
		queryTraceEnabled: booleanValue(input.queryTraceEnabled, false),
		slowQueryMs: integerInRange(
			input.slowQueryMs ?? 750,
			'MAPEPIRE_SLOW_QUERY_MS',
			0,
			3_600_000,
		),
		maxRows: integerInRange(input.maxRows ?? 1000, 'Maximum SELECT Rows', 1, 100000),
		pageSize: integerInRange(input.pageSize ?? 250, 'Fetch Page Size', 1, 10000),
		maxBatchSize: integerInRange(input.maxBatchSize ?? 500, 'Maximum Batch Rows', 1, 10000),
		retrySelectOnce: booleanValue(input.retrySelectOnce, true),
		dateFormat: ['iso', 'eur', 'usa', 'ymd'].includes(String(input.dateFormat))
			? (String(input.dateFormat) as IbmiMapepireCredentials['dateFormat'])
			: 'iso',
		decimalSeparator: input.decimalSeparator === ',' ? ',' : '.',
	};

	const readSchemas = parseSchemaList(
		credentials.allowedReadSchemas,
		'SQL_ALLOWED_READ_SCHEMAS',
		true,
	);
	const writeSchema = parseOptionalSchema(
		credentials.allowedWriteSchema,
		'SQL_ALLOWED_WRITE_SCHEMA',
	);
	const allowedFunctions = parseFunctionList(
		credentials.allowedFunctions,
		'SQL_ALLOWED_FUNCTIONS',
	);
	validatePolicy({ readSchemas, writeSchema, allowedFunctions });

	const jdbcOptions: RuntimeConfig['jdbcOptions'] = {
		naming: 'sql',
		'access': writeSchema ? 'all' : 'read only',
		'auto commit': true,
		'transaction isolation': 'none',
		errors: 'full',
		'database name': credentials.database,
		'date format': credentials.dateFormat,
		'decimal separator': credentials.decimalSeparator,
		trace: credentials.queryTraceEnabled,
	};

	return { credentials, readSchemas, writeSchema, allowedFunctions, jdbcOptions };
}
