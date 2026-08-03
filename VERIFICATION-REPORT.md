# Verification report — 0.1.0

Date: 2026-08-01

## Scope

The project implements an n8n community node for Db2 for IBM i with the official
`@ibm/mapepire-js` client and the policy rules recovered from the referenced
`ibmi-n8n-sql-container` project context.


## Source/API verification

- Dependency pinned to `@ibm/mapepire-js` 0.6.1.
- Pool creation, `Pool.query`, cursor `execute`/`fetchMore`/`close`,
  `Pool.execute`, scalar/batch bindings, TLS CA, `rejectUnauthorized`, JDBC
  options, and default port 8076 were checked against the published Mapepire
  package/source documentation.
- n8n package metadata, node and credential entry points, community keyword,
  environment-managed package variables, checksum behavior, and current
  verified-node external-dependency restriction were checked against current
  n8n documentation.

## Automated result

```text
30 tests passed
TypeScript verification passed
Package metadata verification passed
Packed node/credential entry-point smoke load passed
```

Covered areas:

- all former credential variables and defaults
- CA path loading and conflicting CA-source rejection
- exact read/write/function policy semantics
- comments/multi-statements/forbidden verbs
- qualified object enforcement
- schema-qualified routine/table-function rejection
- dangerous function denylist
- INSERT/UPDATE/CREATE restrictions
- top-level WHERE protection
- parameter and batch limits
- Mapepire pool/TLS/JDBC construction
- paging, truncation, cursor close
- SELECT transport retry
- no write retry
- pool-disabled lifecycle
- semaphore behavior

## Build verification

The TypeScript sources compile through the included offline type harness, the
package can be assembled with `npm run pack:offline`, and the packed node and
credential entry points were loaded successfully with controlled module doubles. The harness mirrors the
published Mapepire 0.6.1 signatures used by the node.

The current environment could not reach the public npm registry and had no live
IBM i/Mapepire endpoint. Therefore the following remain release gates:

1. `npm install`, official `n8n-node` lint/build, and `npm pack --dry-run` on a
   connected development host.
2. Live TLS and SQL integration matrix from `docs/TESTING.md` against a
   non-production IBM i schema.
3. Comparison of the final variable/rule table with the original private
   project files.
4. First npm publication and verification of the generated SHA-512 integrity.

No claim of live IBM i certification is made by this report.
