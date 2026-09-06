"use client";
import { useMemo } from "react";
import { monthGridDays, formatDateKey } from "@/lib/timezone";
import { MONTH_WEEKDAYS_SHORT, MONTH_WEEKDAYS_MIN, EventChip, sortEvents, CAT_COLOR } from "./shared";
import type { CalendarEvent } from "@/types/calendar";

/**
 * Grade mensal.
 *
 * Decisões:
 *  - As bordas mostram os dias reais dos meses vizinhos, atenuados — nunca
 *    células vazias, que quebram a leitura de semana.
 *  - Clicar no dia SELECIONA (não cria). Criar é ação explícita do botão
 *    ou do duplo clique, então o "+N mais" também só abre o dia.
 *  - No mobile a célula vira um alvo de toque com pontinhos, e a lista do dia
 *    aparece embaixo da grade.
 */
export function MonthGrid({
  year,
  month,
  todayKey,
  selectedKey,
  eventsByDate,
  onSelect,
  onCreate,
  onOpenEvent,
}: {
  year: number;
  month: number;
  todayKey: string;
  selectedKey: string | null;
  eventsByDate: Record<string, CalendarEvent[]>;
  onSelect: (key: string) => void;
  onCreate: (key: string) => void;
  onOpenEvent: (ev: CalendarEvent) => void;
}) {
  const cells = useMemo(() => monthGridDays(year, month), [year, month]);

  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--card-soft)]">
        {MONTH_WEEKDAYS_SHORT.map((w, i) => (
          <div
            key={w + i}
            className="py-2 text-center text-[10.5px] tracking-[0.1em] font-medium text-[var(--faint)] uppercase"
          >
            <span className="hidden sm:inline">{w}</span>
            <span className="sm:hidden">{MONTH_WEEKDAYS_MIN[i]}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 divide-x divide-y divide-[var(--border)] border-t border-[var(--border)] -mt-px">
        {cells.map(({ key, inMonth }) => {
          const dayEvents = (eventsByDate[key] || []).slice().sort(sortEvents);
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const more = dayEvents.length > 3 ? dayEvents.length - 3 : 0;

          return (
            <div
              key={key}
              onClick={() => onSelect(key)}
              onDoubleClick={() => onCreate(key)}
              role="gridcell"
              tabIndex={0}
              aria-selected={isSelected}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(key);
                }
              }}
              className={`relative min-h-[64px] sm:min-h-[104px] p-1 sm:p-1.5 flex flex-col cursor-pointer transition-colors ${
                inMonth ? "bg-[var(--card)]" : "bg-[var(--background-soft)]"
              } ${isSelected ? "ring-1 ring-inset ring-[var(--accent)]" : "hover:bg-[var(--card-soft)]"}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[11.5px] tnum font-medium ${
                    isToday
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold"
                      : inMonth
                        ? "text-[var(--foreground)]"
                        : "text-[var(--faint)]"
                  }`}
                >
                  {Number(key.slice(8, 10))}
                </span>
              </div>

              {/* desktop: chips legíveis */}
              <div className="hidden sm:flex flex-col gap-[2px] mt-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((ev) => (
                  <EventChip
                    key={ev.id}
                    event={ev}
                    dense
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEvent(ev);
                    }}
                  />
                ))}
                {more > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(key);
                    }}
                    className="pl-1.5 text-left text-[10px] text-[var(--faint)] hover:text-[var(--accent)]"
                  >
                    +{more} {more === 1 ? "evento" : "eventos"}
                  </button>
                )}
              </div>

              {/* mobile: pontinhos, a lista fica abaixo da grade */}
              <div className="sm:hidden mt-auto flex items-center justify-center gap-[3px] pb-0.5 min-h-[8px]">
                {dayEvents.slice(0, 4).map((ev) => (
                  <span
                    key={ev.id}
                    className="h-[4px] w-[4px] rounded-full"
                    style={{ background: CAT_COLOR[ev.category] }}
                    aria-hidden
                  />
                ))}
              </div>

              <span className="sr-only">
                {formatDateKey(key, { day: "2-digit", month: "long" })}
                {dayEvents.length ? ` — ${dayEvents.length} evento(s)` : " — sem eventos"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
