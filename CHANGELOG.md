# Changelog

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
