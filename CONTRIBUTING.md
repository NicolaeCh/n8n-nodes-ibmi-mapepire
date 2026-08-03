# Contributing

Use Node.js 22 or newer. Before opening a pull request, run:

```bash
npm install
npm run verify
npm run lint
npm run build
```

Security restrictions must not be weakened without tests, documentation, and a
clear threat analysis. New SQL operations are out of scope unless explicitly
approved by the project maintainer.


### Clean development toolchain

This release pins `@n8n/node-cli` to `0.41.2`. Before linting a directory that
previously contained another release, remove the old dependency tree and lock
file:

```bash
rm -rf node_modules package-lock.json
npm install
npm exec -- n8n-node --version
```

The last command must report `0.41.2`. `npm run lint`, `npm run build`, and
`npm run dev` now perform this check automatically.

Do not use `npm audit fix --force` on the development project. It can replace
pinned build tools with incompatible versions. To evaluate vulnerabilities that
can affect a production installation, use:

```bash
npm audit --omit=dev
```

The npm tarball does not contain the CLI, ESLint, Handlebars, or other
development-only packages.
