import { z } from "zod";

const isoString = (label: string) =>
  z.string().refine((v) => !Number.isNaN(Date.parse(v)), `${label} ISO inválido`);

export const eventCategory = z.enum(["personal", "school", "finance", "important"]);

// Campos sem .default(): defaults só entram no schema de CRIAÇÃO.
// Em um schema de patch, .partial() NÃO remove .default() — a chave ausente
// voltaria preenchida no output e sobrescreveria o valor atual no banco.
const eventFields = {
  title: z.string().min(2).max(80),
  description: z.string().max(300).optional().nullable(),
  category: eventCategory,
  starts_at: isoString("starts_at"),
  ends_at: isoString("ends_at").optional().nullable(),
};

const endsAfterStart = (d: { starts_at?: string; ends_at?: string | null }) =>
  !d.ends_at || !d.starts_at || new Date(d.ends_at) >= new Date(d.starts_at);

// Criação: objeto completo, validação cruzada sempre aplicável.
export const eventSchema = z
  .object({ ...eventFields, all_day: z.boolean().optional().default(false) })
  .refine((d) => !d.ends_at || new Date(d.ends_at) >= new Date(d.starts_at), {
    message: "ends_at antes de starts_at",
    path: ["ends_at"],
  });

// Patch parcial: a checagem cruzada só roda quando os dois campos vêm juntos.
// Com { ends_at } isolado, comparar contra um starts_at ausente daria NaN >= NaN
// e geraria 400 espúrio. O estado final é validado pela RPC update_event_with_audit
// e pelo CHECK da tabela events.
export const eventPatchSchema = z
  .object({ ...eventFields, all_day: z.boolean().optional() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "patch vazio" })
  .refine(endsAfterStart, { message: "ends_at antes de starts_at", path: ["ends_at"] });

export type EventInput = z.infer<typeof eventSchema>;
export type EventPatchInput = z.infer<typeof eventPatchSchema>;
