import type { BindingValue, QueryMetaData } from './mapepireTypes';
import type { IDataObject, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { normalizeError } from './errors';
import type { MapepirePool } from './mapepireRuntime';
import { invalidateManagedPool, isTransportError, withPoolSlot } from './poolManager';
import type {
	RuntimeConfig,
	SelectExecutionResult,
	WriteExecutionResult,
} from './types';

function assertMapepireSuccess(
	node: INode,
	result: { success: boolean; error?: string; sql_rc: number; sql_state: string },
	context: string,
): void {
	if (result.success !== false && result.sql_rc >= 0) return;
	const detail = result.error?.trim() || `SQLCODE ${result.sql_rc}, SQLSTATE ${result.sql_state}`;
	throw new NodeOperationError(node, `${context} failed: ${detail}`);
}

async function executeSelectOnce(
	node: INode,
	config: RuntimeConfig,
	sql: string,
	parameters: BindingValue[],
): Promise<SelectExecutionResult> {
	return await withPoolSlot(config, async (pool: MapepirePool) => {
		const query = pool.query(sql, { parameters });
		let metadata: QueryMetaData | undefined;
		let sqlState = '';
		let sqlCode = 0;
		let executionTimeMs = 0;
		const rows: IDataObject[] = [];
		let truncated = false;
		let executionError: unknown;
		let closeError: unknown;

		try {
			let page = await query.execute(
				Math.min(config.credentials.pageSize, config.credentials.maxRows),
			);
			assertMapepireSuccess(node, page, 'SELECT');
			metadata = page.metadata;
			sqlState = page.sql_state;
			sqlCode = page.sql_rc;
			executionTimeMs += page.execution_time ?? 0;

			while (true) {
				const remaining = config.credentials.maxRows - rows.length;
				if (remaining <= 0) {
					truncated = !page.is_done;
					break;
				}
				rows.push(...((page.data ?? []) as IDataObject[]).slice(0, remaining));
				if (rows.length >= config.credentials.maxRows) {
					truncated = !page.is_done || (page.data?.length ?? 0) > remaining;
					break;
				}
				if (page.is_done) break;
				page = await query.fetchMore(
					Math.min(config.credentials.pageSize, config.credentials.maxRows - rows.length),
				);
				assertMapepireSuccess(node, page, 'SELECT fetch');
				sqlState = page.sql_state;
				sqlCode = page.sql_rc;
				executionTimeMs += page.execution_time ?? 0;
			}
		} catch (error) {
			executionError = error;
		}

		try {
			await query.close();
		} catch (error) {
			closeError = error;
		}

		if (executionError !== undefined) {
			throw new NodeOperationError(node, normalizeError(executionError));
		}
		if (closeError !== undefined) {
			throw new NodeOperationError(node, normalizeError(closeError), {
				description: 'The SQL query completed, but its cursor could not be closed.',
			});
		}

		return {
			rows,
			metadata,
			rowCount: rows.length,
			truncated,
			sqlState,
			sqlCode,
			executionTimeMs,
		};
	});
}

export async function executeSelect(
	node: INode,
	config: RuntimeConfig,
	sql: string,
	parameters: BindingValue[],
): Promise<SelectExecutionResult> {
	try {
		return await executeSelectOnce(node, config, sql, parameters);
	} catch (error) {
		if (config.credentials.retrySelectOnce && isTransportError(error)) {
			await invalidateManagedPool(config);
			return await executeSelectOnce(node, config, sql, parameters);
		}
		throw new NodeOperationError(node, normalizeError(error));
	}
}

export async function executeWrite(
	node: INode,
	config: RuntimeConfig,
	sql: string,
	parameters: BindingValue[],
): Promise<WriteExecutionResult> {
	// Deliberately no retry. A transport failure can occur after Db2 committed the change.
	return await withPoolSlot(config, async (pool: MapepirePool) => {
		let result;
		try {
			result = await pool.execute<IDataObject>(sql, { parameters });
		} catch (error) {
			throw new NodeOperationError(node, normalizeError(error));
		}
		assertMapepireSuccess(node, result, 'Write');
		return {
			updateCount: result.update_count ?? 0,
			sqlState: result.sql_state,
			sqlCode: result.sql_rc,
			executionTimeMs: result.execution_time ?? 0,
			metadata: result.metadata,
		};
	});
}
