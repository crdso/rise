import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(2).max(80),
  description: z.string().max(300).optional().nullable(),
  category: z.enum(["personal", "school", "finance", "important"]),
  starts_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "starts_at ISO inválido"),
  ends_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "ends_at ISO inválido").optional().nullable(),
  all_day: z.boolean().optional().default(false),
}).refine((d) => !d.ends_at || new Date(d.ends_at) >= new Date(d.starts_at), { message: "ends_at antes de starts_at", path: ["ends_at"] });
