const TZ = "America/Sao_Paulo";

// Converte ISO (UTC) para valor datetime-local no timezone de SP (YYYY-MM-DDTHH:mm)
export function toSaoPauloDateTimeLocal(iso: string): string {
  const d = new Date(iso);
  // formatar partes em TZ
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

// Converte valor datetime-local (interpretado como horário de SP) para ISO UTC
export function fromSaoPauloDateTimeLocal(local: string): string {
  // local = "2026-09-03T14:30"
  if (!local) throw new Error("datetime-local vazio");
  const [datePart, timePart] = local.split("T");
  if (!datePart || !timePart) throw new Error("datetime-local inválido");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  // Obter offset de SP naquele instante: diferença entre UTC e SP
  // Cria data fictícia em UTC com mesmos wall time, mede offset
  // Estratégia: construir Date como se fosse UTC, depois ajustar usando Intl
  const wall = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  // offset = diferença entre wall UTC e o instante real que corresponde a wall em SP
  // Para isso, formatamos wall em SP e calculamos delta
  const spParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(wall);
  const get = (t: string) => Number(spParts.find((p) => p.type === t)?.value || 0);
  const wallAsUTCms = Date.UTC(y, m - 1, d, hh, mm, 0);
  const formattedAsUTCms = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), 0);
  const offsetMs = formattedAsUTCms - wallAsUTCms;
  // offset positivo significa SP está atrás de UTC (ex: -3h => offset = +3h em ms quando wall é interpretado como UTC)
  // Para obter UTC real: wallAsUTCms - offsetMs? Testar: SP 14:30 -> wallAsUTCms 14:30 UTC, SP offset -3h => formattedAsUTCms será 11:30 UTC (pois wall 14:30 UTC é 11:30 em SP). Delta = 11:30 - 14:30 = -3h. Queremos 17:30 UTC, então wallAsUTCms - delta = 14:30 - (-3h) = 17:30 correto.
  const utcMs = wallAsUTCms - offsetMs;
  return new Date(utcMs).toISOString();
}

// Helper central para chave de dia em SP (YYYY-MM-DD)
export function saoPauloDateKey(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// Helper para agora em SP como datetime-local
export function nowSaoPauloDateTimeLocal(): string {
  return toSaoPauloDateTimeLocal(new Date().toISOString());
}

// ============================================================
// Helpers centrais de DIA CIVIL em America/Sao_Paulo
//
// Política do RISE:
//   - Instante            -> ISO UTC / timestamptz (nunca tocar)
//   - Dia civil da UI     -> chave "YYYY-MM-DD" em America/Sao_Paulo
//
// PROIBIDO fora deste arquivo:
//   new Date(new Date().toLocaleString("en-US", { timeZone: TZ })).toISOString().slice(0,10)
//   qualquer toISOString().slice(0,10) usado como "dia de hoje"
// Ambos convertem duas vezes e erram o dia a partir das 21:00 em UTC-3.
//
// A aritmética de dias abaixo usa uma âncora em meio-dia UTC. Como só lemos
// a âncora com métodos getUTC*, ela nunca escorrega de dia por fuso do device.
// ============================================================

export const SAO_PAULO_TZ = TZ;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Chave "YYYY-MM-DD" do dia civil de hoje em São Paulo. */
export function saoPauloTodayKey(): string {
  return saoPauloDateKey(new Date());
}

/** Hora (0-23) de um instante, no fuso de São Paulo. */
export function saoPauloHour(instant: string | Date): number {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d)
  );
}

/** Chave "YYYY-MM" do mês civil de um instante, em São Paulo. */
export function saoPauloMonthKey(instant: string | Date): string {
  return saoPauloDateKey(typeof instant === "string" ? new Date(instant) : instant).slice(0, 7);
}

/** Âncora estável (meio-dia UTC) para uma chave de dia. Uso interno de formatação/aritmética. */
export function dateKeyToAnchor(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

export function anchorToDateKey(anchor: Date): string {
  return `${anchor.getUTCFullYear()}-${pad2(anchor.getUTCMonth() + 1)}-${pad2(anchor.getUTCDate())}`;
}

export function addDaysToDateKey(key: string, days: number): string {
  const a = dateKeyToAnchor(key);
  a.setUTCDate(a.getUTCDate() + days);
  return anchorToDateKey(a);
}

/** Soma meses preservando o último dia do mês (espelha add_months_preserve_eom do SQL). */
export function addMonthsToDateKey(key: string, months: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const totalMonths = m - 1 + months;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth = ((totalMonths % 12) + 12) % 12; // 0-11
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${pad2(targetMonth + 1)}-${pad2(Math.min(d, lastDay))}`;
}

/** 0 = segunda ... 6 = domingo (semana começa na segunda, como a UI do RISE). */
export function weekdayIndexFromDateKey(key: string): number {
  const js = dateKeyToAnchor(key).getUTCDay(); // 0 = domingo
  return js === 0 ? 6 : js - 1;
}

/** Chave da segunda-feira da semana que contém `key`. */
export function startOfWeekKey(key: string): string {
  return addDaysToDateKey(key, -weekdayIndexFromDateKey(key));
}

/** Formata uma chave de dia sem risco de drift (a âncora é lida em UTC). */
export function formatDateKey(key: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone: "UTC" }).format(dateKeyToAnchor(key));
}

/** Grade do mês: `null` nas células de preenchimento, chaves nas demais. Sempre múltiplo de 7. */
export function monthGridKeys(year: number, monthIndex0: number): Array<string | null> {
  const firstKey = `${year}-${pad2(monthIndex0 + 1)}-01`;
  const lead = weekdayIndexFromDateKey(firstKey);
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const cells: Array<string | null> = new Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${year}-${pad2(monthIndex0 + 1)}-${pad2(d)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Converte (dia civil SP + "HH:mm") para instante ISO UTC. */
export function isoFromDateKeyAndTime(key: string, hhmm: string): string {
  return fromSaoPauloDateTimeLocal(`${key}T${hhmm}`);
}

/** Instante ISO UTC correspondente a 00:00 do dia civil SP. */
export function startOfSaoPauloDayISO(key: string): string {
  return isoFromDateKeyAndTime(key, "00:00");
}

/** Minutos desde a meia-noite de São Paulo — usado pela linha de "agora". */
export function saoPauloMinutes(instant: string | Date = new Date()): number {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  return get("hour") * 60 + get("minute");
}

/**
 * Grade do mês COM os dias vizinhos.
 * Diferente de monthGridKeys (que usa null nas bordas), aqui as células de
 * preenchimento são dias reais do mês anterior/seguinte, marcados com
 * inMonth=false — é o que permite diferenciá-los visualmente em vez de
 * deixar buracos na grade.
 */
export function monthGridDays(year: number, monthIndex0: number): Array<{ key: string; inMonth: boolean }> {
  const firstKey = `${year}-${pad2(monthIndex0 + 1)}-01`;
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const lastKey = `${year}-${pad2(monthIndex0 + 1)}-${pad2(daysInMonth)}`;
  const start = startOfWeekKey(firstKey);
  const endWeek = startOfWeekKey(lastKey);
  const end = addDaysToDateKey(endWeek, 6);

  const out: Array<{ key: string; inMonth: boolean }> = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= end && guard < 50) {
    out.push({ key: cursor, inMonth: cursor >= firstKey && cursor <= lastKey });
    cursor = addDaysToDateKey(cursor, 1);
    guard++;
  }
  return out;
}

/** Rótulo relativo curto para uma chave de dia: "Hoje", "Amanhã", "Ontem" ou null. */
export function relativeDayLabel(key: string, todayKey: string = saoPauloTodayKey()): string | null {
  if (key === todayKey) return "Hoje";
  if (key === addDaysToDateKey(todayKey, 1)) return "Amanhã";
  if (key === addDaysToDateKey(todayKey, -1)) return "Ontem";
  return null;
}
