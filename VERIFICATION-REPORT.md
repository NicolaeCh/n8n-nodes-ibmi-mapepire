# Verification report — 0.2.2

Date: 2026-08-04

## Root causes corrected

The earlier releases had four structural problems:

1. stale `node_modules`/lock data selected `@n8n/node-cli` 0.20.0 instead of
   0.41.2, causing contradictory lint rules and vulnerable old toolchain
   dependencies;
2. the ESLint file did not reliably extend the official n8n configuration;
3. Mapepire was declared as a normal or peer runtime dependency, both of which
   conflict with current community-package lint rules;
4. development-only audit findings were being confused with code shipped to
   the n8n runtime.

Version 0.2.2 resolves these by requiring a clean exact toolchain, extending the
official ESLint configuration, embedding the official Mapepire 0.6.1 bundle at
build time, and auditing development and distributed runtime surfaces
separately.

## Packaging architecture

The source package has no `dependencies` field and declares only:

```json
"peerDependencies": {
  "n8n-workflow": "*"
}
```

`@ibm/mapepire-js@0.6.1` is an exact development input. `postbuild` verifies its
version and Apache-2.0 license, copies its official prebuilt CommonJS bundle to:

```text
dist/nodes/IbmiMapepire/lib/vendor/mapepire-js.cjs
```

and copies its license plus a SHA-256/size manifest to:

```text
dist/vendor-licenses/
```

The compiled node loads that relative file and has no runtime
`require('@ibm/mapepire-js')`.

## Verification completed in this environment

The following checks were executed successfully against the corrected source:

- source/package policy verifier
- TypeScript no-emit verification
- offline production TypeScript compilation
- compiled runtime inspection confirming the relative Mapepire load path
- removal of every source-level import from `@ibm/mapepire-js`; a local minimal API contract is used only for TypeScript checking
- 34/34 automated tests
- distinct light/dark icon verification
- credential/environment mapping verification
- SQL allowlist and denial-policy verification
- Mapepire pool option verification
- paging and truncation verification
- SELECT one-retry and write no-retry verification
- failed pool initialization eviction/recovery verification
- package script and lifecycle-policy inspection
- release-pipeline simulation through vendoring, manifest validation, npm packing, tarball extraction, and compiled entry-point loading
- tarball content validation confirming that TypeScript sources, declarations, source maps, tests, tools, and development dependencies are excluded

## Connected release gates

This execution environment cannot access the npm registry from the local build
container, so it cannot honestly claim to have run the official
`@n8n/node-cli@0.41.2` binary, `npm audit`, or copied the actual npm Mapepire
bundle into a final tarball here.

The release-pipeline simulation used a synthetic stand-in bundle only to exercise packaging mechanics; it was deleted afterward and is not shipped. The supplied `npm run release:build` command is therefore the definitive connected gate that installs and embeds the real npm artifact. It fails immediately on any of the following:

- CLI version other than 0.41.2
- high/critical development audit finding
- high/critical isolated Mapepire dependency finding
- n8n lint error or warning treated as an error
- n8n build failure
- failed automated test or type check
- missing/truncated/wrong-version Mapepire bundle
- missing Apache license or manifest
- external Mapepire runtime import remaining in compiled output
- runtime dependency in the npm tarball
- unexpected tarball structure
- a tarball whose compiled node or credential class cannot be loaded
- a mismatch between the verified tarball and the artifact selected for GitHub/npm publication
- a Mapepire manifest whose size or SHA-256 does not match the embedded file

Do not publish until this exact command succeeds in a connected clean checkout:

```bash
npm run release:build
```

## Viability conclusion

The corrected architecture is viable for self-hosted n8n:

- it uses the official Mapepire client API and bundle;
- it complies with the no-runtime-dependencies community package structure;
- it does not require Mapepire to be installed beside n8n;
- it preserves third-party license obligations;
- it keeps all original SQL restrictions;
- it has deterministic failure behavior for reads and writes;
- it provides reproducible connected lint/build/audit/package gates.

A live IBM i integration matrix remains mandatory before the first public npm
release. Automated mocks cannot prove TLS, authentication, IBM i authority,
Mapepire daemon compatibility, or commit ambiguity after a real network loss.
