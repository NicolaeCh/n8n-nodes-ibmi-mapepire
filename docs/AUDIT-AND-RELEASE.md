# Audit and release verification

## Why the previous audit was misleading

The reported Handlebars and Minimatch findings came from the obsolete
`@n8n/node-cli` 0.20.0 development tree. They were not Mapepire runtime
findings. Reusing an old `node_modules` directory or lock file caused npm scripts
to select that stale CLI.

Version 0.2.1 pins CLI 0.41.2 and checks its installed version before lint,
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

## Why development audit warnings may remain

`@n8n/node-cli` brings a large development-only tree for linting, local n8n execution, and AI-node tooling. `npm run release:build` blocks on **high** or **critical** findings in that tree, but moderate transitive findings are reported without blocking the distributable package. The two runtime-relevant gates remain separate and blocking:

- `npm run audit:bundled-runtime` audits a clean installation of `@ibm/mapepire-js@0.6.1` and its WebSocket runtime.
- `npm run audit:package` audits the dependency surface of the package that n8n installs.

Do not use `npm audit fix --force`; it may replace the pinned n8n CLI or other reviewed tooling with semver-major versions.

## Incomplete tarballs are rejected

Running `npm pack` without a successful build used to create a metadata-only archive. Version 0.2.1 adds a `prepack` integrity guard. Packing now fails unless all compiled node files, both icons, the embedded Mapepire client, its Apache license, and its SHA-256 manifest are present and consistent.
