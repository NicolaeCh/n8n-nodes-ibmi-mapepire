# Security rules

## Common validation

1. Exactly one statement; semicolons are rejected.
2. SQL comments, quoted identifiers, unsupported control characters, and
   unbalanced parentheses are rejected.
3. The selected node operation must match the statement's first verb.
4. Read and target objects must use regular, unquoted `SCHEMA.OBJECT` names.
5. Comma joins are rejected; explicit `JOIN` is required.
6. Read schemas must be listed in `SQL_ALLOWED_READ_SCHEMAS`.
7. INSERT, UPDATE, and CREATE TABLE must target exactly
   `SQL_ALLOWED_WRITE_SCHEMA`; blank disables them.
8. Protected system schemas (`QSYS`, `QSYS2`, `SYSIBM`, `SYSCAT`, `SYSSTAT`,
   `SYSTOOLS`, and `QSYS2000`) are never writable.
9. Schema-qualified routines and SQL table functions are always rejected.
10. Parenthesized unqualified functions must be listed in
    `SQL_ALLOWED_FUNCTIONS`. Side-effecting names remain blocked even if listed.
11. `?` markers and supplied parameters must match exactly.
12. Parameters are strings or finite numbers. Batch arrays are accepted only by
    INSERT and UPDATE and are capped by Maximum Batch Rows.
13. INSERT, UPDATE, and CREATE TABLE are never retried.

## SELECT

Only statements beginning with `SELECT` are accepted. CTE-first syntax,
`SELECT INTO`, data-change table references, DML/DDL/DCL, dynamic SQL,
transaction control, and command/service functions are blocked.

Example requiring `COUNT` in `SQL_ALLOWED_FUNCTIONS`:

```sql
SELECT COUNT(*) FROM APPDATA.EVENTS
```

Reading a QSYS2 catalog view is possible only when QSYS2 is in the read list:

```sql
SELECT TABLE_NAME FROM QSYS2.SYSTABLES WHERE TABLE_SCHEMA = ?
```

Calling `QSYS2.ACTIVE_JOB_INFO()` is not possible because it is a
schema-qualified table function.

## INSERT

Only `INSERT INTO SCHEMA.TABLE ... VALUES ...` is accepted. `INSERT SELECT`,
CTE-based INSERT, sequence `NEXT VALUE`, and non-allowlisted functions are
blocked. Scalar and two-dimensional batch parameter arrays are supported.

## UPDATE

The target must be the single write schema. A **top-level** `WHERE` is mandatory
unless `Allow UPDATE Without WHERE` is explicitly enabled on that node. A WHERE
inside a subquery does not satisfy the safeguard. Every subquery read is checked
against the read schema list.

## CREATE TABLE

Only `CREATE TABLE SCHEMA.TABLE (explicit definitions)` ending at the closing
parenthesis is accepted. Base columns, common type lengths/precision, primary or
unique constraints, and `GENERATED ALWAYS|BY DEFAULT AS IDENTITY` are supported.

Rejected forms include CTAS, `LIKE`, materialized query tables, foreign keys and
references, check/generated expressions, procedures, functions, triggers,
views, indexes, schema-qualified definition references, and trailing physical
or partitioning options.

## IBM i authority

Use a dedicated profile and grant only the authorities required for the chosen
operations, such as *USE, *OBJOPR, *READ, *ADD, *UPD, and where table creation is
enabled, the minimum schema/object-management authority. Do not grant *ALLOBJ,
*SECADM, *JOBCTL, *SPLCTL, or broad command authority merely for this node.
