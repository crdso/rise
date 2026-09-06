# Migration 021: regression repair and internal transfers

Apply `supabase/migrations/021_atomic_account_transfers.sql` in the Supabase SQL Editor before using this application version. Migration 020 remains unchanged. The automated database suite applies 001–020 to a fresh local PostgreSQL engine (PGlite), reproduces both failures, then applies 021. It does not modify production data.

## Confirmed cause and repair

Both idempotent wrappers in 020 use `SELECT composite_function(...) INTO row_variable`. The SELECT has one composite column, which PL/pgSQL assigns to the first field of the target row (`id uuid`), invoking an invalid composite-text-to-UUID conversion. Both failures and their rollbacks are reproduced in `tests/finance-db.test.mjs`.

021 uses direct composite assignment (`v_tx := ...` and `v_payment := ...`) through `CREATE OR REPLACE`. Existing fingerprints, saved responses and audit calls are preserved. The payment endpoint passes null when the caller omits `paid_at`, allowing the RPC to choose the date once; retries no longer fingerprint a freshly generated API timestamp.

Reference: [PostgreSQL PL/pgSQL assignments and SELECT INTO](https://www.postgresql.org/docs/17/plpgsql-statements.html).

## Transfer contract

`transfer` is validated by Structured Outputs and Zod, with amount, fromAccount, toAccount, occurredAt and notes. OpenAI only interprets text. Account resolution is read-only, case-insensitive and uses the existing brand aliases. Missing/ambiguous accounts and equal source/destination block confirmation. This flow requires existing active accounts; normal Quick Add automatic account creation remains available.

The preview shows the amount, direction and date. Only confirmation calls the domain service and `POST /api/transfers`, which invokes one RPC: `create_account_transfer_idempotent_with_audit`.

`account_transfers` is the aggregate; both transaction rows reference it via `transfer_id`. The RPC validates auth.uid(), ownership, active accounts, different accounts and a positive amount with at most two decimal places. It writes the aggregate, both legs, audit and idempotency response in a single PostgreSQL transaction. A unique index permits one expense leg and one income leg per transfer. Deferred constraint triggers require exactly two matching legs. Failure in any step rolls back everything, including the key.

Transfer idempotency uses `(user_id, operation, idempotency_key)` and a fingerprint built from a JSON array. Identical retries return the saved result; different payloads under one key are rejected; identical legitimate transfers with different keys are allowed.

Transfers and their legs are immutable at table level, including through legacy update/delete RPCs. This release offers no transfer editing/deletion/reversal flow. History labels transfer legs and hides individual edit/delete controls.

`finance_summary` includes transfer legs in account balances and excludes `transfer_id IS NOT NULL` from monthly income, expense and count. Client income/expense analytics do the same. History retains both legs. Dashboard, finance and account balances refresh the server aggregate after financial writes, independently of the paginated history.

Financial endpoints return allowlisted messages, with a generic fallback; PostgreSQL diagnostics are logged only on the server. Quick Add also uses a fixed safe message on confirmation failure.

Structured Outputs follows the existing strict object root with a nested union: [official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs).

## Validation

- `npm test`: database regression, normal income/expense, debt payments with associated transactions, retries, different keys, stored 020 responses, automatic account creation, transfer balances/metrics, ownership, RLS, immutability, forced second-leg rollback, parser/aliases and rendered Quick Add confirmation/error behavior.
- `node --import tsx --env-file=.env.local scripts/test-finance-openai.mjs`: opt-in live OpenAI test with eight synthetic phrases, without Supabase writes. Not part of offline `npm test`.
- `npx tsc --noEmit`, `npm run build`, focused ESLint and `git diff --check`.

Verified example: Inter 500 + Mercado Pago 100 → transfer 233 → Inter 267 + Mercado Pago 333; total 600, income 0, expense 0. No other audit findings are addressed.
