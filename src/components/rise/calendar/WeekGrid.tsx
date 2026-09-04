"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDateKey, saoPauloMinutes, saoPauloDateKey } from "@/lib/timezone";
import { CAT_COLOR, eventTime, sortEvents } from "./shared";
import type { CalendarEvent } from "@/types/calendar";

const HOUR_H = 48;
const TOTAL_H = HOUR_H * 24;
const MIN_EVENT_H = 22;

type Positioned = { ev: CalendarEvent; top: number; height: number; lane: number; lanes: number };

/**
 * Distribui os eventos do dia em faixas.
 * Eventos que se sobrepõem no tempo dividem a largura da coluna em vez de um
 * cobrir o outro — nenhum evento fica invisível.
 */
function layoutDay(events: CalendarEvent[]): Positioned[] {
  const timed = events
    .filter((e) => !e.all_day)
    .slice()
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));

  const items = timed.map((ev) => {
    const start = saoPauloMinutes(ev.starts_at);
    const rawEnd = ev.ends_at ? saoPauloMinutes(ev.ends_at) : start + 45;
    // evento que cruza a meia-noite é cortado no fim do dia visível
    const end = Math.max(start + 15, Math.min(rawEnd <= start ? start + 45 : rawEnd, 24 * 60));
    return { ev, start, end };
  });

  // agrupa em "clusters" que se tocam, e distribui faixas dentro de cada cluster
  const out: Positioned[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const laneEnds: number[] = [];
    const assigned = cluster.map((it) => {
      let lane = laneEnds.findIndex((endAt) => endAt <= it.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.end);
      } else {
        laneEnds[lane] = it.end;
      }
      return { ...it, lane };
    });
    const lanes = laneEnds.length;
    for (const a of assigned) {
      out.push({
        ev: a.ev,
        top: (a.start / 1440) * TOTAL_H,
        height: Math.max(MIN_EVENT_H, ((a.end - a.start) / 1440) * TOTAL_H),
        lane: a.lane,
        lanes,
      });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const it of items) {
    if (cluster.length && it.start >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
  return out;
}

export function WeekGrid({
  weekKeys,
  todayKey,
  eventsByDate,
  onCreate,
  onOpenEvent,
}: {
  weekKeys: string[];
  todayKey: string;
  eventsByDate: Record<string, CalendarEvent[]>;
  onCreate: (key: string, hhmm: string) => void;
  onOpenEvent: (ev: CalendarEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  // linha de "agora", atualizada a cada minuto
  useEffect(() => {
    const tick = () => setNowMin(saoPauloMinutes());
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  // abre já na manhã, mas as 24h continuam roláveis
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 7 * HOUR_H;
  }, [weekKeys[0]]);

  const layouts = useMemo(() => {
    const map: Record<string, Positioned[]> = {};
    for (const k of weekKeys) map[k] = layoutDay(eventsByDate[k] || []);
    return map;
  }, [weekKeys, eventsByDate]);

  const allDayRows = useMemo(
    () => weekKeys.map((k) => (eventsByDate[k] || []).filter((e) => e.all_day).sort(sortEvents)),
    [weekKeys, eventsByDate]
  );
  const hasAllDay = allDayRows.some((r) => r.length > 0);

  const cols = "56px repeat(7, minmax(0,1fr))";

  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* cabeçalho dos dias */}
      <div className="grid border-b border-[var(--border)] bg-[var(--card-soft)]" style={{ gridTemplateColumns: cols }}>
        <div className="p-2 text-[10px] uppercase tracking-wide text-[var(--faint)]">Hora</div>
        {weekKeys.map((k) => {
          const isToday = k === todayKey;
          return (
            <div key={k} className="p-2 text-center border-l border-[var(--border)]">
              <p className="text-[10px] uppercase tracking-wide text-[var(--faint)]">
                {formatDateKey(k, { weekday: "short" })}
              </p>
              <p
                className={`mt-1 inline-grid h-6 w-6 place-items-center rounded-full text-[12px] tnum font-semibold ${
                  isToday ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "text-[var(--foreground)]"
                }`}
              >
                {Number(k.slice(8, 10))}
              </p>
            </div>
          );
        })}
      </div>

      {/* faixa de dia inteiro — sempre fora da grade de horas */}
      {hasAllDay && (
        <div
          className="grid border-b border-[var(--border)] bg-[var(--background-soft)]"
          style={{ gridTemplateColumns: cols }}
        >
          <div className="p-2 text-[10px] text-[var(--faint)]">Dia inteiro</div>
          {weekKeys.map((k, i) => (
            <div key={k} className="border-l border-[var(--border)] p-1 space-y-1 min-h-[34px]">
              {allDayRows[i].map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onOpenEvent(ev)}
                  className="w-full truncate rounded-[5px] px-1.5 py-1 text-left text-[10.5px] leading-none"
                  style={{
                    background: `color-mix(in srgb, ${CAT_COLOR[ev.category]} 20%, transparent)`,
                    color: "var(--foreground)",
                  }}
                >
                  {ev.title}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* grade de 24h */}
      <div ref={scrollRef} className="max-h-[540px] overflow-auto">
        <div className="grid relative" style={{ gridTemplateColumns: cols, height: TOTAL_H }}>
          {/* gutter de horas */}
          <div className="relative">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="absolute left-0 right-0 pr-2 text-right text-[10px] tnum text-[var(--faint)] -translate-y-1/2"
                style={{ top: h * HOUR_H }}
              >
                {h > 0 ? `${String(h).padStart(2, "0")}:00` : ""}
              </div>
            ))}
          </div>

          {weekKeys.map((k) => (
            <div
              key={k}
              className={`relative border-l border-[var(--border)] ${k === todayKey ? "bg-[var(--accent-soft)]/25" : ""}`}
            >
              {/* linhas de hora + área clicável para criar */}
              {Array.from({ length: 24 }, (_, h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => onCreate(k, `${String(h).padStart(2, "0")}:00`)}
                  aria-label={`Criar evento às ${String(h).padStart(2, "0")}:00`}
                  className="absolute left-0 right-0 border-t border-[var(--border)] hover:bg-[var(--card-soft)] transition-colors"
                  style={{ top: h * HOUR_H, height: HOUR_H }}
                />
              ))}

              {/* eventos posicionados pelo horário real em SP */}
              {layouts[k].map(({ ev, top, height, lane, lanes }) => {
                const width = 100 / lanes;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onOpenEvent(ev)}
                    title={`${eventTime(ev.starts_at)} · ${ev.title}`}
                    className="absolute overflow-hidden rounded-[6px] border px-1.5 py-1 text-left transition-shadow hover:shadow-lg"
                    style={{
                      top,
                      height,
                      left: `calc(${lane * width}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                      background: `color-mix(in srgb, ${CAT_COLOR[ev.category]} 26%, var(--card))`,
                      borderColor: `color-mix(in srgb, ${CAT_COLOR[ev.category]} 45%, transparent)`,
                    }}
                  >
                    <span className="block truncate text-[10.5px] font-medium leading-tight">{ev.title}</span>
                    {height > 32 && (
                      <span className="block truncate text-[9.5px] tnum text-[var(--muted-foreground)]">
                        {eventTime(ev.starts_at)}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* linha de agora */}
              {nowMin !== null && k === todayKey && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                  style={{ top: (nowMin / 1440) * TOTAL_H }}
                  aria-hidden
                >
                  <span className="h-[7px] w-[7px] -ml-[3.5px] rounded-full bg-[var(--negative)]" />
                  <span className="h-px flex-1 bg-[var(--negative)]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { HOUR_H, TOTAL_H, layoutDay };
export type { Positioned };

/** Timeline de um único dia — mesma lógica de posicionamento da semana. */
export function DayTimeline({
  dateKey,
  todayKey,
  events,
  onCreate,
  onOpenEvent,
}: {
  dateKey: string;
  todayKey: string;
  events: CalendarEvent[];
  onCreate: (key: string, hhmm: string) => void;
  onOpenEvent: (ev: CalendarEvent) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNowMin(saoPauloMinutes());
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 7 * HOUR_H;
  }, [dateKey]);

  const allDay = events.filter((e) => e.all_day).sort(sortEvents);
  const positioned = useMemo(() => layoutDay(events), [events]);
  const isToday = dateKey === todayKey;

  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold first-letter:uppercase">
          {formatDateKey(dateKey, { weekday: "long", day: "2-digit", month: "long" })}
        </h3>
        <span className="text-[11.5px] text-[var(--muted-foreground)]">
          {events.length === 0 ? "sem eventos" : `${events.length} ${events.length === 1 ? "evento" : "eventos"}`}
        </span>
      </div>

      {allDay.length > 0 && (
        <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--background-soft)] space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-[var(--faint)]">Dia inteiro</p>
          {allDay.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => onOpenEvent(ev)}
              className="block w-full truncate rounded-[6px] px-2 py-1.5 text-left text-[12px]"
              style={{ background: `color-mix(in srgb, ${CAT_COLOR[ev.category]} 20%, transparent)` }}
            >
              {ev.title}
            </button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="max-h-[520px] overflow-auto">
        <div className="relative grid" style={{ gridTemplateColumns: "56px minmax(0,1fr)", height: TOTAL_H }}>
          <div className="relative">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="absolute left-0 right-0 pr-2 text-right text-[10px] tnum text-[var(--faint)] -translate-y-1/2"
                style={{ top: h * HOUR_H }}
              >
                {h > 0 ? `${String(h).padStart(2, "0")}:00` : ""}
              </div>
            ))}
          </div>

          <div className="relative border-l border-[var(--border)]">
            {Array.from({ length: 24 }, (_, h) => (
              <button
                key={h}
                type="button"
                onClick={() => onCreate(dateKey, `${String(h).padStart(2, "0")}:00`)}
                aria-label={`Criar evento às ${String(h).padStart(2, "0")}:00`}
                className="absolute left-0 right-0 border-t border-[var(--border)] hover:bg-[var(--card-soft)] transition-colors"
                style={{ top: h * HOUR_H, height: HOUR_H }}
              />
            ))}

            {positioned.map(({ ev, top, height, lane, lanes }) => {
              const width = 100 / lanes;
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onOpenEvent(ev)}
                  className="absolute overflow-hidden rounded-[7px] border px-2 py-1.5 text-left transition-shadow hover:shadow-lg"
                  style={{
                    top,
                    height,
                    left: `calc(${lane * width}% + 4px)`,
                    width: `calc(${width}% - 8px)`,
                    background: `color-mix(in srgb, ${CAT_COLOR[ev.category]} 24%, var(--card))`,
                    borderColor: `color-mix(in srgb, ${CAT_COLOR[ev.category]} 45%, transparent)`,
                  }}
                >
                  <span className="block truncate text-[12px] font-medium leading-tight">{ev.title}</span>
                  {height > 34 && (
                    <span className="block truncate text-[10.5px] tnum text-[var(--muted-foreground)]">
                      {eventTime(ev.starts_at)}
                      {ev.ends_at ? ` – ${eventTime(ev.ends_at)}` : ""}
                    </span>
                  )}
                </button>
              );
            })}

            {nowMin !== null && isToday && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                style={{ top: (nowMin / 1440) * TOTAL_H }}
                aria-hidden
              >
                <span className="h-[7px] w-[7px] -ml-[3.5px] rounded-full bg-[var(--negative)]" />
                <span className="h-px flex-1 bg-[var(--negative)]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lista compacta do dia — usada embaixo da grade no mobile. */
export function DayList({
  dateKey,
  events,
  onOpenEvent,
  onCreate,
}: {
  dateKey: string;
  events: CalendarEvent[];
  onOpenEvent: (ev: CalendarEvent) => void;
  onCreate: (key: string) => void;
}) {
  const sorted = events.slice().sort(sortEvents);
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-[13px] font-semibold first-letter:uppercase">
          {formatDateKey(dateKey, { weekday: "long", day: "2-digit", month: "long" })}
        </h3>
        <button
          type="button"
          onClick={() => onCreate(dateKey)}
          className="text-[11.5px] font-medium text-[var(--accent)]"
        >
          Adicionar
        </button>
      </div>
      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-[var(--muted-foreground)]">Nenhum evento neste dia.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {sorted.map((ev) => (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => onOpenEvent(ev)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[var(--card-soft)]"
              >
                <span
                  className="h-8 w-[3px] shrink-0 rounded-full"
                  style={{ background: CAT_COLOR[ev.category] }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{ev.title}</span>
                  <span className="block text-[11.5px] text-[var(--muted-foreground)]">
                    {ev.all_day ? "Dia inteiro" : eventTime(ev.starts_at)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Agenda: só do dia atual em diante, agrupada por data. */
export function AgendaView({
  events,
  todayKey,
  onOpenEvent,
}: {
  events: CalendarEvent[];
  todayKey: string;
  onOpenEvent: (ev: CalendarEvent) => void;
}) {
  const groups = useMemo(() => {
    const upcoming = events
      .filter((e) => saoPauloDateKey(e.starts_at) >= todayKey)
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
      .slice(0, 80);
    const map = new Map<string, CalendarEvent[]>();
    for (const e of upcoming) {
      const k = saoPauloDateKey(e.starts_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return [...map.entries()];
  }, [events, todayKey]);

  if (!groups.length) {
    return (
      <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-10 text-center">
        <p className="text-[14px] font-medium">Nenhum evento à frente</p>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">O que você agendar aparece aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([key, list]) => (
        <section key={key}>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)]">
              {formatDateKey(key, { weekday: "long", day: "2-digit", month: "short" })}
            </h3>
            {key === todayKey && (
              <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                Hoje
              </span>
            )}
          </div>
          <ul className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)] overflow-hidden">
            {list.sort(sortEvents).map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onOpenEvent(ev)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--card-soft)] transition-colors"
                >
                  <span className="w-[54px] shrink-0 text-[11.5px] tnum text-[var(--muted-foreground)]">
                    {ev.all_day ? "dia" : eventTime(ev.starts_at)}
                  </span>
                  <span
                    className="h-7 w-[3px] shrink-0 rounded-full"
                    style={{ background: CAT_COLOR[ev.category] }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{ev.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
