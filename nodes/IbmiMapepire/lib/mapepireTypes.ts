/**
 * Minimal compile-time contract for the official Mapepire 0.6.1 CommonJS bundle.
 *
 * The release still executes the unmodified upstream bundle. Keeping the local
 * contract here avoids a source-level external import that current n8n linting
 * can interpret as a runtime package dependency.
 */
export type BindingScalar = string | number;
export type BindingValue = BindingScalar | BindingScalar[];

export interface MapepireDaemonCredentials {
	host: string;
	port?: number;
	user: string;
	password: string;
	rejectUnauthorized?: boolean;
	ca?: string;
}

export interface JDBCOptions {
	[key: string]: unknown;
}

export interface QueryMetaData {
	[key: string]: unknown;
}

export interface QueryResult<T> {
	success?: boolean;
	error?: string;
	sql_rc?: number;
	sql_state?: string;
	execution_time?: number;
	metadata?: QueryMetaData;
	is_done: boolean;
	has_results?: boolean;
	update_count?: number;
	data?: T[];
}

export interface MapepireQuery<T = unknown> {
	execute(rows?: number): Promise<QueryResult<T>>;
	fetchMore(rows?: number): Promise<QueryResult<T>>;
	close(): Promise<unknown>;
}

export interface MapepirePool {
	init(): Promise<unknown>;
	query<T = unknown>(
		sql: string,
		options?: { parameters?: BindingValue[] },
	): MapepireQuery<T>;
	execute<T>(
		sql: string,
		options?: { parameters?: BindingValue[] },
	): Promise<QueryResult<T>>;
	end(): void;
}

export interface MapepirePoolOptions {
	creds: MapepireDaemonCredentials;
	opts?: JDBCOptions;
	maxSize: number;
	startingSize: number;
}

export type MapepirePoolConstructor = new (options: MapepirePoolOptions) => MapepirePool;
