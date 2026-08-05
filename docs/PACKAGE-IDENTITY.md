# Independent package identity

## npm package

```text
@nicolaech/n8n-nodes-ibmi-db2-mapepire
```

This project is an independent Db2 for IBM i node implemented with the official
Mapepire JavaScript client. It is not a fork, continuation, or repackaging of an
iODBC-based community node.

A distinct basename is used deliberately. n8n supports scoped community package
names and uses the complete package name as the workflow type prefix. The unique
basename `n8n-nodes-ibmi-db2-mapepire` also makes exported workflows and support
logs clearly distinguishable from unrelated packages.

## Identities that remain unchanged

The visible node and credential names remain:

```text
Node display name: IBM i Db2 (Mapepire)
Node internal name: ibmiMapepire
Credential display name: IBM I Mapepire API
Credential internal name: ibmiMapepireApi
```

## Workflow migration from the local unscoped build

Workflows created with the earlier local tarball may contain:

```json
"type": "n8n-nodes-ibmi-mapepire.ibmiMapepire"
```

The independent package uses:

```json
"type": "@nicolaech/n8n-nodes-ibmi-db2-mapepire.ibmiMapepire"
```

Export each affected workflow before removing the local package, replace only
that exact `type` value, then import or update the workflow after installing the
scoped package. The credential internal name is unchanged, so existing
credential references can normally be retained.
