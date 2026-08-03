# Changelog

## 0.1.3 - 2026-08-03

- Resolved all `@n8n/node-cli` 0.41.2 lint findings reported for credentials, icons, tool support, descriptions, error handling, package author metadata, and runtime dependencies.
- Added a live Mapepire credential test through `testedBy`.
- Moved `@ibm/mapepire-js` 0.6.1 to an exact peer dependency, as required by the current community-node packaging policy.
- Reworked cursor cleanup so errors are never thrown from a `finally` block.
- Added themed icon declarations and protected the inline CA certificate value.

## 0.1.2 - 2026-08-03

- Align the package Node.js engine with n8n 2.31.6: `>=22.22`.
- Allow installation and testing on the target Node.js 26.5.0 runtime.
- Remove the incorrect `<25` upper bound from package metadata.

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
