# Installation

## Package identity

The independent npm package is:

```text
@nicolaech/n8n-nodes-ibmi-db2-mapepire
```

It is a Mapepire implementation and is not related to any iODBC-based package.
The distinct package basename also prevents n8n from treating two unrelated
community packages as the same package.

## Build the local tarball

Use a fresh extraction directory:

```bash
npm run release:build
```

The generated artifact is:

```text
release/nicolaech-n8n-nodes-ibmi-db2-mapepire-0.2.4.tgz
```

The tarball already contains the official Mapepire 0.6.1 runtime. Do not install
`@ibm/mapepire-js` separately in n8n. The `n8n-workflow` peer is host-provided
and optional in package metadata, so npm must not create a second n8n runtime
tree in `/home/node/.n8n/nodes`.

## Install the published package

From **Settings → Community Nodes**, enter:

```text
@nicolaech/n8n-nodes-ibmi-db2-mapepire
```

For a command-line installation in the n8n data directory:

```bash
podman exec -u node n8n sh -lc '
  set -eu
  mkdir -p /home/node/.n8n/nodes
  cd /home/node/.n8n/nodes
  [ -f package.json ] || npm init -y >/dev/null
  npm install @nicolaech/n8n-nodes-ibmi-db2-mapepire \
    --omit=dev --omit=peer --no-audit --no-fund
'

podman restart n8n
```

## Install a locally built tarball

```bash
podman cp \
  release/nicolaech-n8n-nodes-ibmi-db2-mapepire-0.2.4.tgz \
  n8n:/tmp/nicolaech-n8n-nodes-ibmi-db2-mapepire-0.2.4.tgz

podman exec -u node n8n sh -lc '
  set -eu
  mkdir -p /home/node/.n8n/nodes
  cd /home/node/.n8n/nodes
  [ -f package.json ] || npm init -y >/dev/null
  npm uninstall @nicolaech/n8n-nodes-ibmi-db2-mapepire \
    --no-audit --no-fund || true
  npm install /tmp/nicolaech-n8n-nodes-ibmi-db2-mapepire-0.2.4.tgz \
    --omit=dev --omit=peer --no-audit --no-fund
'

podman restart n8n
```

Persist `/home/node/.n8n` or the corresponding n8n data volume.

## Verify package loading

```bash
podman exec -u node n8n sh -lc '
  PACKAGE=/home/node/.n8n/nodes/node_modules/@nicolaech/n8n-nodes-ibmi-db2-mapepire
  test -f "$PACKAGE/dist/nodes/IbmiMapepire/lib/vendor/mapepire-js.cjs"
  test -f "$PACKAGE/dist/vendor-licenses/mapepire-js-LICENSE.txt"
  npm --prefix /home/node/.n8n/nodes list @nicolaech/n8n-nodes-ibmi-db2-mapepire
'
```

Inspect startup logs:

```bash
podman logs --since 5m n8n 2>&1 | grep -Ei 'ibmi|mapepire|credential|community|error'
```

Search for **IBM i Db2 (Mapepire)** in the node picker.

## First credential test

Start read-only:

```text
Allowed Read Schemas: SYSIBM
Allowed Write Schema: <blank>
Allowed SQL Functions: <blank>
```

The credential test executes:

```sql
SELECT CURRENT_SERVER AS SERVER_NAME
FROM SYSIBM.SYSDUMMY1
```

## Remove the package

```bash
podman exec -u node n8n sh -lc '
  cd /home/node/.n8n/nodes
  npm uninstall @nicolaech/n8n-nodes-ibmi-db2-mapepire \
    --no-audit --no-fund
'

podman restart n8n
```

## Node.js 26 and PPC64LE

Use both `--omit=dev` and `--omit=peer`. Version 0.2.4 marks the
`n8n-workflow` peer as optional, so installation does not pull `n8n-core` or
`isolated-vm` into the community-node directory. The published package contains
only JavaScript, SVG, JSON, and the bundled Mapepire JavaScript client; it has no
native addon to rebuild for Node.js 26.

## Migrate workflows from the earlier local package name

Before removing the locally installed unscoped build, export affected workflows.
Replace this exact node type:

```text
n8n-nodes-ibmi-mapepire.ibmiMapepire
```

with the fully scoped node type:

```text
@nicolaech/n8n-nodes-ibmi-db2-mapepire.ibmiMapepire
```

The credential internal name remains `ibmiMapepireApi`, so existing credential
records can normally be reused. See `PACKAGE-IDENTITY.md`.
