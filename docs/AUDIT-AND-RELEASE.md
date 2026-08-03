# Audit and release verification

## Why the previous audit was misleading

The reported Handlebars and Minimatch findings came from the obsolete
`@n8n/node-cli` 0.20.0 development tree. They were not Mapepire runtime
findings. Reusing an old `node_modules` directory or lock file caused npm scripts
to select that stale CLI.

Version 0.2.0 pins CLI 0.41.2 and checks its installed version before lint,
build, or development starts.

## Audit surfaces

The release pipeline checks three distinct surfaces:

1. `audit:toolchain` — the clean development tree, including the n8n CLI, ESLint, TypeScript, and build tools, while omitting the host-provided `n8n-workflow` peer;
2. `audit:bundled-runtime` — an isolated exact installation of
   `@ibm/mapepire-js@0.6.1` and its production dependency graph;
3. `audit:package` — the package's own production dependency tree with both development dependencies and the host-provided `n8n-workflow` peer omitted. The result must contain no package-owned runtime dependency.

The copied Mapepire JavaScript file is additionally pinned by exact package
version, size checks, an export marker, and a SHA-256 manifest. The upstream
0.6.1 release specifically included dependency security updates.

## Commands

```bash
npm run audit:toolchain
npm run audit:bundled-runtime
npm run audit:package
```

Do not run:

```bash
npm audit fix --force
```

A forced audit fix is allowed to replace pinned build tooling and can recreate
the exact CLI-version mismatch that caused the earlier lint output.

## Reproducible release

```bash
npm run release:build
```

If no lock file exists, the first run creates one. Commit it. Later builds and
CI use `npm ci`.

The release pipeline verifies the tarball itself, not just the source tree. It
rejects normal runtime dependencies, invalid peer dependencies, a missing
Mapepire bundle/license, an external Mapepire require, and a truncated vendor
file.
