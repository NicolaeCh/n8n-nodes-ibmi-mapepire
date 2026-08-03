import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class IbmiMapepireApi implements ICredentialType {
	name = 'ibmiMapepireApi';
	displayName = 'IBM I Mapepire API';
	icon: Icon = 'file:../nodes/IbmiMapepire/ibmi-mapepire.svg';
	documentationUrl = 'https://github.com/NicolaeCh/n8n-nodes-ibmi-mapepire';

	properties: INodeProperties[] = [
		{
			displayName: 'Mapepire Host (MAPEPIRE_HOST)',
			name: 'host',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'ibmi.example.com',
			description: 'DNS name or IP address of the Mapepire server',
		},
		{
			displayName: 'Port (MAPEPIRE_PORT)',
			name: 'port',
			type: 'number',
			default: 8076,
			required: true,
			typeOptions: { minValue: 1, maxValue: 65535 },
			description: 'Mapepire secure WebSocket port; the standard default is 8076',
		},
		{
			displayName: 'IBM i User (MAPEPIRE_USER)',
			name: 'user',
			type: 'string',
			default: '',
			required: true,
			description: 'Dedicated least-privilege IBM i user profile',
		},
		{
			displayName: 'IBM i Password (MAPEPIRE_PASSWORD)',
			name: 'password',
			type: 'string',
			default: '',
			required: true,
			typeOptions: { password: true },
		},
		{
			displayName: 'Database (MAPEPIRE_DATABASE)',
			name: 'database',
			type: 'string',
			default: '*LOCAL',
			required: true,
			description: 'IBM i relational database name passed as the Mapepire JDBC database name',
		},
		{
			displayName: 'Ignore Unauthorized TLS Certificates (MAPEPIRE_IGNORE_UNAUTHORIZED)',
			name: 'ignoreUnauthorized',
			type: 'boolean',
			default: false,
			description:
				'Unsafe for production. Prefer a trusted CA certificate or a server-side CA path.',
		},
		{
			displayName: 'CA Certificate PEM',
			name: 'caCertificate',
			type: 'string',
			default: '',
			typeOptions: { rows: 6, password: true },
			placeholder: '-----BEGIN CERTIFICATE-----',
			description:
				'Optional PEM CA certificate. Do not set this together with MAPEPIRE_CA_PATH.',
		},
		{
			displayName: 'CA Certificate Path (MAPEPIRE_CA_PATH)',
			name: 'caPath',
			type: 'string',
			default: '',
			placeholder: '/home/node/.n8n/certs/ibmi-ca.pem',
			description:
				'Optional path inside the n8n host/container. The n8n process must be able to read it. Do not set it together with CA Certificate PEM.',
		},
		{
			displayName: 'Allowed Read Schemas (SQL_ALLOWED_READ_SCHEMAS)',
			name: 'allowedReadSchemas',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'APPDATA, QSYS2',
			description:
				'Comma- or space-separated IBM i schemas/libraries that SELECT and read subqueries may access. Every table or view must be schema-qualified.',
		},
		{
			displayName: 'Allowed Write Schema (SQL_ALLOWED_WRITE_SCHEMA)',
			name: 'allowedWriteSchema',
			type: 'string',
			default: '',
			placeholder: 'APPDATA',
			description:
				'Exactly one IBM i schema/library for INSERT, UPDATE, and restricted CREATE TABLE. Leave blank to disable every write operation.',
		},
		{
			displayName: 'Allowed SQL Functions (SQL_ALLOWED_FUNCTIONS)',
			name: 'allowedFunctions',
			type: 'string',
			default: '',
			placeholder: 'COUNT, COALESCE, UPPER',
			description:
				'Comma- or space-separated unqualified SQL function names. Schema-qualified routines and table functions are always rejected. Leave blank to allow no parenthesized SQL functions.',
		},
		{
			displayName: 'Enable Pool (MAPEPIRE_POOL_ENABLED)',
			name: 'poolEnabled',
			type: 'boolean',
			default: true,
			description:
				'Whether to reuse a process-local Mapepire connection pool. When disabled, a one-connection pool is created and closed for every execution.',
		},
		{
			displayName: 'Pool Size (MAPEPIRE_POOL_SIZE)',
			name: 'poolSize',
			type: 'number',
			default: 4,
			typeOptions: { minValue: 1, maxValue: 20 },
			description: 'Number of Mapepire SQL jobs maintained per n8n process when pooling is enabled',
			displayOptions: { show: { poolEnabled: [true] } },
		},
		{
			displayName: 'Pool Wait Seconds (MAPEPIRE_POOL_WAIT_SECONDS)',
			name: 'poolWaitSeconds',
			type: 'number',
			default: 30,
			typeOptions: { minValue: 1, maxValue: 300 },
			description: 'Maximum seconds an execution waits for a process-local pool slot',
			displayOptions: { show: { poolEnabled: [true] } },
		},
		{
			displayName: 'Enable Mapepire Query Trace (MAPEPIRE_QUERY_TRACE_ENABLED)',
			name: 'queryTraceEnabled',
			type: 'boolean',
			default: false,
			description:
				'Passes the JDBC trace option to Mapepire. Keep disabled unless diagnosing a controlled non-production environment.',
		},
		{
			displayName: 'Slow Query Threshold (ms) (MAPEPIRE_SLOW_QUERY_MS)',
			name: 'slowQueryMs',
			type: 'number',
			default: 750,
			typeOptions: { minValue: 0, maxValue: 3600000 },
			description:
				'Execution-time threshold used to mark result metadata as a slow query. Set 0 to disable the marker.',
		},
		{
			displayName: 'Maximum SELECT Rows',
			name: 'maxRows',
			type: 'number',
			default: 1000,
			typeOptions: { minValue: 1, maxValue: 100000 },
			description: 'Hard maximum rows returned by one input item',
		},
		{
			displayName: 'Fetch Page Size',
			name: 'pageSize',
			type: 'number',
			default: 250,
			typeOptions: { minValue: 1, maxValue: 10000 },
			description: 'Rows fetched from Mapepire in each page',
		},
		{
			displayName: 'Maximum Batch Rows',
			name: 'maxBatchSize',
			type: 'number',
			default: 500,
			typeOptions: { minValue: 1, maxValue: 10000 },
			description: 'Maximum number of parameter sets in one INSERT or UPDATE execution',
		},
		{
			displayName: 'Retry SELECT Once After Transport Failure',
			name: 'retrySelectOnce',
			type: 'boolean',
			default: true,
			description:
				'Recreates the pool and retries a SELECT once after a WebSocket/transport failure. INSERT, UPDATE, and CREATE TABLE are never retried.',
		},
		{
			displayName: 'Date Format',
			name: 'dateFormat',
			type: 'options',
			default: 'iso',
			options: [
				{ name: 'ISO', value: 'iso' },
				{ name: 'European', value: 'eur' },
				{ name: 'USA', value: 'usa' },
				{ name: 'YMD', value: 'ymd' },
			],
			description: 'Mapepire JDBC date representation',
		},
		{
			displayName: 'Decimal Separator',
			name: 'decimalSeparator',
			type: 'options',
			default: '.',
			options: [
				{ name: 'Period (.)', value: '.' },
				{ name: 'Comma (,)', value: ',' },
			],
		},
	];
}
