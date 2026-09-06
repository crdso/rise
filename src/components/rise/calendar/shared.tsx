"use client";
import type { CalendarEvent, EventCategory } from "@/types/calendar";

export const CAT_COLOR: Record<EventCategory, string> = {
  personal: "var(--chart-1)",
  school: "var(--chart-5)",
  finance: "var(--chart-2)",
  important: "var(--negative)",
};

export const CAT_LABEL: Record<EventCategory, string> = {
  personal: "Pessoal",
  school: "Escola",
  finance: "Financeiro",
  important: "Importante",
};

export const WEEKDAYS_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const WEEKDAYS_MIN = ["S", "T", "Q", "Q", "S", "S", "D"];
export const MONTH_WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MONTH_WEEKDAYS_MIN = ["D", "S", "T", "Q", "Q", "S", "S"];

export function eventTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

export function eventFullTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

/** Ordena: dia inteiro primeiro, depois por horário. */
export function sortEvents(a: CalendarEvent, b: CalendarEvent) {
  if (a.all_day !== b.all_day) return a.all_day ? -1 : 1;
  return +new Date(a.starts_at) - +new Date(b.starts_at);
}

/**
 * Etiqueta compacta de evento.
 * A cor da categoria fica numa barra lateral em vez de tingir o texto inteiro —
 * o título mantém contraste total de leitura em qualquer tema.
 */
export function EventChip({
  event,
  onClick,
  showTime = true,
  dense,
}: {
  event: CalendarEvent;
  onClick?: (e: React.MouseEvent) => void;
  showTime?: boolean;
  dense?: boolean;
}) {
  const color = CAT_COLOR[event.category] ?? "var(--chart-1)";
  return (
    <button
      type="button"
      onClick={onClick}
      title={event.title}
      className={`group flex w-full items-center gap-1.5 rounded-[5px] pl-1.5 pr-1 text-left transition-colors hover:bg-[var(--card-soft)] ${
        dense ? "py-[1px]" : "py-0.5"
      }`}
    >
      <span className="h-[11px] w-[3px] shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      {showTime && !event.all_day && (
        <span className="hidden sm:inline text-[10px] tnum text-[var(--faint)] shrink-0">
          {eventTime(event.starts_at)}
        </span>
      )}
      <span className="truncate text-[11px] leading-[15px] text-[var(--foreground)]">{event.title}</span>
    </button>
  );
}
