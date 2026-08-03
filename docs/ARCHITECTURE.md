# Architecture

```mermaid
flowchart LR
  W[n8n workflow item] --> N[IBM i Db2 Mapepire node]
  C[Encrypted n8n credential] --> N
  N --> V[SQL subset and policy validator]
  V --> B[Parameter and batch validation]
  B --> P{Pool enabled?}
  P -->|yes| MP[Process-local pool plus semaphore]
  P -->|no| EP[One-execution pool]
  MP --> M[Bundled official Mapepire 0.6.1]
  EP --> M
  M -->|Secure WebSocket, usually 8076| S[Mapepire server]
  S --> D[(Db2 for IBM i)]
```

## Build-time vendoring

```mermaid
flowchart LR
  I[npm installs exact Mapepire 0.6.1 as dev input] --> B[n8n-node build]
  B --> V[postbuild version, license, size and export checks]
  V --> C[Copy official dist/index.js]
  C --> R[Relative runtime file under dist]
  V --> L[Copy Apache-2.0 license]
  V --> H[Write SHA-256 manifest]
  R --> T[npm tarball with no third-party runtime dependency]
  L --> T
  H --> T
```

The source imports Mapepire declarations only as TypeScript types. Runtime code
loads `./vendor/mapepire-js.cjs`, so the installed n8n package does not resolve
an external `@ibm/mapepire-js` module.

## Connection lifecycle

With pooling enabled, one pool is cached per unique credential configuration in
each n8n process. A semaphore limits simultaneous executions to the configured
pool size and applies the configured wait timeout.

With pooling disabled, every execution creates a one-connection pool and closes
it in `finally`.

Queue workers and horizontally scaled n8n instances maintain independent pools.
Estimate IBM i SQL jobs as:

```text
pool size × number of n8n processes executing that credential
```

## Failure behavior

- SQL or policy errors are not retried.
- A transport-level SELECT failure can invalidate the pool and retry once.
- INSERT, UPDATE, and CREATE TABLE are never retried.
- A failed pool-initialization promise is evicted from the cache so a later
  execution can reconnect.
- A write transport error may have occurred after Db2 committed; reconcile the
  target data before manual repetition.
