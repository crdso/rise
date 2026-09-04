import { z } from "zod";

export const debtSchema = z.object({
  person: z.string().min(2).max(60),
  description: z.string().max(120).optional().nullable(),
  kind: z.enum(["owed", "receivable"]),
  amount: z.coerce.number().gt(0).max(999999999),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal("")),
  notes: z.string().max(500).optional().nullable(),
  is_installment: z.boolean().optional().default(false),
  installments_count: z.coerce.number().int().min(2).max(48).optional().nullable(),
  first_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

export const debtPaymentSchema = z.object({
  amount: z.coerce.number().gt(0).max(999999999),
  paid_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "paid_at ISO inválido").optional(),
  notes: z.string().max(300).optional().nullable(),
  create_transaction: z.boolean().optional().default(false),
  account_id: z.string().uuid().optional().nullable(),
  transaction_category: z.string().max(30).optional().nullable(),
  installment_id: z.string().uuid().optional().nullable(),
});
