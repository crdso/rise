import "server-only";
import type { AIProvider } from "./provider";
import { parsedIntentSchema, type ParseContext, type ParsedIntent } from "./types";

const MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";

type ResponsesPayload = { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };

const nullableText = { anyOf: [{ type: "string" }, { type: "null" }] };
const nullableDateTime = { anyOf: [{ type: "string", format: "date-time" }, { type: "null" }] };
const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] };
const nullableBoolean = { anyOf: [{ type: "boolean" }, { type: "null" }] };
const nullableEnum = (values: string[]) => ({ anyOf: [{ type: "string", enum: values }, { type: "null" }] });
const strictObject = (properties: Record<string, unknown>) => ({ type: "object", additionalProperties: false, required: Object.keys(properties), properties });

// Responses Structured Outputs requires an object at the schema root. The
// intent-specific union lives inside data and is checked again by Zod below.
const responseSchema = strictObject({
  intent: { type: "string", enum: ["transaction", "transfer", "debt", "reminder", "event", "school_task", "important", "unknown"] },
  confidence: { type: "number", minimum: 0, maximum: 1 },
  missingFields: { type: "array", items: { type: "string" }, maxItems: 8 },
  clarification: nullableText,
  data: {
    anyOf: [
      strictObject({ amount: nullableNumber, fromAccount: nullableText, toAccount: nullableText, occurredAt: nullableDateTime, notes: nullableText }),
      strictObject({ type: nullableEnum(["expense", "income"]), amount: nullableNumber, description: nullableText, occurredAt: nullableDateTime, account: nullableText, category: nullableText, paymentMethod: nullableText, notes: nullableText }),
      strictObject({ kind: nullableEnum(["owed", "receivable"]), person: nullableText, amount: nullableNumber, description: nullableText, dueDate: { anyOf: [{ type: "string", format: "date" }, { type: "null" }] }, notes: nullableText }),
      strictObject({ title: nullableText, dueAt: nullableDateTime, notes: nullableText, priority: nullableEnum(["low", "medium", "high"]), recurrence: nullableEnum(["none", "daily", "weekly", "monthly"]) }),
      strictObject({ title: nullableText, description: nullableText, startsAt: nullableDateTime, endsAt: nullableDateTime, category: nullableEnum(["personal", "school", "finance", "important"]), allDay: nullableBoolean }),
      strictObject({ title: nullableText, subject: nullableText, description: nullableText, type: nullableEnum(["homework", "assignment", "exam", "presentation", "project", "other"]), priority: nullableEnum(["low", "medium", "high"]), dueAt: nullableDateTime }),
      strictObject({ title: nullableText, content: nullableText, tag: nullableText, pinned: nullableBoolean, remindAt: nullableDateTime }),
      strictObject({}),
    ],
  },
});

type OpenAIFailure = {
  stage: "openai_request" | "structured_output" | "json_parse" | "zod_validation";
  status?: number;
  errorType?: string;
  errorCode?: string;
  param?: string;
  requestId?: string;
};

class OpenAIProviderError extends Error {
  constructor(readonly details: OpenAIFailure) {
    super("OpenAI parse failed");
  }
}

function logFailure(details: OpenAIFailure) {
  // This deliberately excludes credentials, request headers, prompts, and model output.
  console.error("[rise-openai]", JSON.stringify(details));
}

export class OpenAIProvider implements AIProvider {
  name = "openai" as const;

  async parse(input: string, context: ParseContext): Promise<ParsedIntent> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI indisponível");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          store: false,
          max_output_tokens: 900,
          input: [
            { role: "developer", content: "You extract one RISE action from Brazilian Portuguese. Return only the requested JSON. Never execute actions. Timezone is America/Sao_Paulo. Current local date/time is " + context.now + ". Informal Brazilian dates: hj means hoje, agr means agora, ont means ontem, and amanha means amanhã; resolve weekday names such as sexta and sábado from the current date. Use intent transfer for movements between two accounts owned by the user, including mandei 233 do inter pro mercado pago, transferi 100 do nubank pro inter, passei 50 reais do BB pra carteira, joguei 200 do mercado pago no nubank, movi 300 da conta X para conta Y. Extract fromAccount and toAccount separately, preserve their names, and never classify an internal transfer as expense or income. If ownership or direction is ambiguous, ask for clarification. For transactions and transfers, use the current local date-time when no date is specified; do not list occurredAt as missing. For reminders, events, and school tasks do not invent dates or times. Use ISO 8601 strings with -03:00 offsets for date-times and YYYY-MM-DD for debt due dates. For generic income, use description Receita (or Salário when explicit) and do not infer expense categories such as Alimentação. Set every unavailable value to null, list required missing fields, and use unknown plus a clarification for ambiguous text." },
            { role: "user", content: input },
          ],
          text: { format: { type: "json_schema", name: "rise_intent", strict: true, schema: responseSchema } },
        }),
      });
      const requestId = response.headers.get("x-request-id") ?? response.headers.get("request-id") ?? undefined;
      if (!response.ok) {
        const error = await response.json().catch(() => null) as { error?: { type?: string; code?: string; param?: string } } | null;
        throw new OpenAIProviderError({ stage: "openai_request", status: response.status, errorType: error?.error?.type, errorCode: error?.error?.code, param: error?.error?.param, requestId });
      }
      const payload = await response.json().catch(() => {
        throw new OpenAIProviderError({ stage: "json_parse", status: response.status, requestId });
      }) as ResponsesPayload;
      const output = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
      if (!output) throw new OpenAIProviderError({ stage: "structured_output", status: response.status, requestId });
      let parsed: unknown;
      try {
        parsed = JSON.parse(output);
      } catch {
        throw new OpenAIProviderError({ stage: "json_parse", status: response.status, requestId });
      }
      try {
        return parsedIntentSchema.parse(parsed);
      } catch {
        throw new OpenAIProviderError({ stage: "zod_validation", status: response.status, requestId });
      }
    } catch (error) {
      if (error instanceof OpenAIProviderError) logFailure(error.details);
      else logFailure({ stage: "openai_request", errorType: error instanceof Error ? error.name : "unknown" });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
