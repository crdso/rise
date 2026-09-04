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

// Helper para agora em SP como datetime-local
export function nowSaoPauloDateTimeLocal(): string {
  return toSaoPauloDateTimeLocal(new Date().toISOString());
}
