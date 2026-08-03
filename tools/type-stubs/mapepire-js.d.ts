declare module '@ibm/mapepire-js' {
  export type BindingValue = string | number | Array<string | number>;
  export interface DaemonServer { host: string; port?: number; user: string; password: string; rejectUnauthorized?: boolean; ca?: string | unknown; }
  export interface JDBCOptions { [key: string]: unknown; }
  export interface QueryMetaData { [key: string]: unknown; }
  export interface QueryResult<T> { success: boolean; error?: string; sql_rc: number; sql_state: string; execution_time: number; metadata: QueryMetaData; is_done: boolean; has_results: boolean; update_count: number; data: T[]; }
  export interface Query<T> { execute(rows?: number): Promise<QueryResult<T>>; fetchMore(rows?: number): Promise<QueryResult<T>>; close(): Promise<unknown>; }
  export class Pool {
    constructor(options: { creds: DaemonServer; opts?: JDBCOptions; maxSize: number; startingSize: number });
    init(): Promise<unknown>;
    query(sql: string, opts?: { parameters?: BindingValue[] }): Query<unknown>;
    execute<T>(sql: string, opts?: { parameters?: BindingValue[] }): Promise<QueryResult<T>>;
    end(): void;
  }
}
