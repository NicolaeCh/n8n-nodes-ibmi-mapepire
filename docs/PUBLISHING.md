# GitHub and npm publishing

## 1. Run the connected release gate

```bash
npm run release:build
```

The command creates `package-lock.json` on the first run. Commit it together
with the source before enabling CI.

## 2. Inspect the package

```bash
tar -tzf release/n8n-nodes-ibmi-mapepire-0.2.1.tgz
```

Confirm that the tarball contains:

```text
dist/nodes/IbmiMapepire/lib/vendor/mapepire-js.cjs
dist/vendor-licenses/mapepire-js-LICENSE.txt
dist/vendor-licenses/mapepire-js-MANIFEST.json
```

and does not contain `node_modules`, source tests, developer tools, credentials,
private addresses, or certificate material.

## 3. Create the GitHub repository

Repository name:

```text
n8n-nodes-ibmi-mapepire
```

Push the complete source and generated lock file. The included CI tests Node
22.22 and Node 24 with `npm ci`.

## 4. Publish the first version

Log into npm with two-factor authentication and publish:

```bash
npm publish release/n8n-nodes-ibmi-mapepire-0.2.1.tgz --provenance --access public
```

Record the integrity value:

```bash
npm view n8n-nodes-ibmi-mapepire@0.2.1 dist.integrity
```

## 5. Configure trusted publishing

Configure npm trusted publishing for:

- GitHub owner: `NicolaeCh`
- repository: `n8n-nodes-ibmi-mapepire`
- workflow: `.github/workflows/publish.yml`

The supplied workflow requests `id-token: write` and publishes on a semantic
version tag.

```bash
git tag v0.2.1
git push origin v0.2.1
```

## 6. n8n community installation

After npm publication, self-hosted users install the exact package name from
**Settings → Community Nodes**:

```text
n8n-nodes-ibmi-mapepire
```

The node is intentionally self-hosted/unverified because it can access a local
CA path and connects directly to private IBM i infrastructure. Do not claim n8n
Cloud verification.
