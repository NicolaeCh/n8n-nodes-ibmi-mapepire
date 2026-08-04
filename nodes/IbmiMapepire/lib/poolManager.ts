import { createHash } from 'node:crypto';
import { Pool, type MapepirePool } from './mapepireRuntime';
import { IbmiMapepireError, normalizeError } from './errors';
import { Semaphore } from './semaphore';
import type { RuntimeConfig } from './types';

interface ManagedPool {
	pool: MapepirePool;
	semaphore: Semaphore;
}

const pools = new Map<string, Promise<ManagedPool>>();

function poolKey(config: RuntimeConfig): string {
	const credentials = config.credentials;
	return createHash('sha256')
		.update(
			JSON.stringify({
				host: credentials.host,
				port: credentials.port,
				user: credentials.user,
				password: credentials.password,
				ignoreUnauthorized: credentials.ignoreUnauthorized,
				caCertificate: credentials.caCertificate ?? '',
				poolSize: credentials.poolSize,
				jdbcOptions: config.jdbcOptions,
			}),
		)
		.digest('hex');
}

export async function createPool(config: RuntimeConfig, size: number): Promise<MapepirePool> {
	const credentials = config.credentials;
	const pool = new Pool({
		creds: {
			host: credentials.host,
			port: credentials.port,
			user: credentials.user,
			password: credentials.password,
			rejectUnauthorized: !credentials.ignoreUnauthorized,
			ca: credentials.caCertificate,
		},
		opts: config.jdbcOptions,
		maxSize: size,
		startingSize: size,
	});
	let initializationError: Error | undefined;
	try {
		await pool.init();
	} catch (error) {
		initializationError = normalizeError(error);
	}

	if (initializationError !== undefined) {
		try {
			pool.end();
		} catch {
			// Ignore shutdown failure while preserving the initialization error.
		}
		return Promise.reject(initializationError);
	}

	return pool;
}

async function createManagedPool(config: RuntimeConfig): Promise<ManagedPool> {
	const size = config.credentials.poolSize;
	return { pool: await createPool(config, size), semaphore: new Semaphore(size) };
}

export async function getManagedPool(config: RuntimeConfig): Promise<ManagedPool> {
	if (!config.credentials.poolEnabled) {
		throw new IbmiMapepireError('Internal error: process-local pool requested while pooling is disabled');
	}
	const key = poolKey(config);
	let pending = pools.get(key);
	if (!pending) {
		pending = createManagedPool(config);
		pools.set(key, pending);
		void pending.catch(() => {
			// Keep the original rejected promise for current callers, but remove it
			// from the cache so a later execution can create a fresh pool.
			pools.delete(key);
		});
	}
	return await pending;
}

export async function invalidateManagedPool(config: RuntimeConfig): Promise<void> {
	if (!config.credentials.poolEnabled) return;
	const key = poolKey(config);
	const pending = pools.get(key);
	pools.delete(key);
	if (!pending) return;
	try {
		const managed = await pending;
		managed.pool.end();
	} catch {
		// Pool creation or shutdown already failed; it has been removed from the cache.
	}
}

export async function withPoolSlot<T>(
	config: RuntimeConfig,
	callback: (pool: MapepirePool) => Promise<T>,
): Promise<T> {
	if (!config.credentials.poolEnabled) {
		const pool = await createPool(config, 1);
		try {
			return await callback(pool);
		} finally {
			try {
				pool.end();
			} catch {
				// Do not turn a completed SQL operation into an apparent failure.
			}
		}
	}

	const managed = await getManagedPool(config);
	const release = await managed.semaphore.acquire(config.credentials.poolWaitSeconds * 1000);
	try {
		return await callback(managed.pool);
	} finally {
		release();
	}
}

export function isTransportError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNRESET|ECONNREFUSED|EPIPE|ETIMEDOUT|ENOTFOUND|websocket|socket|connection failed|connection closed|code 1006/i.test(
		message,
	);
}
