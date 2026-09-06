"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Trash2,
  Pencil,
  Search,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/rise/EmptyState";
import { useFinanceStore } from "@/lib/store/financeStore";
import { financeService } from "@/lib/services/finance";
import { formatBRL, formatDate } from "@/lib/utils";
import { TransactionDialog } from "@/components/rise/TransactionDialog";
import { FinanceNav } from "@/components/rise/FinanceNav";
import { BrandLogo } from "@/components/rise/BrandLogo";
import { CategoryBars } from "@/components/rise/charts/CategoryBars";
import { DeltaChip } from "@/components/rise/charts/DeltaChip";
import { Sparkline } from "@/components/rise/charts/Sparkline";
import { brandForAccount } from "@/lib/brands/registry";
import { useToast } from "@/components/ui/toast";
import {
  categoryBreakdown,
  currentMonthKey,
  dailySeries,
  monthStats,
  pctChange,
  previousMonthKey,
  transactionsInMonth,
} from "@/lib/finance/analytics";
import { formatDateKey, addMonthsToDateKey, saoPauloMonthKey } from "@/lib/timezone";

function monthLabel(monthKey: string) {
  return formatDateKey(`${monthKey}-01`, { month: "long", year: "numeric" });
}
function nextMonthKey(monthKey: string) {
  return addMonthsToDateKey(`${monthKey}-01`, 1).slice(0, 7);
}

export default function FinancasPage() {
  const { transactions, accounts, categories } = useFinanceStore();
  const { push } = useToast();

  const thisMonth = currentMonthKey();
  const [monthKey, setMonthKey] = useState(thisMonth);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "expense" | "income">("all");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [defaultType, setDefaultType] = useState<"expense" | "income">("expense");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [minMonth, setMinMonth] = useState(thisMonth);
  const [summary, setSummary] = useState<{ totalBalance: number; accountBalances: Record<string, number>; month: { income: number; expense: number; count: number } } | null>(null);

  useEffect(() => {
    fetch("/api/finance/meta").then((response) => response.ok ? response.json() : null).then((payload) => {
      if (payload?.data?.createdAt) setMinMonth(saoPauloMonthKey(payload.data.createdAt));
    }).catch(() => {});
  }, []);
  useEffect(() => {
    fetch(`/api/finance/summary?month=${monthKey}`).then((response) => response.ok ? response.json() : null).then((payload) => setSummary(payload?.data ?? null)).catch(() => setSummary(null));
  }, [monthKey]);

  const stats = useMemo(() => {
    const current = monthStats(transactions, monthKey);
    const previous = monthStats(transactions, previousMonthKey(monthKey));
    const { slices } = categoryBreakdown(transactions, categories, monthKey);
    const days = new Date(Date.UTC(Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7)), 0)).getUTCDate();
    return {
      current,
      pct: pctChange(current.expense, previous.expense),
      slices,
      series: dailySeries(transactions, `${monthKey}-01`, `${monthKey}-${String(days).padStart(2, "0")}`, "expense"),
    };
  }, [transactions, categories, monthKey]);

  const filtered = useMemo(() => {
    let list = transactionsInMonth(transactions, monthKey);
    if (type !== "all") list = list.filter((t) => t.type === type);
    if (accountId) list = list.filter((t) => t.account_id === accountId);
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description || "").toLowerCase().includes(needle) ||
          (categories.find((c) => c.id === t.category_id)?.name || "").toLowerCase().includes(needle)
      );
    }
    return list.sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at));
  }, [transactions, monthKey, type, accountId, q, categories]);

  const handleSave = async (data: Parameters<typeof financeService.createTransaction>[0]) => {
    const d = data as unknown as {
      category_name?: string | null;
      category_id?: string | null;
      type: "expense" | "income";
      amount: number;
    };
    try {
      if (editId) {
        await financeService.updateTransaction(editId, data as never);
        push({ title: "Transação atualizada" });
        setEditId(null);
      } else {
        if (d.category_name) {
          const cat = await financeService.ensureCategoryAsync(d.category_name);
          (data as unknown as { category_id: string | null }).category_id = cat.id;
        }
        await financeService.createTransaction(data as never);
        push({ title: d.type === "expense" ? "Gasto adicionado" : "Receita adicionada", desc: formatBRL(d.amount) });
      }
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "Falha", variant: "error" });
      throw e;
    }
  };

  const activeAccounts = accounts.filter((a) => a.is_active);
  const isFuture = monthKey >= thisMonth;
  const isBeforeHistory = monthKey <= minMonth;
  const current = summary?.month ? { ...stats.current, ...summary.month, net: summary.month.income - summary.month.expense } : stats.current;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Finanças</h1>
          <p className="text-[12.5px] text-[var(--muted-foreground)] mt-1">
            Saldo é consequência: o que importa é para onde o dinheiro foi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => {
              setDefaultType("expense");
              setEditId(null);
              setOpen(true);
            }}
          >
            <Wallet className="h-3.5 w-3.5" /> Gasto
          </Button>
          <Button
            size="sm"
            variant="soft"
            className="rounded-full"
            onClick={() => {
              setDefaultType("income");
              setEditId(null);
              setOpen(true);
            }}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Receita
          </Button>
        </div>
      </div>

      <FinanceNav />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold first-letter:uppercase">{monthLabel(monthKey)}</h2>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full disabled:opacity-30"
            disabled={isBeforeHistory}
            onClick={() => setMonthKey((k) => previousMonthKey(k))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={() => setMonthKey(thisMonth)}>
            Atual
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full disabled:opacity-30"
            disabled={isFuture}
            onClick={() => setMonthKey((k) => nextMonthKey(k))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-4 items-start">
        <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">Gasto no mês</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-3">
            <p className="text-[32px] sm:text-[38px] font-semibold tracking-[-0.03em] leading-none tnum">
               {formatBRL(current.expense)}
            </p>
             <DeltaChip pct={stats.pct} invert />
          </div>

          {current.count > 0 && (
            <div className="mt-4">
              <Sparkline points={stats.series} height={56} />
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--faint)]">Entrou</p>
               <p className="text-[14px] font-semibold tnum mt-1">{formatBRL(current.income)}</p>
            </div>
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--faint)]">Sobrou</p>
              <p
                className={`text-[14px] font-semibold tnum mt-1 ${
                   current.net < 0 ? "text-[var(--negative)]" : "text-[var(--positive)]"
                }`}
              >
                 {formatBRL(current.net)}
              </p>
            </div>
            <div>
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-[var(--faint)]">Lançamentos</p>
               <p className="text-[14px] font-semibold tnum mt-1">{current.count}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-5">
          <h3 className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">Categorias</h3>
          {stats.slices.length ? (
            <div className="mt-4">
              <CategoryBars slices={stats.slices} max={5} />
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-[var(--muted-foreground)]">Sem gastos neste mês.</p>
          )}
        </section>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--card)] p-0.5 shrink-0">
          {(["all", "expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium ${
                type === t ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--muted-foreground)]"
              }`}
            >
              {t === "all" ? "Tudo" : t === "expense" ? "Gastos" : "Receitas"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar descrição ou categoria"
            aria-label="Buscar transações"
            className="w-full h-10 rounded-full border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {activeAccounts.length > 1 && (
        <div className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 min-w-max">
            <button
              onClick={() => setAccountId(null)}
              aria-pressed={accountId === null}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${
                accountId === null
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
              }`}
            >
              Todas as contas
            </button>
            {activeAccounts.map((a) => {
              const brand = brandForAccount(a);
              return (
                <button
                  key={a.id}
                  onClick={() => setAccountId(accountId === a.id ? null : a.id)}
                  aria-pressed={accountId === a.id}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-medium whitespace-nowrap ${
                    accountId === a.id
                      ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                      : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
                  }`}
                >
                  <BrandLogo
                    domain={brand.domain}
                    name={brand.domain ? brand.name : a.name}
                    color={brand.color || a.color}
                    size={18}
                    generic={!brand.domain && (a.type === "cash" || a.type === "wallet")}
                  />
                  {a.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-6">
          <EmptyState
            title={stats.current.count === 0 ? "Nada neste mês" : "Nenhuma transação com esses filtros"}
            desc={
              stats.current.count === 0
                ? "Adicione um gasto ou receita — ou use o Adicionar rápido."
                : "Ajuste a busca, o tipo ou a conta."
            }
            action={
              stats.current.count === 0 ? (
                <Button
                  size="sm"
                  onClick={() => {
                    setDefaultType("expense");
                    setOpen(true);
                  }}
                >
                  <Wallet className="h-4 w-4" /> Adicionar gasto
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] overflow-hidden divide-y divide-[var(--border)]">
          {filtered.slice(0, 100).map((t) => {
            const cat = categories.find((c) => c.id === t.category_id);
            const acc = accounts.find((a) => a.id === t.account_id);
            const brand = acc ? brandForAccount(acc) : null;
            const expense = t.type === "expense";
            return (
              <div key={t.id} className="p-3.5 flex items-center gap-3 hover:bg-[var(--card-soft)] transition-colors">
                <span
                  className={`h-9 w-9 shrink-0 rounded-xl grid place-items-center border ${
                    expense
                      ? "border-[var(--negative)]/25 bg-[var(--negative)]/10 text-[var(--negative)]"
                      : "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  }`}
                >
                  {expense ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium truncate">{t.description || cat?.name || "Sem descrição"}</p>
                  <div className="text-[11.5px] text-[var(--muted-foreground)] truncate flex items-center gap-1.5">
                    {cat?.name && <span>{cat.name}</span>}
                    <span className="text-[var(--faint)]">·</span>
                    <span>{formatDate(t.occurred_at, { withTime: true })}</span>
                    {acc && brand && (
                      <>
                        <span className="text-[var(--faint)]">·</span>
                        <BrandLogo
                          domain={brand.domain}
                          name={brand.domain ? brand.name : acc.name}
                          color={brand.color || acc.color}
                          size={14}
                          generic={!brand.domain && (acc.type === "cash" || acc.type === "wallet")}
                        />
                        <span className="truncate">{acc.name}</span>
                      </>
                    )}
                  </div>
                </div>

                <p className={`text-[14px] font-semibold shrink-0 tnum ${expense ? "" : "text-[var(--positive)]"}`}>
                  {expense ? "−" : "+"} {formatBRL(t.amount)}
                </p>

                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditId(t.id);
                      setDefaultType(t.type);
                      setOpen(true);
                    }}
                    className="h-8 w-8 rounded-full bg-[var(--card-soft)] border border-[var(--border)] grid place-items-center hover:border-[var(--border-strong)]"
                    aria-label="Editar transação"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setConfirmId(t.id)}
                    className="h-8 w-8 rounded-full bg-[var(--card-soft)] border border-[var(--border)] grid place-items-center text-[var(--negative)] hover:border-[var(--negative)]/40"
                    aria-label="Excluir transação"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11.5px] text-[var(--faint)]">
        <Link href="/financas/contas" className="hover:text-[var(--foreground)]">
          Saldos por conta
        </Link>{" "}
        são calculados pelo saldo inicial mais os lançamentos.
      </p>

      <TransactionDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditId(null);
        }}
        onSave={handleSave}
        initial={editId ? transactions.find((t) => t.id === editId) || null : null}
        defaultType={defaultType}
      />

      {confirmId && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmId(null)} />
          <div className="relative w-full max-w-[360px] rounded-2xl bg-[var(--elevated)] border border-[var(--border)] p-5 shadow-xl">
            <h3 className="font-semibold text-sm">Excluir transação?</h3>
            <p className="text-[13px] text-[var(--muted-foreground)] mt-1.5">
              Não dá para desfazer. A exclusão fica registrada na auditoria.
            </p>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setConfirmId(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className="rounded-full bg-[var(--negative)] hover:brightness-110 text-[var(--negative-foreground)]"
                onClick={async () => {
                  try {
                    await financeService.deleteTransaction(confirmId);
                    push({ title: "Transação excluída" });
                  } catch (e: unknown) {
                    push({ title: "Erro ao excluir", desc: e instanceof Error ? e.message : "", variant: "error" });
                  }
                  setConfirmId(null);
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
