import type { BindingValue, Pool, QueryMetaData } from '@ibm/mapepire-js';
import type { IDataObject } from 'n8n-workflow';
import { invalidateManagedPool, isTransportError, withPoolSlot } from './poolManager';
import type {
	RuntimeConfig,
	SelectExecutionResult,
	WriteExecutionResult,
} from './types';

function assertMapepireSuccess(
	result: { success: boolean; error?: string; sql_rc: number; sql_state: string },
	context: string,
): void {
	if (result.success !== false && result.sql_rc >= 0) return;
	const detail = result.error?.trim() || `SQLCODE ${result.sql_rc}, SQLSTATE ${result.sql_state}`;
	throw new Error(`${context} failed: ${detail}`);
}

async function executeSelectOnce(
	config: RuntimeConfig,
	sql: string,
	parameters: BindingValue[],
): Promise<SelectExecutionResult> {
	return await withPoolSlot(config, async (pool: Pool) => {
		const query = pool.query(sql, { parameters });
		let metadata: QueryMetaData | undefined;
		let sqlState = '';
		let sqlCode = 0;
		let executionTimeMs = 0;
		const rows: IDataObject[] = [];
		let truncated = false;
		let primaryError: unknown;
		try {
			let page = await query.execute(
				Math.min(config.credentials.pageSize, config.credentials.maxRows),
			);
			assertMapepireSuccess(page, 'SELECT');
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
				assertMapepireSuccess(page, 'SELECT fetch');
				sqlState = page.sql_state;
				sqlCode = page.sql_rc;
				executionTimeMs += page.execution_time ?? 0;
			}
		} catch (error) {
			primaryError = error;
			throw error;
		} finally {
			try {
				await query.close();
			} catch (closeError) {
				if (primaryError === undefined) throw closeError;
			}
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
	config: RuntimeConfig,
	sql: string,
	parameters: BindingValue[],
): Promise<SelectExecutionResult> {
	try {
		return await executeSelectOnce(config, sql, parameters);
	} catch (error) {
		if (!config.credentials.retrySelectOnce || !isTransportError(error)) throw error;
		await invalidateManagedPool(config);
		return await executeSelectOnce(config, sql, parameters);
	}
}

export async function executeWrite(
	config: RuntimeConfig,
	sql: string,
	parameters: BindingValue[],
): Promise<WriteExecutionResult> {
	// Deliberately no retry. A transport failure can occur after Db2 committed the change.
	return await withPoolSlot(config, async (pool: Pool) => {
		const result = await pool.execute<IDataObject>(sql, { parameters });
		assertMapepireSuccess(result, 'Write');
		return {
			updateCount: result.update_count ?? 0,
			sqlState: result.sql_state,
			sqlCode: result.sql_rc,
			executionTimeMs: result.execution_time ?? 0,
			metadata: result.metadata,
		};
	});
}
