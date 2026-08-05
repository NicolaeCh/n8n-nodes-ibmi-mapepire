# Installation

## Build the local tarball

Use a fresh extraction directory:

```bash
npm run release:build
```

The generated artifact is:

```text
release/n8n-nodes-ibmi-mapepire-0.2.3.tgz
```

The tarball already contains the official Mapepire 0.6.1 runtime. Do not install
`@ibm/mapepire-js` separately in n8n. The `n8n-workflow` peer is host-provided
and optional in package metadata, so npm must not create a second n8n runtime
tree in `/home/node/.n8n/nodes`.

## Install in a Podman n8n container

```bash
podman cp \
  release/n8n-nodes-ibmi-mapepire-0.2.3.tgz \
  n8n:/tmp/n8n-nodes-ibmi-mapepire-0.2.3.tgz

podman exec -u node n8n sh -lc '
  set -eu
  mkdir -p /home/node/.n8n/nodes
  cd /home/node/.n8n/nodes
  [ -f package.json ] || npm init -y >/dev/null
  npm uninstall n8n-nodes-ibmi-mapepire --no-audit --no-fund || true
  npm install /tmp/n8n-nodes-ibmi-mapepire-0.2.3.tgz \
    --omit=dev --omit=peer --no-audit --no-fund
'

podman restart n8n
```

Persist `/home/node/.n8n` or the corresponding n8n data volume.

## Verify package loading

```bash
podman exec -u node n8n sh -lc '
  test -f /home/node/.n8n/nodes/node_modules/n8n-nodes-ibmi-mapepire/dist/nodes/IbmiMapepire/lib/vendor/mapepire-js.cjs
  test -f /home/node/.n8n/nodes/node_modules/n8n-nodes-ibmi-mapepire/dist/vendor-licenses/mapepire-js-LICENSE.txt
  npm --prefix /home/node/.n8n/nodes list n8n-nodes-ibmi-mapepire
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

Use the credential test button. It executes:

```sql
SELECT CURRENT_SERVER AS SERVER_NAME
FROM SYSIBM.SYSDUMMY1
```

Then execute the same query in a workflow node.

## Remove the local package

```bash
podman exec -u node n8n sh -lc '
  cd /home/node/.n8n/nodes
  npm uninstall n8n-nodes-ibmi-mapepire --no-audit --no-fund
'
podman restart n8n
```


## Node.js 26 / PPC64LE note

Use both `--omit=dev` and `--omit=peer`. Version 0.2.3 also marks the
`n8n-workflow` peer as optional, so a normal npm install does not pull
`n8n-workflow`, `n8n-core`, or `isolated-vm` into the community-node directory.
The node package itself contains only JavaScript, SVG, JSON, and the bundled
Mapepire JavaScript client; it has no native addon to rebuild for Node.js
26.

If the previous 0.2.2 install failed while compiling `isolated-vm`, remove the
failed package and prune only dependencies that are no longer referenced by
`/home/node/.n8n/nodes/package.json`. This avoids deleting dependencies required
by other installed community nodes:

```bash
podman exec -u node n8n sh -lc '
  set -eu
  cd /home/node/.n8n/nodes
  npm uninstall n8n-nodes-ibmi-mapepire --no-audit --no-fund || true
  npm prune --omit=dev --omit=peer --no-audit --no-fund || true
  npm install /tmp/n8n-nodes-ibmi-mapepire-0.2.3.tgz \
    --omit=dev --omit=peer --no-audit --no-fund
'
```

Do not manually remove a shared `n8n-workflow` or `isolated-vm` directory unless
`npm ls --all` confirms that no other installed community package references it.
