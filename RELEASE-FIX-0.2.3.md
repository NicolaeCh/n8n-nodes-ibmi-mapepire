# Node.js 26 / PPC64LE installation correction — 0.2.3

The 0.2.3 tarball itself does not depend on `isolated-vm`. The failure occurred
because npm automatically installed the `n8n-workflow` peer into
`/home/node/.n8n/nodes`. That duplicate n8n dependency tree pulled
`isolated-vm@6.1.2`, whose direct V8 bindings do not compile with Node.js 26.5.0.

Version 0.2.3 keeps `n8n-workflow: "*"` as the declared n8n host API peer and
adds:

```json
"peerDependenciesMeta": {
  "n8n-workflow": {
    "optional": true
  }
}
```

npm therefore does not install a private copy of `n8n-workflow`; the running n8n
host supplies it. The installation command additionally uses `--omit=peer`.
The packed node has no package-owned production dependency and no native addon.

The following working-source changes are retained:

- `/* eslint-disable @n8n/community-nodes/node-usable-as-tool */` at the top of the node file;
- no `usableAsTool` property;
- `/* eslint-disable @n8n/community-nodes/no-restricted-globals */` at the top of `semaphore.ts`;
- restricted-import exceptions above the `node:fs` and `node:module` imports;
- the accepted operation-description punctuation in the supplied source.
