# Migration from `ibmi-n8n-sql-container`

1. Keep the Mapepire server and dedicated IBM i profile.
2. Install `@nicolaech/n8n-nodes-ibmi-db2-mapepire` in self-hosted n8n.
3. Create an **IBM i Mapepire** credential.
4. Copy the former `.env` values using `VARIABLE-MAPPING.md`.
5. Replace each HTTP Request node:
   - `/api/v1/sql/select` → Select
   - `/api/v1/sql/insert` → Insert
   - `/api/v1/sql/update` → Update
   - `/api/v1/sql/create-table` → Create Table
6. Copy request `sql` into **SQL** and request `parameters` into **Parameters**.
7. Remove the `X-API-Key` header; the direct node has no HTTP endpoint.
8. Choose SELECT output as one item per row or a single `{ "data": [...] }`
   item, matching downstream workflow expectations.
9. Test allowed and denied statements, TLS, paging, pool saturation, and failure
   behavior against a non-production schema.
10. Remove the REST container only after output and error-path comparison.

## Exact policy differences to check

- `SQL_ALLOWED_WRITE_SCHEMA` is singular and also controls CREATE TABLE.
- `SQL_ALLOWED_FUNCTIONS` contains only unqualified function names such as
  `COUNT` or `COALESCE`.
- Schema-qualified routines and table functions are rejected even when their
  schema is readable.
- The UPDATE safeguard checks for a top-level WHERE.
- Write operations have no automatic transport retry.

The direct node removes one service, network hop, API key, and JSON/HTTP
serialization layer while retaining the former SQL boundary inside n8n.
