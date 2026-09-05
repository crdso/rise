import { z } from "zod";

const nullableText = z.string().trim().max(500).nullable();
const nullableDateTime = z.string().datetime({ offset: true }).nullable();

const base = {
  confidence: z.number().min(0).max(1),
  missingFields: z.array(z.string().min(1).max(80)).max(8),
  clarification: nullableText,
};

export const parsedIntentSchema = z.discriminatedUnion("intent", [
  z.object({
    ...base,
    intent: z.literal("transaction"),
    data: z.object({
      type: z.enum(["expense", "income"]).nullable(), amount: z.number().positive().nullable(), description: nullableText,
      occurredAt: nullableDateTime, account: nullableText, category: nullableText, paymentMethod: nullableText, notes: nullableText,
    }).strict(),
  }).strict(),
  z.object({
    ...base,
    intent: z.literal("debt"),
    data: z.object({ kind: z.enum(["owed", "receivable"]).nullable(), person: nullableText, amount: z.number().positive().nullable(), description: nullableText, dueDate: z.string().date().nullable(), notes: nullableText }).strict(),
  }).strict(),
  z.object({
    ...base,
    intent: z.literal("reminder"),
    data: z.object({ title: nullableText, dueAt: nullableDateTime, notes: nullableText, priority: z.enum(["low", "medium", "high"]).nullable(), recurrence: z.enum(["none", "daily", "weekly", "monthly"]).nullable() }).strict(),
  }).strict(),
  z.object({
    ...base,
    intent: z.literal("event"),
    data: z.object({ title: nullableText, description: nullableText, startsAt: nullableDateTime, endsAt: nullableDateTime, category: z.enum(["personal", "school", "finance", "important"]).nullable(), allDay: z.boolean().nullable() }).strict(),
  }).strict(),
  z.object({
    ...base,
    intent: z.literal("school_task"),
    data: z.object({ title: nullableText, subject: nullableText, description: nullableText, type: z.enum(["homework", "assignment", "exam", "presentation", "project", "other"]).nullable(), priority: z.enum(["low", "medium", "high"]).nullable(), dueAt: nullableDateTime }).strict(),
  }).strict(),
  z.object({
    ...base,
    intent: z.literal("important"),
    data: z.object({ title: nullableText, content: nullableText, tag: nullableText, pinned: z.boolean().nullable(), remindAt: nullableDateTime }).strict(),
  }).strict(),
  z.object({ ...base, intent: z.literal("unknown"), data: z.object({}).strict() }).strict(),
]);

export type ParsedIntent = z.infer<typeof parsedIntentSchema>;
export type IntentType = ParsedIntent["intent"];
export type ParseContext = { now: string; timezone: "America/Sao_Paulo" };
export type AccountResolution = { status: "existing"; id: string; name: string } | { status: "create"; name: string; color: string | null; brandDomain: string | null; brandKey: string | null } | null;
export type ResolvedParsedIntent = ParsedIntent & { accountResolution?: AccountResolution };
