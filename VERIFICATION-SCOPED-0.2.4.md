# Scoped package verification — 0.2.4

Package identity:

```text
@nicolaech/n8n-nodes-ibmi-db2-mapepire
```

Validated on 2026-08-05 in a clean source tree with Node.js 22.16.0 and npm
10.9.2:

- source/package policy verification passed;
- all 35 unit tests passed;
- TypeScript no-emit verification passed;
- `package.json` and the example workflow parsed as JSON;
- GitHub Actions workflows parsed as YAML;
- release shell scripts passed `sh -n`;
- modified Node.js tools passed `node --check`;
- scoped npm tarball naming resolves to
  `nicolaech-n8n-nodes-ibmi-db2-mapepire-0.2.4.tgz`;
- the tarball verifier resolves the installed package through
  `node_modules/@nicolaech/n8n-nodes-ibmi-db2-mapepire`;
- the example workflow uses the full scoped node type
  `@nicolaech/n8n-nodes-ibmi-db2-mapepire.ibmiMapepire`.

The official connected `n8n-node lint`, build, Mapepire vendoring, npm audit,
and final tarball smoke test must still run through:

```bash
RESET_LOCKFILE=1 npm run release:build
```

They were not rerun in this packaging environment because its npm mirror does
not provide `@ibm/mapepire-js@0.6.1`.
