import { z } from "zod";

export const schoolType = z.enum(["exam", "assignment", "homework", "presentation", "project", "other"]);
export const schoolPriority = z.enum(["low", "medium", "high"]);
export const schoolStatus = z.enum(["not_started", "in_progress", "done", "archived"]);

const fields = {
  title: z.string().min(2, "Título mínimo 2 caracteres").max(120),
  subject: z.string().max(60).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  due_at: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "due_at ISO inválido")
    .optional()
    .nullable(),
};

export const schoolTaskSchema = z.object({
  ...fields,
  type: schoolType.optional().default("assignment"),
  priority: schoolPriority.optional().default("medium"),
});

// Sem .default() no patch: chave ausente = não mexer.
export const schoolTaskPatchSchema = z
  .object({ ...fields, type: schoolType.optional(), priority: schoolPriority.optional(), status: schoolStatus.optional() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "patch vazio" });

export type SchoolTaskSchemaInput = z.infer<typeof schoolTaskSchema>;
export type SchoolTaskPatchInput = z.infer<typeof schoolTaskPatchSchema>;
