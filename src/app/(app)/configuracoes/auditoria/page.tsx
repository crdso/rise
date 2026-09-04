"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, SlidersHorizontal, X, Loader2, Code2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auditService } from "@/lib/services/auditService";
import {
  auditIcon,
  auditTone,
  auditChanges,
  auditSummary,
  formatAuditValue,
  ENTITY_LABEL,
  ORIGIN_LABEL,
  ORIGIN_ICON,
  type AuditOrigin,
} from "@/lib/audit/presentation";
import { saoPauloDateKey, saoPauloTodayKey, addDaysToDateKey, formatDateKey, relativeDayLabel } from "@/lib/timezone";
import type { AuditEntry } from "@/types/finance";

type Period = "all" | "today" | "7d" | "30d";

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "all", label: "Tudo" },
];

const ORIGINS: AuditOrigin[] = ["web", "whatsapp", "ai", "system"];

function timeSP(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(
    new Date(iso)
  );
}

export default function AuditoriaPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [period, setPeriod] = useState<Period>("30d");
  const [origins, setOrigins] = useState<AuditOrigin[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState<AuditEntry | null>(null);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    auditService
      .list()
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availableEntities = useMemo(
    () => Array.from(new Set(entries.map((e) => e.entity))).sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const todayKey = saoPauloTodayKey();
    const from =
      period === "today" ? todayKey : period === "7d" ? addDaysToDateKey(todayKey, -6) : period === "30d" ? addDaysToDateKey(todayKey, -29) : null;
    const needle = q.trim().toLowerCase();

    return entries.filter((e) => {
      if (from && saoPauloDateKey(e.created_at) < from) return false;
      if (origins.length && !origins.includes(e.origin as AuditOrigin)) return false;
      if (entities.length && !entities.includes(e.entity)) return false;
      if (needle) {
        const hay = `${e.action} ${e.entity} ${ENTITY_LABEL[e.entity] ?? ""} ${auditSummary(e)} ${e.actor}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [entries, period, origins, entities, q]);

  /** Agrupa por dia civil de São Paulo. */
  const groups = useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const e of filtered) {
      const k = saoPauloDateKey(e.created_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const activeFilters = origins.length + entities.length + (period !== "30d" ? 1 : 0) + (q ? 1 : 0);
  const clearFilters = () => {
    setQ("");
    setPeriod("30d");
    setOrigins([]);
    setEntities([]);
  };

  const toggle = <T,>(arr: T[], v: T, set: (v: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const FilterBody = (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)] mb-2">Período</p>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              aria-pressed={period === p.id}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                period === p.id
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)] mb-2">Origem</p>
        <div className="flex flex-wrap gap-1.5">
          {ORIGINS.map((o) => {
            const Icon = ORIGIN_ICON[o];
            const active = origins.includes(o);
            return (
              <button
                key={o}
                onClick={() => toggle(origins, o, setOrigins)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {ORIGIN_LABEL[o]}
              </button>
            );
          })}
        </div>
      </div>

      {availableEntities.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)] mb-2">Tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {availableEntities.map((en) => {
              const active = entities.includes(en);
              return (
                <button
                  key={en}
                  onClick={() => toggle(entities, en, setEntities)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {ENTITY_LABEL[en] ?? en}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeFilters > 0 && (
        <Button size="sm" variant="ghost" className="rounded-full" onClick={clearFilters}>
          Limpar filtros
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/configuracoes"
          className="h-8 w-8 grid place-items-center rounded-full border border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]"
          aria-label="Voltar para Configurações"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Registro de auditoria</h1>
          <p className="text-[12.5px] text-[var(--muted-foreground)]">
            Imutável — escrito apenas pelo servidor, sem edição pela interface.
          </p>
        </div>
      </div>

      {/* barra de filtros: compacta no desktop, folha no mobile */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--faint)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por ação, item ou valor…"
            className="pl-9 h-10 rounded-full bg-[var(--card)]"
            aria-label="Buscar na auditoria"
          />
        </div>
        <Button
          size="sm"
          variant={activeFilters ? "soft" : "muted"}
          className="rounded-full lg:hidden shrink-0"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {activeFilters > 0 ? activeFilters : "Filtros"}
        </Button>
      </div>

      <div className="hidden lg:block rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-4">{FilterBody}</div>

      {/* lista */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[var(--muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando registro…
        </div>
      ) : error ? (
        <div className="rounded-[14px] border border-red-500/25 bg-red-500/10 p-4 text-[13px] text-red-300">{error}</div>
      ) : groups.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-10 text-center">
          <p className="text-[14px] font-medium">
            {entries.length === 0 ? "Nada registrado ainda" : "Nenhum registro com esses filtros"}
          </p>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            {entries.length === 0
              ? "Cada criação, edição e exclusão aparece aqui automaticamente."
              : "Ajuste o período ou limpe os filtros."}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([dayKey, list]) => (
            <section key={dayKey}>
              <div className="flex items-baseline gap-2 mb-2">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)]">
                  {formatDateKey(dayKey, { weekday: "long", day: "2-digit", month: "short" })}
                </h2>
                {relativeDayLabel(dayKey) && (
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    {relativeDayLabel(dayKey)}
                  </span>
                )}
              </div>

              <ul className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden">
                {list.map((e) => {
                  const Icon = auditIcon(e);
                  const OriginIcon = ORIGIN_ICON[e.origin as AuditOrigin] ?? ORIGIN_ICON.system;
                  const tone = auditTone(e);
                  const summary = auditSummary(e);
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setDetail(e);
                          setShowJson(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--card-soft)] transition-colors"
                      >
                        <span
                          className={`h-9 w-9 shrink-0 grid place-items-center rounded-xl border ${
                            tone === "danger"
                              ? "border-[var(--negative)]/25 bg-[var(--negative)]/10 text-[var(--negative)]"
                              : tone === "positive"
                                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] leading-tight">
                            <span className="font-medium">{e.actor}</span>{" "}
                            <span className="text-[var(--muted-foreground)]">{e.action}</span>
                          </span>
                          <span className="mt-0.5 block text-[12px] text-[var(--muted-foreground)] truncate">
                            {summary || ENTITY_LABEL[e.entity] || e.entity}
                          </span>
                        </span>

                        <span className="shrink-0 flex items-center gap-2 text-[11.5px] text-[var(--faint)]">
                          <span className="hidden sm:inline-flex items-center gap-1">
                            <OriginIcon className="h-3 w-3" />
                            {ORIGIN_LABEL[e.origin as AuditOrigin] ?? e.origin}
                          </span>
                          <span className="tnum">{timeSP(e.created_at)}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* folha de filtros no mobile */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltersOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 lg:hidden rounded-t-[22px] border-t border-[var(--border)] bg-[var(--elevated)] p-5 pb-[calc(1.25rem+var(--sab))] max-h-[80dvh] overflow-auto"
            >
              <div className="mx-auto h-1 w-9 rounded-full bg-[var(--border-strong)] mb-4" />
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold">Filtros</p>
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {FilterBody}
              <Button className="w-full rounded-full mt-5" onClick={() => setFiltersOpen(false)}>
                Ver {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* detalhe da entrada */}
      <AnimatePresence>
        {detail && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetail(null)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[520px] max-h-[86dvh] overflow-auto rounded-t-[22px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--elevated)] p-5 pb-[calc(1.25rem+var(--sab))] shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
            >
              <div className="mx-auto lg:hidden h-1 w-9 rounded-full bg-[var(--border-strong)] mb-4" />

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold leading-tight">
                    {detail.actor} {detail.action}
                  </p>
                  <p className="mt-1 text-[12.5px] text-[var(--muted-foreground)]">
                    {ENTITY_LABEL[detail.entity] ?? detail.entity} ·{" "}
                    {ORIGIN_LABEL[detail.origin as AuditOrigin] ?? detail.origin} ·{" "}
                    {formatDateKey(saoPauloDateKey(detail.created_at), { day: "2-digit", month: "short" })}{" "}
                    {timeSP(detail.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => setDetail(null)}
                  className="h-8 w-8 shrink-0 rounded-full bg-[var(--card-soft)] grid place-items-center hover:bg-[var(--muted)]"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {(() => {
                const changes = auditChanges(detail);
                const after = detail.after as Record<string, unknown> | null;

                if (changes.length > 0) {
                  return (
                    <div className="mt-5">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)] mb-2">
                        O que mudou
                      </p>
                      <ul className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden">
                        {changes.map((c) => (
                          <li key={c.field} className="px-3 py-2.5">
                            <p className="text-[11.5px] text-[var(--faint)]">{c.label}</p>
                            <div className="mt-1 flex items-center gap-2 text-[13px] flex-wrap">
                              <span className="text-[var(--muted-foreground)] line-through decoration-[var(--border-strong)]">
                                {formatAuditValue(c.field, c.before)}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 text-[var(--faint)]" />
                              <span className="font-medium">{formatAuditValue(c.field, c.after)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                if (after && typeof after === "object") {
                  const rows = Object.entries(after).filter(
                    ([k, v]) => !["id", "user_id", "created_at", "updated_at"].includes(k) && v !== null && v !== ""
                  );
                  return (
                    <div className="mt-5">
                      <p className="text-[11px] uppercase tracking-[0.08em] text-[var(--faint)] mb-2">Conteúdo</p>
                      <ul className="rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden">
                        {rows.slice(0, 10).map(([k, v]) => (
                          <li key={k} className="px-3 py-2 flex items-baseline justify-between gap-3">
                            <span className="text-[11.5px] text-[var(--faint)]">{k}</span>
                            <span className="text-[13px] text-right break-words">{formatAuditValue(k, v)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                return <p className="mt-5 text-[13px] text-[var(--muted-foreground)]">Sem detalhes adicionais.</p>;
              })()}

              <div className="mt-4">
                <button
                  onClick={() => setShowJson((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  {showJson ? "Ocultar JSON" : "Ver JSON"}
                </button>
                {showJson && (
                  <pre className="mt-2 max-h-[220px] overflow-auto rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-[11px] leading-relaxed">
                    {JSON.stringify({ before: detail.before ?? null, after: detail.after ?? null }, null, 2)}
                  </pre>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
