# Changelog

## 0.1.1 - 2026-08-03

- Fixed compatibility with `@n8n/node-cli` 0.41.2 and the current `n8n-workflow` API.
- Replaced the type-only `NodeConnectionType` symbol with the runtime `NodeConnectionTypes` constant used by the official n8n node starter.
- Pinned `@n8n/node-cli` to 0.41.2 for reproducible builds.
- Updated the offline type stub and release documentation.

## 0.1.0 - 2026-08-01

- Initial Db2 for IBM i n8n community node using `@ibm/mapepire-js` 0.6.1.
- SELECT, INSERT VALUES, UPDATE, and restricted CREATE TABLE operations.
- Exact former settings exposed as credential fields: connection/database/TLS,
  pool enable/size/wait, query trace, slow-query threshold, read schemas,
  singular write schema, and allowed functions.
- Strict operation/verb, object qualification, schema, function, placeholder,
  batch, UPDATE WHERE, and CREATE TABLE policy enforcement.
- SELECT paging and one read-only transport retry.
- No retry for INSERT, UPDATE, or CREATE TABLE.
- Process-local pooling and one-execution mode when pooling is disabled.
- 30 automated policy/configuration/execution tests and offline type/package
  verification.
