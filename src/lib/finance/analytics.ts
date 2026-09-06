/**
 * Cálculos financeiros derivados — fonte única para Dashboard, Finanças e Resumos.
 *
 * Regras:
 *  - Todo agrupamento por dia/mês usa o CALENDÁRIO CIVIL DE SÃO PAULO
 *    (lib/timezone), nunca o fuso do dispositivo.
 *  - Nada aqui inventa número: sem transações, os resultados são zero/vazio.
 */
import type { Account, Category, Transaction } from "@/types/finance";
import { saoPauloDateKey, saoPauloMonthKey, addDaysToDateKey, saoPauloTodayKey } from "@/lib/timezone";

export type CategorySlice = { id: string | null; name: string; amount: number; pct: number };
export type DayPoint = { key: string; amount: number };
export type MonthStats = { monthKey: string; expense: number; income: number; net: number; count: number };

/** "YYYY-MM" do mês civil corrente em SP. */
export function currentMonthKey(): string {
  return saoPauloTodayKey().slice(0, 7);
}

/** "YYYY-MM" do mês anterior. */
export function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
  return `${d.y}-${String(d.m).padStart(2, "0")}`;
}

export function transactionsInMonth(txs: Transaction[], monthKey: string, includeTransfers = false): Transaction[] {
  return txs.filter((t) => (includeTransfers || !t.transfer_id) && saoPauloMonthKey(t.occurred_at) === monthKey);
}

export function monthStats(txs: Transaction[], monthKey: string): MonthStats {
  const list = transactionsInMonth(txs, monthKey);
  let expense = 0;
  let income = 0;
  for (const t of list) {
    if (t.type === "expense") expense += t.amount;
    else income += t.amount;
  }
  return { monthKey, expense, income, net: income - expense, count: list.length };
}

/**
 * Variação percentual entre dois valores.
 * Devolve null quando não há base de comparação — o produto mostra "—",
 * nunca um "+100%" inventado a partir de zero.
 */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/** Quebra de gastos por categoria, do maior para o menor. */
export function categoryBreakdown(
  txs: Transaction[],
  categories: Category[],
  monthKey: string
): { total: number; slices: CategorySlice[] } {
  const list = transactionsInMonth(txs, monthKey).filter((t) => t.type === "expense");
  const total = list.reduce((s, t) => s + t.amount, 0);
  const byId = new Map<string | null, CategorySlice>();
  for (const t of list) {
    const id = t.category_id ?? null;
    const name = categories.find((c) => c.id === id)?.name || t.category?.name || "Sem categoria";
    const cur = byId.get(id) || { id, name, amount: 0, pct: 0 };
    cur.amount += t.amount;
    byId.set(id, cur);
  }
  const slices = [...byId.values()].sort((a, b) => b.amount - a.amount);
  for (const s of slices) s.pct = total ? (s.amount / total) * 100 : 0;
  return { total, slices };
}

/** Série diária contínua (inclui dias sem lançamento como zero). */
export function dailySeries(
  txs: Transaction[],
  fromKey: string,
  toKey: string,
  type: "expense" | "income" = "expense"
): DayPoint[] {
  const totals = new Map<string, number>();
  for (const t of txs) {
    if (t.transfer_id || t.type !== type) continue;
    const k = saoPauloDateKey(t.occurred_at);
    if (k < fromKey || k > toKey) continue;
    totals.set(k, (totals.get(k) || 0) + t.amount);
  }
  const out: DayPoint[] = [];
  let cursor = fromKey;
  let guard = 0;
  while (cursor <= toKey && guard < 400) {
    out.push({ key: cursor, amount: totals.get(cursor) || 0 });
    cursor = addDaysToDateKey(cursor, 1);
    guard++;
  }
  return out;
}

/** Últimos N dias terminando hoje (SP). */
export function lastNDays(txs: Transaction[], n: number, type: "expense" | "income" = "expense"): DayPoint[] {
  const today = saoPauloTodayKey();
  return dailySeries(txs, addDaysToDateKey(today, -(n - 1)), today, type);
}

/** Maior gasto individual do mês. */
export function biggestExpense(txs: Transaction[], monthKey: string): Transaction | null {
  const list = transactionsInMonth(txs, monthKey).filter((t) => t.type === "expense");
  if (!list.length) return null;
  return list.reduce((a, b) => (b.amount > a.amount ? b : a));
}

/** Dia civil com maior gasto acumulado. */
export function biggestDay(txs: Transaction[], monthKey: string): DayPoint | null {
  const list = transactionsInMonth(txs, monthKey).filter((t) => t.type === "expense");
  if (!list.length) return null;
  const byDay = new Map<string, number>();
  for (const t of list) {
    const k = saoPauloDateKey(t.occurred_at);
    byDay.set(k, (byDay.get(k) || 0) + t.amount);
  }
  let best: DayPoint | null = null;
  for (const [key, amount] of byDay) if (!best || amount > best.amount) best = { key, amount };
  return best;
}

/** Média diária de gasto, considerando só os dias já decorridos do mês. */
export function dailyAverage(txs: Transaction[], monthKey: string): number {
  const { expense } = monthStats(txs, monthKey);
  if (!expense) return 0;
  const today = saoPauloTodayKey();
  const isCurrent = today.slice(0, 7) === monthKey;
  const [y, m] = monthKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const elapsed = isCurrent ? Number(today.slice(8, 10)) : daysInMonth;
  return expense / Math.max(1, elapsed);
}

/** Conta mais usada no mês (por número de lançamentos). */
export function mostUsedAccount(
  txs: Transaction[],
  accounts: Account[],
  monthKey: string
): { account: Account; count: number } | null {
  const list = transactionsInMonth(txs, monthKey);
  const counts = new Map<string, number>();
  for (const t of list) if (t.account_id) counts.set(t.account_id, (counts.get(t.account_id) || 0) + 1);
  let bestId: string | null = null;
  let bestCount = 0;
  for (const [id, c] of counts) if (c > bestCount) { bestId = id; bestCount = c; }
  if (!bestId) return null;
  const account = accounts.find((a) => a.id === bestId);
  return account ? { account, count: bestCount } : null;
}

/** Saldo de uma conta = saldo inicial + entradas − saídas. */
export function accountBalance(account: Account, txs: Transaction[]): number {
  let bal = account.initial_balance;
  for (const t of txs) {
    if (t.account_id !== account.id) continue;
    bal += t.type === "income" ? t.amount : -t.amount;
  }
  return bal;
}

export function totalBalance(accounts: Account[], txs: Transaction[]): number {
  return accounts.filter((a) => a.is_active).reduce((s, a) => s + accountBalance(a, txs), 0);
}
