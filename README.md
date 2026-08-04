# n8n-nodes-ibmi-mapepire

A policy-controlled n8n community node for **Db2 for IBM i** using the official
Mapepire Node.js client.

Version 0.2.1 changes the packaging architecture so the published community
package has no third-party npm runtime dependency. During the build,
`@ibm/mapepire-js@0.6.1` is copied into `dist` together with its Apache-2.0
license and a SHA-256 manifest. This satisfies the current n8n community-node
package rules while retaining the official IBM client.

## Supported operations

The node deliberately exposes only:

- `SELECT`
- `INSERT ... VALUES`
- `UPDATE`
- restricted `CREATE TABLE`

There is no unrestricted “execute SQL” operation.

## Security policy

The node enforces the rules from the original IBM i SQL container project:

- one statement only; comments and semicolons are rejected
- the selected operation must match the first SQL verb
- all tables and views must be written as `SCHEMA.OBJECT`
- reads are limited to `SQL_ALLOWED_READ_SCHEMAS`
- writes are limited to one `SQL_ALLOWED_WRITE_SCHEMA`; blank disables writes
- parenthesized functions must be unqualified and explicitly allowlisted
- schema-qualified routines and SQL table functions are rejected
- dangerous functions such as `QCMDEXC`, IFS writes, HTTP writes, and email
  functions are rejected even when allowlisted
- `DELETE`, `MERGE`, `ALTER`, `DROP`, `TRUNCATE`, `CALL`, `GRANT`, `REVOKE`,
  transaction control, dynamic SQL, and command execution are rejected
- `INSERT ... SELECT`, CTE-based INSERT, `SELECT INTO`, and data-change table
  references are rejected
- `UPDATE` requires a top-level `WHERE`, unless the visible full-table override
  is deliberately enabled
- `CREATE TABLE` permits explicit columns, identity columns, primary keys, and
  unique constraints, while rejecting CTAS, `LIKE`, foreign references,
  generated expressions, table functions, and trailing physical options
- protected IBM system schemas can never be write targets
- placeholder count, scalar parameters, and batch size are validated

Writes are never retried after a transport failure because Db2 may already have
committed. A `SELECT` may be retried once after invalidating its process-local
pool.

The SQL validator is defence in depth. Use a dedicated IBM i profile with only
the object authorities required by the workflow.

## Requirements

- self-hosted n8n with community packages enabled
- a Mapepire server reachable from n8n, normally on TCP port `8076`
- an IBM i user profile with least privilege
- a Node.js runtime supported by the installed n8n release

The package is designed for self-hosted n8n and sets `n8n.strict=false` because
it optionally reads a CA certificate from a local container path. It is not
presented as an n8n Cloud verified node.

## Credential mapping

| Former environment variable | Credential field | Required/default |
|---|---|---|
| `MAPEPIRE_HOST` | Mapepire Host | Required |
| `MAPEPIRE_PORT` | Port | `8076` |
| `MAPEPIRE_USER` | IBM i User | Required |
| `MAPEPIRE_PASSWORD` | IBM i Password | Required |
| `MAPEPIRE_DATABASE` | Database | `*LOCAL` |
| `MAPEPIRE_IGNORE_UNAUTHORIZED` | Ignore Unauthorized TLS Certificates | `false` |
| `MAPEPIRE_CA_PATH` | CA Certificate Path | Optional |
| — | CA Certificate PEM | Optional alternative to CA path |
| `SQL_ALLOWED_READ_SCHEMAS` | Allowed Read Schemas | Required |
| `SQL_ALLOWED_WRITE_SCHEMA` | Allowed Write Schema | Blank disables writes |
| `SQL_ALLOWED_FUNCTIONS` | Allowed SQL Functions | Blank allows none |
| `MAPEPIRE_POOL_ENABLED` | Enable Pool | `true` |
| `MAPEPIRE_POOL_SIZE` | Pool Size | `4` |
| `MAPEPIRE_POOL_WAIT_SECONDS` | Pool Wait Seconds | `30` |
| `MAPEPIRE_QUERY_TRACE_ENABLED` | Enable Mapepire Query Trace | `false` |
| `MAPEPIRE_SLOW_QUERY_MS` | Slow Query Threshold | `750` ms |

The credential also defines maximum SELECT rows, page size, maximum batch rows,
SELECT retry behavior, date format, and decimal separator.

`X_API_KEY` is intentionally absent. It protected the previous HTTP service;
the direct node exposes no HTTP API. n8n authentication, encrypted credential
permissions, and IBM i authority now form the access boundary.

## Clean build and complete verification

Always extract the release into a new directory. Do not reuse an old
`node_modules` directory or lock file.

```bash
npm run release:build
```

On the first connected build, the script uses `npm install` and generates
`package-lock.json`. Commit that lock file before enabling GitHub CI. Subsequent
runs use `npm ci` automatically.

To deliberately regenerate the lock file:

```bash
RESET_LOCKFILE=1 npm run release:build
```

The release command performs:

1. exact `@n8n/node-cli` 0.41.2 verification
2. high/critical audit of the development toolchain
3. isolated audit of `@ibm/mapepire-js@0.6.1`
4. official `n8n-node lint`
5. official `n8n-node build`
6. 31 automated policy and execution tests
7. TypeScript verification
8. built-package policy and vendor-manifest verification
9. production-package audit excluding the host-provided peer
10. npm tarball creation, content inspection, checksum verification, and compiled entry-point smoke loading

The outputs are:

```text
release/n8n-nodes-ibmi-mapepire-0.2.1.tgz
release/n8n-nodes-ibmi-mapepire-0.2.1.tgz.sha256
```

Do not run `npm audit fix --force`. It can replace the pinned n8n CLI or alter
the reviewed Mapepire version. Update dependencies deliberately and rerun the
complete release pipeline.

## Test the tarball in an existing Podman n8n container

Copy the built tarball:

```bash
podman cp \
  release/n8n-nodes-ibmi-mapepire-0.2.1.tgz \
  n8n:/tmp/n8n-nodes-ibmi-mapepire-0.2.1.tgz
```

Install it as the same user that runs n8n:

```bash
podman exec -u node n8n sh -lc '
  set -eu
  mkdir -p /home/node/.n8n/nodes
  cd /home/node/.n8n/nodes
  [ -f package.json ] || npm init -y >/dev/null
  npm uninstall n8n-nodes-ibmi-mapepire --no-audit --no-fund || true
  npm install /tmp/n8n-nodes-ibmi-mapepire-0.2.1.tgz \
    --omit=dev --no-audit --no-fund
'

podman restart n8n
```

No separate `@ibm/mapepire-js` installation is needed. The official client is
already present inside the node tarball.

Verify the installed package:

```bash
podman exec -u node n8n node -e '
const p = require("/home/node/.n8n/nodes/node_modules/n8n-nodes-ibmi-mapepire/package.json");
console.log(p.name, p.version, p.dependencies, p.peerDependencies);
'
```

Expected package metadata:

```text
n8n-nodes-ibmi-mapepire 0.2.1 undefined { n8n-workflow: '*' }
```

Search for **IBM i Db2 (Mapepire)** in the editor, create an **IBM I Mapepire
API** credential, test the connection, and begin with a read-only credential by
leaving the write schema blank.

## Example SELECT

Credential policy:

```text
Allowed Read Schemas: SYSIBM,APPDATA
Allowed Write Schema: <blank>
Allowed SQL Functions: UPPER
```

SQL:

```sql
SELECT CUSTOMER_ID, UPPER(CUSTOMER_NAME) AS CUSTOMER_NAME
FROM APPDATA.CUSTOMERS
WHERE CUSTOMER_ID = ?
```

Parameters:

```json
[123]
```

## Publishing

After `npm run release:build` succeeds and the generated lock file is committed, publish the exact verified tarball:

```bash
npm publish release/n8n-nodes-ibmi-mapepire-0.2.1.tgz \
  --provenance --access public
```

The package can then be installed from **Settings → Community Nodes** using:

```text
n8n-nodes-ibmi-mapepire
```

See `docs/PUBLISHING.md` for GitHub Actions and npm trusted publishing.

## Verification scope

The included automated suite validates the SQL policy, configuration mapping,
pool construction, paging, truncation, SELECT retry, write no-retry behavior,
pool-disabled behavior, batch parameters, failed-pool recovery, queue timeout,
and package structure. Final certification still requires a live disposable
IBM i schema and reachable Mapepire server; see `docs/TESTING.md`.

## License

This project is MIT licensed. The bundled `@ibm/mapepire-js` runtime is
Apache-2.0 licensed; its license and bundle manifest are included in the built
package under `dist/vendor-licenses`.
