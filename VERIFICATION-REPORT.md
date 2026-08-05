# Verification report — 0.2.3

Date: 2026-08-05

## Deployment failure addressed

The supplied n8n-container log shows `isolated-vm@6.1.2` being compiled with
Node.js 26.5.0 on PPC64LE and failing against changed V8 C++ APIs. The custom
IBM i node does not use `isolated-vm`; it entered the installation through a
second n8n peer/dependency tree created in the community-node directory.

Version 0.2.3 prevents that duplicate runtime tree while retaining
`n8n-workflow` as the declared host API peer.

## Node.js 26-safe packaging architecture

The package has no package-owned production dependencies. Its peer metadata is:

```json
"peerDependencies": {
  "n8n-workflow": "*"
},
"peerDependenciesMeta": {
  "n8n-workflow": {
    "optional": true
  }
}
```

Marking the peer optional prevents npm from automatically installing a private
copy. The deployment command also uses `--omit=peer` as a second safeguard.
The running n8n host supplies `n8n-workflow` through its initialized module
search path.

The official `@ibm/mapepire-js@0.6.1` CommonJS bundle remains an exact build
input. The release build copies it, its Apache-2.0 license, and a SHA-256/size
manifest into `dist`. The compiled node loads only that relative JavaScript
file. The published package therefore contains no native addon that needs to be
rebuilt for Node.js 26 or PPC64LE.

## Preserved working source corrections

The 0.2.3 source verifier requires all changes identified in the supplied
working project:

- file-level `node-usable-as-tool` ESLint exception in the node file;
- complete absence of a `usableAsTool` property;
- file-level `no-restricted-globals` exception in `semaphore.ts`;
- `no-restricted-imports` exceptions above `node:fs` and `node:module`;
- the accepted period on the INSERT operation description.

A future release fails source verification if any of these changes is removed.

## Build and runtime split

The official n8n lint/build toolchain remains on Node.js 24. The resulting
JavaScript npm tarball is tested separately with Node.js 26.5.0. This avoids
confusing development-tool compatibility with runtime compatibility.

GitHub CI now contains:

1. a Node.js 24 job that installs the exact toolchain, audits, lints, builds,
   runs all tests, packs the node, and verifies the tarball;
2. a Node.js 26.5.0 job that downloads that exact tarball and performs a clean
   production installation and runtime smoke load.

## New packed-artifact gate

`tools/verify-tarball.mjs` now performs a clean local-tarball installation and
fails when any directory named `n8n-workflow` or `isolated-vm` appears anywhere
inside the installed package tree. It then loads the exact clean-installed node
and credential JavaScript while exposing a fake host `n8n-workflow` only through
`NODE_PATH`. This models n8n host resolution without hiding an accidental local
peer installation.

The same gate validates:

- no normal runtime dependencies;
- exact optional peer metadata;
- no TypeScript sources, declarations, maps, tests, tools, or scripts in the
  published tarball;
- the relative Mapepire load path;
- Mapepire package/version/license identity;
- embedded bundle size and SHA-256;
- compiled node and credential identities.

## Verification completed here

The following checks passed:

- 34/34 automated policy, configuration, execution, retry, pooling, and
  semaphore tests;
- TypeScript no-emit verification;
- offline production TypeScript compilation;
- source/package policy verification;
- JavaScript syntax checks;
- GitHub workflow YAML parsing;
- a complete synthetic package-pipeline test, including clean npm installation,
  rejection of local peers/native addons, manifest verification, and host-path
  runtime loading.

The synthetic Mapepire bundle was used only to exercise package mechanics and
is not included in the delivered source ZIP.

## Connected release gates still required

This environment could not fetch the authentic `@ibm/mapepire-js@0.6.1`
package or the complete n8n development toolchain from the configured registry,
and it could not directly run Node.js 26.5.0 on PPC64LE. Therefore the delivered
ZIP is source-ready, not a prebuilt installable `.tgz`.

On a connected Node.js 24 build host run:

```bash
RESET_LOCKFILE=1 npm run release:build
```

The command must produce:

```text
release/n8n-nodes-ibmi-mapepire-0.2.3.tgz
release/n8n-nodes-ibmi-mapepire-0.2.3.tgz.sha256
```

Install the resulting tarball in the Node.js 26 n8n container with:

```bash
npm install /tmp/n8n-nodes-ibmi-mapepire-0.2.3.tgz \
  --omit=dev --omit=peer --no-audit --no-fund
```

A live IBM i/Mapepire test remains mandatory before public publication.
