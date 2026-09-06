import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { AIParserService } from "../src/lib/ai/parser";
import { parsedIntentSchema } from "../src/lib/ai/types";
import { resolveTransferAccount } from "../src/lib/ai/transfer-accounts";
import { financialError } from "../src/lib/finance/errors";
import { transferSchema } from "../src/lib/validators/finance";
import { accountBalance, totalBalance, monthStats, categoryBreakdown, dailySeries, biggestExpense, biggestDay, transactionsInMonth } from "../src/lib/finance/analytics";
import type { Account, Transaction } from "../src/types/finance";

const context = { now: "2026-09-06T12:00:00-03:00", timezone: "America/Sao_Paulo" as const };
const accounts: Account[] = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Inter", type: "checking", initial_balance: 500, is_active: true, sort_order: 0, created_at: context.now, updated_at: context.now },
  { id: "10000000-0000-4000-8000-000000000002", name: "Mercado Pago", type: "wallet", initial_balance: 100, is_active: true, sort_order: 1, created_at: context.now, updated_at: context.now },
];

test('A/B: Quick Add parser retains expense and income', async () => {
  const parser = new AIParserService();
  for (const [text, type, amount] of [["gastei 50 reais no Inter", "expense", 50], ["recebi 100 reais no Inter", "income", 100]] as const) {
    const result = await parser.parse(text, context);
    assert.equal(result.intent, "transaction");
    if (result.intent !== "transaction") assert.fail();
    assert.equal(result.data.type, type); assert.equal(result.data.amount, amount);
  }
});

test('C: all five natural transfer phrasings preserve direction, amount and date through Zod', async () => {
  const parser = new AIParserService();
  const cases = [
    ["mandei 233 reais do inter pro mercado pago", 233, "inter", "mercado pago"],
    ["mandei 233 do inter pro mercado pago", 233, "inter", "mercado pago"],
    ["transferi 100 do nubank pro inter", 100, "nubank", "inter"],
    ["passei 50 reais do BB pra carteira", 50, "BB", "carteira"],
    ["joguei 200 do mercado pago no nubank", 200, "mercado pago", "nubank"],
    ["movi 300 da conta X para conta Y", 300, "conta X", "conta Y"],
  ] as const;
  for (const [input, amount, fromAccount, toAccount] of cases) {
    const parsed = await parser.parse(input, context);
    assert.equal(parsed.intent, "transfer");
    assert.deepEqual(parsed.data, { amount, fromAccount, toAccount, occurredAt: context.now, notes: null });
  }
  assert.equal(parsedIntentSchema.safeParse({ intent: "transfer", confidence: 1, missingFields: [], clarification: null,
    data: { amount: -1, fromAccount: "Inter", toAccount: "Mercado Pago", occurredAt: context.now, notes: null } }).success, false);
});

test('transfer account resolution: case, aliases, ambiguity and missing accounts', () => {
  assert.deepEqual(resolveTransferAccount("iNtEr", accounts), { status: "existing", id: accounts[0].id, name: "Inter" });
  assert.equal(resolveTransferAccount("BB", [{ id: "bb", name: "Banco do Brasil" }]).status, "existing");
  assert.equal(resolveTransferAccount("Inter", [...accounts, { id: "duplicate", name: "Banco Inter" }]).status, "ambiguous");
  assert.equal(resolveTransferAccount("Conta inexistente", accounts).status, "missing");
  assert.equal(resolveTransferAccount(null, accounts).status, "missing");
  const base = { from_account_id: accounts[0].id, to_account_id: accounts[1].id, amount: 233, occurred_at: context.now, notes: null };
  assert.equal(transferSchema.safeParse(base).success, true);
  assert.equal(transferSchema.safeParse({ ...base, to_account_id: base.from_account_id }).success, false);
  for (const amount of [0, -1, 0.001, Infinity]) assert.equal(transferSchema.safeParse({ ...base, amount }).success, false);
  assert.equal(transferSchema.safeParse({ ...base, user_id: "other" }).success, false);
});

test('D: client balances include legs; all income/expense analytics exclude transfers; history retains them', () => {
  const legs: Transaction[] = accounts.map((account, index) => ({ id: `leg-${index}`, account_id: account.id,
    category_id: null, type: index ? "income" : "expense", amount: 233, transfer_id: "transfer", is_recurring: false,
    occurred_at: context.now, created_at: context.now, updated_at: context.now }));
  assert.equal(accountBalance(accounts[0], legs), 267);
  assert.equal(accountBalance(accounts[1], legs), 333);
  assert.equal(totalBalance(accounts, legs), 600);
  assert.deepEqual(monthStats(legs, "2026-09"), { monthKey: "2026-09", income: 0, expense: 0, net: 0, count: 0 });
  assert.deepEqual(categoryBreakdown(legs, [], "2026-09"), { total: 0, slices: [] });
  for (const type of ["income", "expense"] as const) assert.deepEqual(dailySeries(legs, "2026-09-06", "2026-09-06", type), [{ key: "2026-09-06", amount: 0 }]);
  assert.equal(biggestExpense(legs, "2026-09"), null); assert.equal(biggestDay(legs, "2026-09"), null);
  assert.equal(transactionsInMonth(legs, "2026-09", true).length, 2);
  const normal: Transaction[] = [{ ...legs[0], id: "normal", transfer_id: null, amount: 50 }, { ...legs[1], id: "income", transfer_id: null, amount: 100 }];
  assert.deepEqual(monthStats([...legs, ...normal], "2026-09"), { monthKey: "2026-09", income: 100, expense: 50, net: 50, count: 2 });
});

test('J: PostgreSQL diagnostics are retained in server logs and NEVER returned to the UI', () => {
  const original = console.error;
  const logs: unknown[][] = [];
  console.error = (...args) => { logs.push(args); };
  try {
    const raw = { code: "22P02", message: 'invalid input syntax for type uuid: "(9fa26385-0000-4000-8000-000000000001,expense,233.00)"', details: "SQL internal details" };
    const safe = financialError(raw);
    assert.equal(safe.status, 500);
    assert.equal(safe.error, "Não foi possível registrar a operação. Tente novamente.");
    assert.doesNotMatch(JSON.stringify(safe), /uuid|9fa26385|SQL|22P02|invalid input/i);
    assert.equal((logs[0][1] as typeof raw).message, raw.message);
    assert.equal(financialError({ message: "idempotency key reuse" }).status, 409);
    for (const root of ["transactions", "transfers", "debts", "accounts", "finance", "categories"]) {
      for (const name of readdirSync(`src/app/api/${root}`, { recursive: true }) as string[]) {
        if (!name.endsWith("route.ts")) continue;
        const source = readFileSync(`src/app/api/${root}/${name}`, "utf8");
        assert.doesNotMatch(source, /NextResponse\.json\(\{ error: error\.message/);
      }
    }
  } finally { console.error = original; }
});
