# Testing and verification

## Definitive connected verification

```bash
npm run release:build
```

Use `RESET_LOCKFILE=1` only when intentionally regenerating the dependency lock.
The command otherwise preserves and uses `package-lock.json` through `npm ci`.

## Automated coverage

The suite contains 31 tests covering:

- credential/environment mapping and JDBC options
- inline CA versus CA-path conflict
- schema/function allowlist normalization
- operation/verb matching
- comments, semicolons, quoted identifiers, and multi-statements
- qualified reads and read/write schema enforcement
- schema-qualified routine and table-function rejection
- dangerous function rejection
- INSERT VALUES only
- top-level UPDATE WHERE enforcement
- restricted CREATE TABLE and identity columns
- placeholder and batch parameter validation
- Mapepire pool constructor options
- SELECT paging, truncation, and cursor closure
- one SELECT transport retry with pool replacement
- no retry for SQL errors or writes
- pooling-disabled lifecycle
- failed pool initialization eviction and recovery
- semaphore queue and timeout behavior

## Live IBM i matrix

Use a dedicated profile and disposable schema such as `N8NTEST`.

1. Credential test succeeds with trusted TLS.
2. Invalid TLS fails when ignore-unauthorized is false.
3. Inline CA and mounted CA path are tested separately.
4. `*LOCAL` and a named RDB are tested where applicable.
5. SELECT returns zero, one, many, paged, and truncated rows.
6. Allowed functions work; omitted functions fail before connection.
7. Schema-qualified routines and table functions fail before connection.
8. Single and batch INSERT succeed.
9. UPDATE with a top-level WHERE succeeds.
10. UPDATE with only a subquery WHERE remains blocked.
11. Full-table UPDATE override is used only on a disposable table.
12. Restricted CREATE TABLE supports types, identity, primary and unique keys.
13. CTAS, LIKE, foreign references, generated expressions, and trailing options
    fail before connection.
14. Pool saturation reaches the configured timeout.
15. Pool-disabled mode creates and closes connections.
16. SELECT transport interruption causes no more than one retry.
17. Write transport interruption causes no retry; target data is reconciled.
18. Continue On Fail works over multiple input items.
19. Multiple workers remain within planned IBM i SQL-job capacity.
20. Query trace is enabled only in controlled non-production testing.

Disposable table:

```sql
CREATE TABLE N8NTEST.NODE_TEST (
  ID BIGINT GENERATED ALWAYS AS IDENTITY,
  TEXT_VALUE VARCHAR(256),
  CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ID)
)
```
