# n8n-nodes-ibmi-mapepire

A policy-controlled n8n community node for **Db2 for IBM i** that connects
directly through the official `@ibm/mapepire-js` Node.js client.

The package implements the connection settings and SQL restrictions of the
`ibmi-n8n-sql-container` project without its intermediate HTTP service. The
Mapepire connection, TLS settings, pool settings, and SQL allowlists live in an
encrypted n8n credential and can be selected when the node is added to a
workflow.

## Operations

The node exposes only:

- `SELECT`
- `INSERT ... VALUES`
- `UPDATE`
- restricted `CREATE TABLE`

There is no generic “execute SQL” operation.

## Security policy

Always enforced:

- exactly one statement; comments and semicolons are rejected
- operation and leading SQL verb must match
- table/view names after `FROM`, `JOIN`, `INSERT INTO`, `UPDATE`, and
  `CREATE TABLE` must use `SCHEMA.OBJECT`
- reads are limited by `SQL_ALLOWED_READ_SCHEMAS`
- all writes and table creation are limited to the single
  `SQL_ALLOWED_WRITE_SCHEMA`; blank disables writes
- parenthesized SQL functions must be unqualified and listed in
  `SQL_ALLOWED_FUNCTIONS`
- every schema-qualified routine and every SQL table function is rejected
- dangerous functions such as `QCMDEXC`, IFS writes, HTTP writes, and email
  functions are rejected even if listed
- `DELETE`, `MERGE`, `DROP`, `ALTER`, `TRUNCATE`, `CALL`, `GRANT`, `REVOKE`,
  transaction control, dynamic SQL, and command execution are rejected
- `INSERT ... SELECT`, CTE-based insert, `SELECT INTO`, and data-change table
  references are rejected
- `UPDATE` needs a top-level `WHERE`, unless a visible per-node override is set
- `CREATE TABLE` accepts explicit base-table definitions and identity columns;
  CTAS, `LIKE`, foreign references, generated expressions, definition reads,
  routines, and trailing table options are rejected
- protected IBM system schemas can never be write targets
- placeholder count and scalar/batch parameters are validated before execution

Writes are **never retried** after a transport failure because Db2 may already
have committed. A `SELECT` can be retried once after recreating its pool.

The SQL validator is defence in depth. Use a dedicated IBM i profile with only
the required object authorities.

## Requirements

- self-hosted n8n with community packages enabled
- Mapepire server reachable from the n8n runtime; default port `8076`
- an IBM i profile with least privilege
- Node.js 22.22 or newer at runtime, aligned with n8n 2.31.6; Node.js 26 is supported by the package metadata

Because the package has the required runtime dependency `@ibm/mapepire-js`, it
is an **unverified self-hosted community node** under the current n8n verified
node rules. It is not presented as an n8n Cloud verified node.

## Install from npm

After publication, open **Settings → Community Nodes → Install**, enter:

```text
n8n-nodes-ibmi-mapepire
```

Accept the unverified community package warning and restart n8n when required.

For n8n 2.21 or newer, declarative installation is supported:

```yaml
environment:
  N8N_COMMUNITY_PACKAGES_ENABLED: "true"
  N8N_UNVERIFIED_PACKAGES_ENABLED: "true"
  N8N_COMMUNITY_PACKAGES_MANAGED_BY_ENV: "true"
  N8N_COMMUNITY_PACKAGES: >-
    [{"name":"n8n-nodes-ibmi-mapepire","version":"0.1.2"}]
```

For stricter supply-chain control, replace the broad unverified-package switch
with the published SHA-512 npm checksum:

```yaml
N8N_UNVERIFIED_PACKAGES_ENABLED: "false"
N8N_COMMUNITY_PACKAGES: >-
  [{"name":"n8n-nodes-ibmi-mapepire","version":"0.1.2","checksum":"sha512-..."}]
```

The environment-managed list is the complete desired package set; omitted
packages are removed. Persist `/home/node/.n8n`.

## Install the supplied tarball

The release ZIP includes `n8n-nodes-ibmi-mapepire-0.1.2.tgz`:

```bash
mkdir -p /home/node/.n8n/nodes
cd /home/node/.n8n/nodes
npm install /tmp/n8n-nodes-ibmi-mapepire-0.1.2.tgz
```

Run the command as the same user that starts n8n, usually `node` in the official
container. npm must also be able to obtain the pinned `@ibm/mapepire-js@0.6.1`
dependency from its configured registry or cache. Restart n8n afterward.

## Credential fields

### Required or defaulted connection values

| Former variable | Credential field | Required | Default |
|---|---|---:|---:|
| `MAPEPIRE_HOST` | Mapepire Host | Yes | — |
| `MAPEPIRE_PORT` | Port | Defaulted | `8076` |
| `MAPEPIRE_USER` | IBM i User | Yes | — |
| `MAPEPIRE_PASSWORD` | IBM i Password | Yes | — |
| `MAPEPIRE_DATABASE` | Database | Defaulted | `*LOCAL` |
| `SQL_ALLOWED_READ_SCHEMAS` | Allowed Read Schemas | Yes | — |

### Optional policy, TLS, and pool values

| Former variable | Credential field | Default / behavior |
|---|---|---|
| `MAPEPIRE_IGNORE_UNAUTHORIZED` | Ignore Unauthorized TLS Certificates | `false` |
| `MAPEPIRE_CA_PATH` | CA Certificate Path | blank; server/container path |
| — | CA Certificate PEM | blank; alternative to CA path |
| `SQL_ALLOWED_WRITE_SCHEMA` | Allowed Write Schema | blank disables INSERT, UPDATE, CREATE TABLE |
| `SQL_ALLOWED_FUNCTIONS` | Allowed SQL Functions | blank allows no parenthesized functions |
| `MAPEPIRE_POOL_ENABLED` | Enable Pool | `true` |
| `MAPEPIRE_POOL_SIZE` | Pool Size | `4` |
| `MAPEPIRE_POOL_WAIT_SECONDS` | Pool Wait Seconds | `30` |
| `MAPEPIRE_QUERY_TRACE_ENABLED` | Enable Mapepire Query Trace | `false` |
| `MAPEPIRE_SLOW_QUERY_MS` | Slow Query Threshold | `750` ms; `0` disables marker |

The credential also contains node-specific safety controls: maximum SELECT rows,
fetch page size, maximum batch rows, read-only retry, date format, and decimal
separator.

`X_API_KEY` is intentionally absent. It protected the former REST endpoint; the
direct node exposes no HTTP API. n8n login/project permissions, encrypted
credential permissions, and IBM i authority form the access boundary.

## Usage

### SELECT

Credential:

```text
SQL_ALLOWED_READ_SCHEMAS=APPDATA
SQL_ALLOWED_FUNCTIONS=UPPER
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

### Batch INSERT

```sql
INSERT INTO APPDATA.EVENTS (EVENT_ID, EVENT_TEXT) VALUES (?, ?)
```

```json
[
  [1001, "Started"],
  [1002, "Completed"]
]
```

### UPDATE

```sql
UPDATE APPDATA.EVENTS
SET EVENT_TEXT = ?
WHERE EVENT_ID = ?
```

```json
["Acknowledged", 1001]
```

### Restricted CREATE TABLE

```sql
CREATE TABLE APPDATA.N8N_EVENTS (
  EVENT_ID BIGINT GENERATED ALWAYS AS IDENTITY,
  EVENT_TEXT VARCHAR(1024),
  CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (EVENT_ID)
)
```

## Build and verify

```bash
npm install
npm run verify
npm run lint
npm run build
npm pack --dry-run
```

The supplied offline verification harness checks the policy engine, credential
mapping, Mapepire pool and paging calls, read retry, write no-retry behavior,
pool-disabled mode, TypeScript compilation, and package metadata. A live
integration test still requires a reachable non-production IBM i Mapepire
server.

See `docs/` for architecture, exact rules, migration, testing, installation, and
GitHub/npm publication.

## License

MIT. `@ibm/mapepire-js` is Apache-2.0; see `NOTICE`.
