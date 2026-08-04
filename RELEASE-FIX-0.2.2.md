# Release build correction — 0.2.2

Version 0.2.2 fixes the five issues reported by `n8n-node lint` 0.41.2:

- four option-description strings no longer end in a period;
- Mapepire pool initialization no longer throws a custom error from the asynchronous infrastructure helper. The original initialization error is preserved, the failed pool is closed, and the cached rejected pool is evicted so the next execution can reconnect.

The development-tool audit is now parsed as JSON and blocks only high or critical findings. Moderate findings inherited from the pinned n8n CLI are clearly reported as development-only and do not enter the npm tarball. Runtime and bundled-Mapepire audits remain blocking.

Build from a clean tree with:

```bash
RESET_LOCKFILE=1 npm run release:build
```
