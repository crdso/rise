import { z } from "zod";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor hex #RRGGBB");

export const customThemeSchema = z.object({
  colors: z.array(hex).min(2).max(5),
  angle: z.number().min(0).max(360),
  intensity: z.number().min(0.3).max(1.4),
});

export const dashboardLayoutSchema = z.object({
  order: z.array(z.string().max(40)).max(30),
  hidden: z.array(z.string().max(40)).max(30),
  spans: z.record(z.string().max(40), z.enum(["wide", "narrow"])).optional(),
});

/**
 * Patch de preferências. Sem defaults: chave ausente = "não mexer".
 * (Ver comentário em validators/calendar.ts sobre .partial() e .default().)
 */
export const settingsPatchSchema = z
  .object({
    theme: z.enum(["onyx", "blurple", "ocean", "forest", "emerald", "amethyst", "crimson", "chroma", "custom"]),
    custom_theme: customThemeSchema.nullable(),
    ambient_intensity: z.number().min(0.3).max(1.4),
    reduced_motion: z.boolean(),
    density: z.enum(["comfortable", "compact"]),
    dashboard: dashboardLayoutSchema.nullable(),
  })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "patch vazio" });

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
