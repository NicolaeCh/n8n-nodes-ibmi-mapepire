# GitHub and npm publishing

## Independent npm identity

Publish only this scoped package:

```text
@nicolaech/n8n-nodes-ibmi-db2-mapepire
```

Do not publish or request ownership of the unrelated unscoped package name.
The package metadata fixes the registry to `https://registry.npmjs.org/` and
sets public access for the `@nicolaech` scope.

## 1. Run the release gate

```bash
npm run release:build
```

The first connected build creates `package-lock.json`. Commit it with the
source before enabling CI.

## 2. Inspect the package

```bash
tar -tzf release/nicolaech-n8n-nodes-ibmi-db2-mapepire-0.2.4.tgz
```

Confirm that the tarball contains:

```text
dist/nodes/IbmiMapepire/lib/vendor/mapepire-js.cjs
dist/vendor-licenses/mapepire-js-LICENSE.txt
dist/vendor-licenses/mapepire-js-MANIFEST.json
```

It must not contain `node_modules`, source tests, developer tools, private
addresses, credentials, or certificate material.

Verify the packed identity before publishing:

```bash
npm pkg get name version publishConfig
npm pack --dry-run
```

Expected name:

```text
@nicolaech/n8n-nodes-ibmi-db2-mapepire
```

## 3. Publish manually

Authenticate as `nicolaech` and publish the exact verified tarball:

```bash
npm whoami
npm publish release/nicolaech-n8n-nodes-ibmi-db2-mapepire-0.2.4.tgz \
  --access public
```

For provenance, publish through the supplied GitHub Actions workflow or from a
supported CI provider:

```bash
npm publish release/nicolaech-n8n-nodes-ibmi-db2-mapepire-0.2.4.tgz \
  --provenance --access public
```

Check the published package:

```bash
npm view @nicolaech/n8n-nodes-ibmi-db2-mapepire@0.2.4 \
  name version dist.integrity maintainers
```

## 4. Configure npm trusted publishing

Configure npm trusted publishing for:

- GitHub owner: `NicolaeCh`
- repository: `n8n-nodes-ibmi-mapepire`
- workflow: `.github/workflows/publish.yml`

The workflow requests `id-token: write`, creates the exact release artifact,
and publishes only the scoped package when a semantic-version tag is pushed.

```bash
git tag v0.2.4
git push origin v0.2.4
```

## 5. n8n community installation

After publication, self-hosted users install this exact name from
**Settings → Community Nodes**:

```text
@nicolaech/n8n-nodes-ibmi-db2-mapepire
```

The node is intentionally self-hosted and unverified because it can access a
local CA path and private IBM i infrastructure. Do not claim n8n Cloud
verification.
