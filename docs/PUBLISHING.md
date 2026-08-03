# GitHub, npm, and n8n community publication

## 1. Create the GitHub repository

Create a public repository named `n8n-nodes-ibmi-mapepire`, then from the
project directory:

```bash
git init
git branch -M main
git add .
git commit -m "Initial IBM i Mapepire n8n community node"
git remote add origin git@github.com:NicolaeCh/n8n-nodes-ibmi-mapepire.git
git push -u origin main
```

Enable GitHub Security Advisories, branch protection, and Dependabot as desired.
Do not commit credentials, hostnames, CA private keys, npm tokens, or production
SQL/logs.

## 2. Connected build before first release

Use Node.js 22.22 or newer:

```bash
npm install
npm run verify
npm run lint
npm run build
npm pack --dry-run
```

`npm install` creates `package-lock.json`. Review and commit it before the first
release, then change CI from `npm install` to `npm ci` if desired.

Run the live IBM i matrix in `TESTING.md`. The supplied offline report cannot
replace a test against the target Mapepire server, TLS chain, and IBM i release.

## 3. First npm publication

The package name already follows n8n's `n8n-nodes-` convention and includes the
`n8n-community-node-package` keyword. Keep the package public and retain the
`n8n` node/credential entries in `package.json`.

For first publication:

```bash
npm login
npm publish --access public --provenance
```

The npm account must be allowed to publish
`n8n-nodes-ibmi-mapepire`. Use two-factor authentication. Never store an npm
token in the repository.

After publication, record the exact package integrity:

```bash
npm view n8n-nodes-ibmi-mapepire@0.1.4 dist.integrity
```

That `sha512-...` value can be used as the n8n managed-package checksum.

## 4. Configure npm Trusted Publishing

After the package exists, configure npm Trusted Publishing for GitHub Actions:

- owner: `NicolaeCh`
- repository: `n8n-nodes-ibmi-mapepire`
- workflow: `publish.yml`

The included workflow requests `id-token: write`, installs npm 11.5.1 or newer,
runs verification/build, and publishes with provenance. It does not require a
long-lived npm token.

## 5. Publish subsequent versions

1. Update `package.json` and `CHANGELOG.md`.
2. Run the complete test/build/package checks.
3. Commit and push.
4. Create and push a matching semantic-version tag.

```bash
git tag v0.1.4
git push origin v0.1.4
```

The tag starts `.github/workflows/publish.yml`.

## 6. Make it directly installable in n8n

For an **unverified** self-hosted community node, npm publication with the
correct package name, keyword, compiled `dist` entries, and README is sufficient
for users to install the exact package name from **Settings → Community Nodes**.
No n8n Cloud listing is claimed.

Current verified-community-node rules require no external runtime dependencies.
This node must use `@ibm/mapepire-js`, so it should remain clearly documented as
unverified unless n8n changes the rule or explicitly accepts the dependency.
Do not remove Mapepire merely to obtain a verified badge, because that would
violate this project's functional requirement.

## 7. Release checklist

```bash
npm ci
npm run verify
npm run lint
npm run build
npm pack --dry-run
```

Also verify:

- live SELECT/INSERT/UPDATE/CREATE tests passed in a disposable schema
- write-interruption behavior was reconciled manually
- package contains only intended files
- required peer dependency is pinned exactly to `@ibm/mapepire-js@0.6.1`
- no secrets, private hostnames, or certificates are in source or tarball
- README version and declarative-install example match the release
- npm integrity checksum is documented for operators
