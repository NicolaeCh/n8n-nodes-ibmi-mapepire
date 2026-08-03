# Changelog

## 0.2.0

- Bundle the official Mapepire 0.6.1 runtime into `dist` to satisfy current n8n community-package dependency rules.
- Remove the unsupported Mapepire peer dependency.
- Add Apache license and SHA-256 manifest for the bundled client.
- Add clean connected release, isolated runtime audit and tarball verification gates.
- Mark the node as self-hosted (`n8n.strict=false`) because the optional CA-path setting reads a local file.
- Retain 31 policy, execution, paging, retry and pool-recovery tests.


## 0.1.5 - 2026-08-03

- Restored the official `@n8n/node-cli/eslint` configuration instead of replacing it with an ignore-only configuration.
- Kept `@n8n/node-cli` pinned to 0.41.2 and added a clean toolchain preflight.
- Replaced raw native errors in policy/configuration helpers with a typed internal error and retained `NodeOperationError` at n8n execution boundaries.
- Removed the cached-pool catch/rethrow path and preserved the original promise rejection while evicting failed pools.
- Moved offline declaration files out of the lint surface; they are generated under ignored `node_modules` only for the offline harness.
- Added `@ibm/mapepire-js` 0.6.1 as an exact build-time development dependency; version 0.2.0 supersedes the temporary peer-dependency approach.
- Removed the package-level Node.js engine restriction and added clean verification on supported Node.js 22.22 and 24.
- Added `audit:runtime`, `audit:all`, Podman verification, CI matrix, tarball loading, and content checks.

## 0.1.4 - 2026-08-03

- Added distinct light and dark SVG files.
- Added a CLI-version guard before lint, build, and development commands.
- Documented cleanup of stale `node_modules` and `package-lock.json` after an old CLI installation.

## 0.1.3 - 2026-08-03

- Resolved all `@n8n/node-cli` 0.41.2 lint findings reported for credentials, icons, tool support, descriptions, error handling, package author metadata, and runtime dependencies.
- Added a live Mapepire credential test through `testedBy`.
- Temporarily moved `@ibm/mapepire-js` 0.6.1 to a peer dependency; version 0.2.0 replaces this with a bundled release artifact because current lint policy only permits `n8n-workflow` as a peer.
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
- 31 automated policy/configuration/execution tests and offline type/package
  verification.
