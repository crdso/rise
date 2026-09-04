import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(2, "Nome mínimo 2 caracteres").max(40),
  type: z.enum(["checking", "wallet", "cash", "card", "savings", "other"]),
  icon: z.string().max(40).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor hex #RRGGBB").optional().nullable().or(z.literal("")),
  brand_domain: z.string().max(120).optional().nullable(),
  brand_key: z.string().max(40).optional().nullable(),
  initial_balance: z.coerce.number().min(-999999999).max(999999999),
  is_active: z.boolean().optional().default(true),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(30),
  icon: z.string().max(40).optional().nullable(),
  color: z.string().optional().nullable(),
});

export const transactionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.coerce.number().gt(0, "Valor deve ser > 0").max(999999999),
  description: z.string().max(120).optional().nullable(),
  category_id: z.string().uuid().nullable().optional(),
  category_name: z.string().max(30).optional().nullable(), // for inline create
  account_id: z.string().uuid().nullable().optional(),
  occurred_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "occurred_at deve ser ISO datetime válido").refine((v) => new Date(v).toISOString() === new Date(Date.parse(v)).toISOString() || !Number.isNaN(Date.parse(v)), "ISO inválido"),
  notes: z.string().max(500).optional().nullable(),
  payment_method: z.string().max(40).optional().nullable(),
  is_recurring: z.boolean().optional().default(false),
});

export type AccountInput = z.infer<typeof accountSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
