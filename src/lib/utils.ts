import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(centsOrValue: number) {
  const v = centsOrValue;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(date: string | Date, opts?: { withTime?: boolean; allDay?: boolean }) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (opts?.allDay) {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" }).format(d);
  }
  if (opts?.withTime) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(d);
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

export function greeting(name = "Ezequias") {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  if (h < 12) return `Bom dia, ${name}.`;
  if (h < 18) return `Boa tarde, ${name}.`;
  return `Boa noite, ${name}.`;
}

/** "quinta-feira, 4 de setembro" — cabeçalho do painel. */
export function headerDate(d = new Date()) {
  return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
}
