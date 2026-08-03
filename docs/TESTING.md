# Testing and verification

## Automated checks

```bash
npm install
npm run verify
npm run lint
npm run build
npm pack --dry-run
```

`npm run verify` covers:

- credential/environment mapping and JDBC options
- inline CA versus `MAPEPIRE_CA_PATH`
- schema and function allowlist normalization
- operation/verb matching
- comments, semicolons, quoted identifiers, multi-statements
- qualified reads, explicit joins, read and write schema enforcement
- schema-qualified routine/table-function rejection
- dangerous unqualified function rejection
- INSERT VALUES only
- top-level UPDATE WHERE protection
- restricted CREATE TABLE and identity columns
- placeholder and batch parameter validation
- Mapepire Pool constructor options
- SELECT paging, truncation, and cursor close
- one SELECT transport retry with pool replacement
- no SQL-error retry
- no write retry
- pooling-disabled lifecycle
- semaphore queue and timeout
- TypeScript static compilation and package metadata

The supplied release was verified with 30 passing automated tests. The offline
harness uses a behaviorally scripted Mapepire test double; it does not claim a
live IBM i connection.

## Live integration matrix

Use a dedicated profile and disposable schema such as `N8NTEST`.

1. Trusted public/private CA succeeds.
2. Invalid TLS certificate fails when ignore-unauthorized is false.
3. CA path works from inside the n8n container.
4. `MAPEPIRE_DATABASE=*LOCAL` and a named RDB are tested where applicable.
5. SELECT returns zero, one, many, paged, and truncated rows.
6. All allowlisted functions work; an omitted function fails before connection.
7. Every schema-qualified routine and table function fails before connection.
8. Single and batch INSERT succeed.
9. UPDATE with top-level WHERE succeeds.
10. UPDATE with only a subquery WHERE remains blocked.
11. Full-table UPDATE override is tested only on a disposable table.
12. Restricted CREATE TABLE supports types, primary key, and identity.
13. CTAS, LIKE, foreign references, generated expression, and trailing options
    fail before connection.
14. Pool saturation reaches the configured wait timeout.
15. Pool-disabled mode creates and closes connections as expected.
16. SELECT transport interruption causes at most one retry.
17. Write transport interruption returns an error and causes no retry; inspect
    the target row because commit status may be ambiguous.
18. Continue On Fail works across multiple n8n input items.
19. Multiple n8n workers remain within the planned IBM i SQL job capacity.
20. Query trace is used only in a controlled non-production test.

## Disposable SQL

With `N8NTEST` as both read and write schema:

```sql
CREATE TABLE N8NTEST.NODE_TEST (
  ID BIGINT GENERATED ALWAYS AS IDENTITY,
  TEXT_VALUE VARCHAR(256),
  CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ID)
)
```

Never use production data for failure injection or full-table UPDATE testing.
