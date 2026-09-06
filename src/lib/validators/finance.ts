import { z } from "zod";

// Campos sem .default(): defaults só nos schemas de CRIAÇÃO.
// .partial() não remove .default() — em um patch a chave ausente voltaria
// preenchida e sobrescreveria o valor atual no banco.
const accountFields = {
  name: z.string().min(2, "Nome mínimo 2 caracteres").max(40),
  type: z.enum(["checking", "wallet", "cash", "card", "savings", "other"]),
  icon: z.string().max(40).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor hex #RRGGBB").optional().nullable().or(z.literal("")),
  brand_domain: z.string().max(120).optional().nullable(),
  brand_key: z.string().max(40).optional().nullable(),
  initial_balance: z.coerce.number().min(-999999999).max(999999999),
};

export const accountSchema = z.object({
  ...accountFields,
  is_active: z.boolean().optional().default(true),
});

export const accountPatchSchema = z
  .object({ ...accountFields, is_active: z.boolean().optional() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "patch vazio" });

export const categorySchema = z.object({
  name: z.string().min(2).max(30),
  icon: z.string().max(40).optional().nullable(),
  color: z.string().optional().nullable(),
});

const transactionFields = {
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().gt(0, "Valor deve ser > 0").max(999999999),
  description: z.string().max(120).optional().nullable(),
  category_id: z.string().uuid().nullable().optional(),
  category_name: z.string().max(30).optional().nullable(), // for inline create
  account_id: z.string().uuid().nullable().optional(),
  occurred_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "occurred_at deve ser ISO datetime válido"),
  notes: z.string().max(500).optional().nullable(),
  payment_method: z.string().max(40).optional().nullable(),
};

export const transactionSchema = z.object({
  ...transactionFields,
  is_recurring: z.boolean().optional().default(false),
});

export const ensuredAccountTransactionSchema = transactionSchema.extend({
  account_name: z.string().trim().min(2).max(40),
  account_type: z.literal("checking").default("checking"),
  account_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  account_brand_domain: z.string().max(120).nullable().optional(),
  account_brand_key: z.string().max(40).nullable().optional(),
});

export const transactionPatchSchema = z
  .object({ ...transactionFields, is_recurring: z.boolean().optional() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "patch vazio" });

export type AccountInput = z.infer<typeof accountSchema>;
export type AccountPatchInput = z.infer<typeof accountPatchSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionPatchInput = z.infer<typeof transactionPatchSchema>;

export const transferSchema = z.object({
  from_account_id: z.string().uuid(),
  to_account_id: z.string().uuid(),
  amount: z.number().positive().max(999999999).multipleOf(0.01),
  occurred_at: z.string().datetime({ offset: true }),
  notes: z.string().max(500).nullable(),
}).strict().refine(value => value.from_account_id !== value.to_account_id, { message: "Escolha contas diferentes." });
export type TransferInput = z.infer<typeof transferSchema>;
