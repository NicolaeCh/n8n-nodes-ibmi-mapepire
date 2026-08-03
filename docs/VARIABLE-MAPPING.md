# Variable and credential mapping

The former container environment is represented by an encrypted n8n credential.
Each workflow node chooses a credential; the SQL and its parameter values remain
node fields.

| Former `.env` variable | Credential property | Needed | Default / notes |
|---|---|---:|---|
| `MAPEPIRE_HOST` | Mapepire Host | Yes | Mapepire DNS/IP |
| `MAPEPIRE_PORT` | Port | Defaulted | `8076` |
| `MAPEPIRE_USER` | IBM i User | Yes | Dedicated profile |
| `MAPEPIRE_PASSWORD` | IBM i Password | Yes | Secret |
| `MAPEPIRE_DATABASE` | Database | Defaulted | `*LOCAL`; passed as JDBC `database name` |
| `MAPEPIRE_IGNORE_UNAUTHORIZED` | Ignore Unauthorized TLS Certificates | Optional | `false`; internally maps to `rejectUnauthorized: true` |
| `MAPEPIRE_CA_PATH` | CA Certificate Path | Optional | Path visible to the n8n process/container |
| — | CA Certificate PEM | Optional | Inline alternative to `MAPEPIRE_CA_PATH`; do not set both |
| `MAPEPIRE_POOL_ENABLED` | Enable Pool | Optional | `true`; false creates/closes a one-connection pool per execution |
| `MAPEPIRE_POOL_SIZE` | Pool Size | Optional | `4` per n8n process |
| `MAPEPIRE_POOL_WAIT_SECONDS` | Pool Wait Seconds | Optional | `30` |
| `MAPEPIRE_QUERY_TRACE_ENABLED` | Enable Mapepire Query Trace | Optional | `false`; passed as JDBC trace option |
| `MAPEPIRE_SLOW_QUERY_MS` | Slow Query Threshold | Optional | `750`; metadata marker only, `0` disables |
| `SQL_ALLOWED_READ_SCHEMAS` | Allowed Read Schemas | Yes | One or more regular identifiers |
| `SQL_ALLOWED_WRITE_SCHEMA` | Allowed Write Schema | Optional | Exactly one; blank disables all writes/create |
| `SQL_ALLOWED_FUNCTIONS` | Allowed SQL Functions | Optional | Unqualified names only; blank permits none |
| `X_API_KEY` | Not applicable | Removed | No REST endpoint exists |

## Additional direct-node controls

These settings did not need to be public API environment variables, but are
available in the credential because they protect each direct execution:

- Maximum SELECT Rows: `1000`
- Fetch Page Size: `250`
- Maximum Batch Rows: `500`
- Retry SELECT Once After Transport Failure: `true`
- Date Format: ISO
- Decimal Separator: period

The per-node fields are operation, SQL, parameters, optional full-table UPDATE
override, SELECT output mode, and execution metadata.
