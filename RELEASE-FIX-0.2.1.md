# Release build correction — 0.2.1

The 0.2.0 release stopped before lint/build because `release-it@20.2.0`, an unused direct development dependency, introduced a high-severity `undici` audit path. The later manual `npm pack` therefore had no `dist/` directory and produced only four metadata files.

Version 0.2.1 removes that direct dependency and adds a hard `prepack` integrity gate. A tarball cannot be produced unless the node is compiled and the official Mapepire 0.6.1 bundle, Apache license, and integrity manifest are present.

Run from a fresh extraction:

```bash
RESET_LOCKFILE=1 npm run release:build
```

A successful run creates:

```text
release/nicolaech-n8n-nodes-ibmi-db2-mapepire-0.2.1.tgz
release/nicolaech-n8n-nodes-ibmi-db2-mapepire-0.2.1.tgz.sha256
```

Warnings marked `deprecated` do not by themselves fail npm installation. The release does fail on high/critical development advisories, high/critical Mapepire runtime advisories, lint/build/test/type/package verification failures, or an incomplete tarball.
