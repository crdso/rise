"use client";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, CalendarDays, Bell, GraduationCap, HandCoins, Plus, ArrowUpRight, CreditCard, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/rise/EmptyState";
import { greeting, formatBRL } from "@/lib/utils";
import { useState } from "react";

function Stat({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs tracking-wide uppercase text-[var(--faint)] font-medium">{label}</p>
            <p className={`mt-2 text-[22px] font-bold tracking-tight ${accent ? "text-[var(--accent)]" : ""}`}>{value}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{sub}</p>
          </div>
          <div className={`h-9 w-9 rounded-xl grid place-items-center border ${accent ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--border)]" : "bg-[var(--card-soft)] text-[var(--muted-foreground)] border-[var(--border)]"}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [loading] = useState(false);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight">{greeting()}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Quinta, 3 de setembro · Tudo sob controle.</p>
      </motion.div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Adicionar gasto", icon: Wallet },
          { label: "Adicionar lembrete", icon: Bell },
          { label: "Novo evento", icon: CalendarDays },
          { label: "Nova atividade", icon: GraduationCap },
        ].map((a) => (
          <Button key={a.label} variant="muted" size="sm" className="rounded-full">
            <a.icon className="h-4 w-4" /> {a.label}
          </Button>
        ))}
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Gasto no mês" value={formatBRL(2483.72)} sub="12% menos que julho" icon={Wallet} accent />
        <Stat label="Receita" value={formatBRL(3200)} sub="Saldo + R$ 716,28" icon={TrendingUp} />
        <Stat label="Saldo atual" value={formatBRL(4218.9)} sub="4 contas ativas" icon={PiggyBank} />
        <Stat label="Maior gasto" value="18 ago · R$ 412" sub="Alimentação" icon={CreditCard} />
      </div>

      <div className="grid lg:grid-cols-[1.7fr_1fr] gap-4">
        {/* Hoje */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Hoje</CardTitle>
            <Badge>3 itens</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { t: "Prova de Química", d: "08:00 · Ácidos e bases", icon: GraduationCap, tone: "emerald" },
              { t: "Reunião — projeto ENTEC", d: "14:30 · Sala 3", icon: CalendarDays, tone: "blue" },
              { t: "Lembrete: pagar João R$ 70", d: "Vence hoje", icon: Bell, tone: "amber" },
            ].map((r) => (
              <div key={r.t} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] p-3 hover:border-[var(--border-strong)] transition-colors">
                <div className="h-9 w-9 rounded-xl bg-[var(--card)] border border-[var(--border)] grid place-items-center text-[var(--accent)]">
                  <r.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.t}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{r.d}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[var(--faint)]" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contas */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Contas</CardTitle>
            <a href="/financas" className="text-xs font-medium text-[var(--accent)] hover:underline">Ver todas</a>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { name: "Inter", bal: 1842.5, color: "#FF7A00" },
              { name: "Nubank", bal: 1320.0, color: "#820AD1" },
              { name: "Mercado Pago", bal: 420.3, color: "#009EE3" },
              { name: "Dinheiro", bal: 636.1, color: "#22C55E" },
            ].map((c) => (
              <div key={c.name} className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4 hover:-translate-y-[1px] hover:shadow-md transition-all">
                <div className="h-2 w-8 rounded-full mb-3" style={{ background: c.color }} />
                <p className="text-xs font-medium text-[var(--faint)]">{c.name}</p>
                <p className="text-sm font-bold mt-1">{formatBRL(c.bal)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Próximos eventos</CardTitle>
            <Button variant="ghost" size="sm">Agenda</Button>
          </CardHeader>
          <CardContent>
            <EmptyState title="Nenhum evento próximo" desc="Seu calendário está livre nos próximos 7 dias. Que tal adicionar algo?" action={<Button size="sm"><Plus className="h-4 w-4" /> Novo evento</Button>} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="h-4 w-4 text-[var(--accent)]" /> Dívidas
            </CardTitle>
            <span className="text-xs text-[var(--muted-foreground)]">você deve · te devem</span>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-xl border border-[var(--border)] p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">João — pagar dia 10</p>
                <p className="text-xs text-[var(--muted-foreground)]">Eu devo · pendente</p>
              </div>
              <p className="text-sm font-bold">R$ 70,00</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Carlos — lanche</p>
                <p className="text-xs text-[var(--muted-foreground)]">Me devem · pendente</p>
              </div>
              <p className="text-sm font-bold text-emerald-600">R$ 25,00</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Atividades escolares pendentes</CardTitle>
          <Badge>2 pendentes</Badge>
        </CardHeader>
        <CardContent className="flex gap-2 overflow-x-auto pb-1">
          {[
            { title: "Trabalho de História", due: "Entrega sex 05/09", prio: "alta" },
            { title: "Lista de Física", due: "Seg 08/09", prio: "média" },
          ].map((t) => (
            <div key={t.title} className="min-w-[220px] rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
              <p className="text-sm font-semibold">{t.title}</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">{t.due} · prioridade {t.prio}</p>
              <div className="mt-3 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden"><div className="h-full w-1/3 bg-[var(--accent)]" /></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
