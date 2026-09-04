import { z } from "zod";

export const reminderPriority = z.enum(["low", "medium", "high"]);
export const reminderRecurrence = z.enum(["none", "daily", "weekly", "monthly"]);

// Sem .default() aqui: ver comentário em validators/calendar.ts.
const reminderFields = {
  title: z.string().min(2, "Título mínimo 2 caracteres").max(120),
  notes: z.string().max(500).optional().nullable(),
  due_at: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "due_at ISO inválido")
    .optional()
    .nullable(),
  recurrence: reminderRecurrence.optional().nullable(),
};

// Recorrência exige data: sem due_at não há próxima ocorrência a calcular.
export const reminderSchema = z
  .object({ ...reminderFields, priority: reminderPriority.optional().default("medium") })
  .refine((d) => !d.recurrence || d.recurrence === "none" || !!d.due_at, {
    message: "Lembrete recorrente precisa de data",
    path: ["due_at"],
  });

export const reminderPatchSchema = z
  .object({ ...reminderFields, priority: reminderPriority.optional() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "patch vazio" })
  .refine((d) => !(d.recurrence && d.recurrence !== "none") || d.due_at !== null, {
    message: "Lembrete recorrente precisa de data",
    path: ["due_at"],
  });

export type ReminderSchemaInput = z.infer<typeof reminderSchema>;
export type ReminderPatchInput = z.infer<typeof reminderPatchSchema>;
