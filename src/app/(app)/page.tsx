"use client";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingDown, Wallet, GraduationCap } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { headerDate, demoFinance, demoAccounts, demoAgendaToday, demoDebts, demoSchool } from "@/lib/fixtures";
import { SectionHeader, Surface } from "@/components/rise/Section";
import { AccountTile } from "@/components/rise/AccountTile";
import { AgendaItem, AgendaList } from "@/components/rise/Agenda";
import { useMemo } from "react";

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const w = 120, h = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" points={points} opacity={0.9} />
      <polyline fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" points={points} opacity={0.08} />
    </svg>
  );
}

export default function Dashboard() {
  const todayLabel = useMemo(() => headerDate(new Date()), []);
  return (
    <div className="space-y-7">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-tight leading-none">Boa tarde, Ezequias.</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1.5 capitalize">{todayLabel} · tudo sob controle.</p>
      </motion.div>

      {/* Editorial grid */}
      <div className="grid lg:grid-cols-[1.35fr_0.9fr] gap-5">
        {/* Finance hero */}
        <Surface className="p-6 sm:p-7 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none opacity-[0.55]" style={{ background: "radial-gradient(600px 220px at 30% 0%, var(--accent-soft), transparent 70%)" }} />
          <div className="relative">
            <SectionHeader title="Financeiro" subtitle="Resumo do mês" action={<a href="/financas" className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] inline-flex items-center gap-1">Ver finanças <ArrowUpRight className="h-3.5 w-3.5" /></a>} />
            <div className="mt-5">
              <p className="text-[11px] tracking-[0.14em] uppercase font-medium text-[var(--faint)]">Saldo total</p>
              <p className="text-[32px] sm:text-[36px] font-bold tracking-tight leading-none mt-1">{formatBRL(demoFinance.balance)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300"><TrendingDown className="h-3 w-3" /> {demoFinance.deltaVsPrev}% vs mês anterior</span>
                <span className="text-[var(--muted-foreground)]">Maior gasto em {demoFinance.biggestDay.date} · {formatBRL(demoFinance.biggestDay.amount)}</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-[var(--card-soft)] border border-[var(--border)] p-3">
                <p className="text-[11px] text-[var(--faint)] uppercase tracking-wide font-medium">Gastos</p>
                <p className="text-sm font-bold mt-1">{formatBRL(demoFinance.expenseMonth)}</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">{demoFinance.topCategory}</p>
              </div>
              <div className="rounded-xl bg-[var(--card-soft)] border border-[var(--border)] p-3">
                <p className="text-[11px] text-[var(--faint)] uppercase tracking-wide font-medium">Receitas</p>
                <p className="text-sm font-bold mt-1">{formatBRL(demoFinance.incomeMonth)}</p>
                <p className="text-[11px] text-emerald-600">+ {formatBRL(demoFinance.incomeMonth - demoFinance.expenseMonth)}</p>
              </div>
              <div className="rounded-xl bg-[var(--card-soft)] border border-[var(--border)] p-3 flex flex-col justify-between">
                <p className="text-[11px] text-[var(--faint)] uppercase tracking-wide font-medium">Tendência</p>
                <Sparkline data={demoFinance.sparkline} />
              </div>
            </div>
          </div>
        </Surface>

        {/* Hoje */}
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="px-5 sm:px-6 pt-5 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">Hoje</h2>
            <span className="text-xs rounded-full bg-[var(--card-soft)] border border-[var(--border)] px-2.5 py-1 text-[var(--muted-foreground)]">{demoAgendaToday.length} itens</span>
          </div>
          <div className="px-2 sm:px-3 pb-3">
            <AgendaList>
              {demoAgendaToday.map((a) => <AgendaItem key={a.id} time={a.time} title={a.title} meta={a.meta} kind={a.kind} />)}
            </AgendaList>
          </div>
          <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between">
            <p className="text-xs text-[var(--muted-foreground)]">Próximos 7 dias limpos</p>
            <a href="/calendario" className="text-xs font-medium text-[var(--accent)] hover:underline">Abrir calendário</a>
          </div>
        </div>
      </div>

      {/* Contas - editorial, sem grid de cards iguais */}
      <div className="space-y-3">
        <SectionHeader title="Contas" subtitle="Saldos calculados pelas transações" action={<a href="/financas" className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Gerenciar</a>} />
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-thin sm:grid sm:grid-cols-4 sm:overflow-visible">
          {demoAccounts.map((a) => <AccountTile key={a.id} {...a} />)}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5">
        {/* Escola */}
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <SectionHeader title="Escola" subtitle="3º ano · 2 pendentes" action={<a href="/escola" className="text-xs font-medium text-[var(--accent)]">Ver tudo</a>} />
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {demoSchool.map((t) => (
              <div key={t.title} className="min-w-[200px] rounded-2xl bg-[var(--card-soft)] border border-[var(--border)] p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight">{t.title}</p>
                  <GraduationCap className="h-4 w-4 text-[var(--faint)]" />
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">Entrega {t.due} · prioridade {t.priority}</p>
                <div className="mt-3 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{ width: `${t.progress}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Dívidas + eventos */}
        <div className="space-y-5">
          <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] p-5">
            <SectionHeader title="Dívidas" action={<a href="/financas" className="text-xs font-medium text-[var(--muted-foreground)]">Ver</a>} />
            <div className="mt-3 divide-y divide-[var(--border)]">
              {demoDebts.map((d) => (
                <div key={d.person} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{d.person} <span className="text-xs text-[var(--muted-foreground)]">{d.kind === "owed" ? "· você deve" : "· te devem"}</span></p>
                    <p className="text-xs text-[var(--muted-foreground)]">{d.kind === "owed" ? `vence ${d.due}` : d.note}</p>
                  </div>
                  <p className={`text-sm font-bold ${d.kind === "receivable" ? "text-emerald-600" : ""}`}>{formatBRL(d.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[20px] bg-[var(--card-soft)] border border-[var(--border)] p-5">
            <SectionHeader title="Próximos eventos" />
            <p className="text-sm text-[var(--muted-foreground)] mt-3">Nenhum evento nos próximos 7 dias.</p>
            <a href="/calendario" className="inline-flex mt-3 text-xs font-medium text-[var(--accent)] hover:underline"><Wallet className="h-3.5 w-3.5 mr-1" /> Adicionar evento</a>
          </div>
        </div>
      </div>
    </div>
  );
}
