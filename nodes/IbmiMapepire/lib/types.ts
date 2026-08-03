import type { BindingValue, JDBCOptions, QueryMetaData } from './mapepireTypes';
import type { IDataObject } from 'n8n-workflow';

export type SqlOperation = 'select' | 'insert' | 'update' | 'createTable';

export interface IbmiMapepireCredentials {
	host: string;
	port: number;
	user: string;
	password: string;
	database: string;
	ignoreUnauthorized: boolean;
	caCertificate?: string;
	caPath?: string;
	allowedReadSchemas: string;
	allowedWriteSchema?: string;
	allowedFunctions?: string;
	poolEnabled: boolean;
	poolSize: number;
	poolWaitSeconds: number;
	queryTraceEnabled: boolean;
	slowQueryMs: number;
	maxRows: number;
	pageSize: number;
	maxBatchSize: number;
	retrySelectOnce: boolean;
	dateFormat: 'iso' | 'eur' | 'usa' | 'ymd';
	decimalSeparator: '.' | ',';
}

export interface RuntimeConfig {
	credentials: IbmiMapepireCredentials;
	readSchemas: Set<string>;
	writeSchema?: string;
	allowedFunctions: Set<string>;
	jdbcOptions: JDBCOptions;
}

export interface SelectExecutionResult {
	rows: IDataObject[];
	metadata?: QueryMetaData;
	rowCount: number;
	truncated: boolean;
	sqlState: string;
	sqlCode: number;
	executionTimeMs: number;
}

export interface WriteExecutionResult {
	updateCount: number;
	sqlState: string;
	sqlCode: number;
	executionTimeMs: number;
	metadata?: QueryMetaData;
}

export type ParsedParameters = BindingValue[];
