import { z } from "zod";

const fields = {
  title: z.string().min(2, "Título mínimo 2 caracteres").max(120),
  content: z.string().max(5000).optional().nullable(),
  tag: z.string().max(30).optional().nullable(),
  remind_at: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "remind_at ISO inválido")
    .optional()
    .nullable(),
};

export const importantSchema = z.object({ ...fields, pinned: z.boolean().optional().default(false) });

// Sem .default() no patch: chave ausente = não mexer.
export const importantPatchSchema = z
  .object({ ...fields, pinned: z.boolean().optional() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "patch vazio" });

export type ImportantSchemaInput = z.infer<typeof importantSchema>;
export type ImportantPatchInput = z.infer<typeof importantPatchSchema>;
