import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { runtimeConfigFromCredentials } from './lib/config';
import { executeSelect, executeWrite } from './lib/execute';
import { parseAndValidateParameters, validateSql } from './lib/security';
import type { RuntimeConfig, SqlOperation } from './lib/types';

function toError(error: unknown): Error {
	return error instanceof Error ? error : new Error(String(error));
}

function toJsonObject(value: unknown): IDataObject {
	if (value === undefined || value === null) return {};
	return JSON.parse(JSON.stringify(value)) as IDataObject;
}

export class IbmiMapepire implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'IBM i Db2 (Mapepire)',
		name: 'ibmiMapepire',
		icon: 'file:ibmi-mapepire.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Execute policy-controlled Db2 for IBM i SQL through Mapepire',
		defaults: { name: 'IBM i Db2 (Mapepire)' },
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'ibmiMapepireApi', required: true }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				default: 'select',
				options: [
					{
						name: 'Select',
						value: 'select',
						description: 'Run a qualified, allowlisted SELECT statement',
						action: 'Select rows from IBM i',
					},
					{
						name: 'Insert',
						value: 'insert',
						description: 'Run INSERT INTO ... VALUES against an allowlisted library',
						action: 'Insert rows into IBM i',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Run an UPDATE against an allowlisted library',
						action: 'Update rows in IBM i',
					},
					{
						name: 'Create Table',
						value: 'createTable',
						description: 'Create a table with explicit column definitions',
						action: 'Create a table in IBM i',
					},
				],
			},
			{
				displayName: 'SQL',
				name: 'sql',
				type: 'string',
				typeOptions: { rows: 8 },
				default: '',
				required: true,
				placeholder: 'SELECT * FROM APPDATA.CUSTOMERS WHERE CUSTOMER_ID = ?',
				description:
					'Exactly one SQL statement. Comments, semicolons, unqualified objects, and non-allowlisted libraries are rejected.',
			},
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'json',
				default: '[]',
				description:
					'JSON array matching the ? placeholders, or a two-dimensional array for batch INSERT/UPDATE. Only strings and finite numbers are supported.',
				displayOptions: {
					hide: { operation: ['createTable'] },
				},
			},
			{
				displayName: 'Allow UPDATE Without WHERE',
				name: 'allowFullTableUpdate',
				type: 'boolean',
				default: false,
				description:
					'Whether to permit a full-table UPDATE. Keep disabled unless the workflow intentionally updates every row.',
				displayOptions: { show: { operation: ['update'] } },
			},
			{
				displayName: 'Output Mode',
				name: 'outputMode',
				type: 'options',
				default: 'rows',
				options: [
					{ name: 'One Item per Row', value: 'rows' },
					{ name: 'Single Item with Data Array', value: 'single' },
				],
				displayOptions: { show: { operation: ['select'] } },
			},
			{
				displayName: 'Include Execution Metadata',
				name: 'includeMetadata',
				type: 'boolean',
				default: false,
				description: 'Whether to add SQL state/code, row counts, timing, and truncation information',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const inputItems = this.getInputData();
		const outputItems: INodeExecutionData[] = [];
		const decryptedCredentials = await this.getCredentials('ibmiMapepireApi');
		let config: RuntimeConfig;
		try {
			config = runtimeConfigFromCredentials(decryptedCredentials);
		} catch (error) {
			throw new NodeOperationError(this.getNode(), toError(error));
		}

		for (let itemIndex = 0; itemIndex < inputItems.length; itemIndex += 1) {
			const operation = this.getNodeParameter('operation', itemIndex) as SqlOperation;
			try {
				const sql = this.getNodeParameter('sql', itemIndex) as string;
				const allowFullTableUpdate =
					operation === 'update'
						? (this.getNodeParameter('allowFullTableUpdate', itemIndex, false) as boolean)
						: false;
				const validation = validateSql(sql, operation, {
					readSchemas: config.readSchemas,
					writeSchema: config.writeSchema,
					allowedFunctions: config.allowedFunctions,
					allowFullTableUpdate,
				});
				const rawParameters =
					operation === 'createTable'
						? []
						: this.getNodeParameter('parameters', itemIndex, []);
				const parameters = parseAndValidateParameters(
					rawParameters,
					validation.placeholderCount,
					config.credentials.maxBatchSize,
					operation === 'insert' || operation === 'update',
				);
				const includeMetadata = this.getNodeParameter(
					'includeMetadata',
					itemIndex,
					false,
				) as boolean;

				if (operation === 'select') {
					const result = await executeSelect(config, sql, parameters);
					const execution = {
						rowCount: result.rowCount,
						truncated: result.truncated,
						sqlState: result.sqlState,
						sqlCode: result.sqlCode,
						executionTimeMs: result.executionTimeMs,
						slowQuery:
							config.credentials.slowQueryMs > 0 &&
							result.executionTimeMs >= config.credentials.slowQueryMs,
						slowQueryThresholdMs: config.credentials.slowQueryMs,
						metadata: toJsonObject(result.metadata),
					};
					const outputMode = this.getNodeParameter('outputMode', itemIndex) as 'rows' | 'single';
					if (outputMode === 'single') {
						outputItems.push({
							json: includeMetadata ? { data: result.rows, _ibmi: execution } : { data: result.rows },
							pairedItem: { item: itemIndex },
						});
					} else {
						for (const row of result.rows) {
							outputItems.push({
								json: includeMetadata ? { ...row, _ibmi: execution } : row,
								pairedItem: { item: itemIndex },
							});
						}
					}
					continue;
				}

				const result = await executeWrite(config, sql, parameters);
				outputItems.push({
					json: {
						success: true,
						operation,
						updateCount: result.updateCount,
						targetLibrary: validation.targetLibrary,
						targetObject: validation.targetObject,
						...(includeMetadata
							? {
								_ibmi: {
									sqlState: result.sqlState,
									sqlCode: result.sqlCode,
									executionTimeMs: result.executionTimeMs,
									slowQuery:
										config.credentials.slowQueryMs > 0 &&
										result.executionTimeMs >= config.credentials.slowQueryMs,
									slowQueryThresholdMs: config.credentials.slowQueryMs,
									metadata: toJsonObject(result.metadata),
								},
							}
							: {}),
					},
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					outputItems.push({
						json: {
							success: false,
							operation,
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), toError(error), { itemIndex });
			}
		}

		return [outputItems];
	}
}
