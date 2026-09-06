import { NextResponse } from "next/server";
import { z } from "zod";
import { AIParserService } from "@/lib/ai/parser";
import { MockAIProvider } from "@/lib/ai/mock-provider";
import { OpenAIProvider } from "@/lib/ai/openai-provider";
import { createClient } from "@/lib/supabase/server";
import { FINANCIAL_BRANDS, normalizeName } from "@/lib/brands/registry";
import type { AccountResolution, ParsedIntent } from "@/lib/ai/types";
import { resolveTransferAccount } from "@/lib/ai/transfer-accounts";

const requestSchema = z.object({ input: z.string().trim().min(1).max(1_000) }).strict();
const requestsByUser = new Map<string, number[]>();
const RATE_LIMIT = 12;
const WINDOW_MS = 60_000;

function isRateLimited(userId: string) {
  const now = Date.now();
  const recent = (requestsByUser.get(userId) ?? []).filter((timestamp) => timestamp > now - WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  requestsByUser.set(userId, recent);
  return false;
}

function knownBrand(name: string) {
  const normalized = normalizeName(name);
  return Object.entries(FINANCIAL_BRANDS).find(([, brand]) => normalizeName(brand.name) === normalized || brand.aliases.some((alias) => normalizeName(alias) === normalized));
}

function resolveAccount(name: string, accounts: Array<{ id: string; name: string }>): AccountResolution {
  const requestedBrand = knownBrand(name);
  const existing = accounts.find((account) => {
    if (normalizeName(account.name) === normalizeName(name)) return true;
    const accountBrand = knownBrand(account.name);
    return !!requestedBrand && !!accountBrand && requestedBrand[0] === accountBrand[0];
  });
  if (existing) return { status: "existing", id: existing.id, name: existing.name };
  if (requestedBrand) {
    const [brandKey, brand] = requestedBrand;
    return { status: "create", name: brand.name, color: brand.color, brandDomain: brand.domain, brandKey };
  }
  return { status: "create", name: name.trim(), color: null, brandDomain: null, brandKey: null };
}

function normalizeTransaction(result: ParsedIntent, input: string, now: string): ParsedIntent {
  if (result.intent === "transfer") return { ...result, missingFields: result.missingFields.filter(field => field !== "occurredAt"), data: { ...result.data, occurredAt: result.data.occurredAt || now } };
  if (result.intent !== "transaction") return result;
  const lower = input.toLowerCase();
  const isIncome = result.data.type === "income";
  const description = isIncome && /^(ganho|ganhei|recebi)$/i.test(result.data.description || "")
    ? (/(sal[aá]rio|pagamento)/.test(lower) ? "Salário" : "Receita")
    : result.data.description;
  const category = isIncome && result.data.category && /aliment|mercado|lanche/i.test(result.data.category)
    ? null
    : result.data.category;
  return {
    ...result,
    missingFields: result.missingFields.filter((field) => field !== "occurredAt"),
    data: { ...result.data, occurredAt: result.data.occurredAt || now, description, category },
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const claimsResult = await supabase?.auth.getClaims();
  const userId = claimsResult?.data?.claims?.sub;
  if (typeof userId !== "string") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isRateLimited(userId)) return NextResponse.json({ error: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });

  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Texto inválido." }, { status: 400 });

  const now = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "medium", hour12: false }).format(new Date()).replace(" ", "T") + "-03:00";
  const provider = process.env.OPENAI_API_KEY ? new OpenAIProvider() : new MockAIProvider();
  const startedAt = Date.now();
  const record = async (status: "success" | "error", result?: ParsedIntent) => {
    await supabase!.from("ai_interactions").insert({ user_id: userId, input: body.data.input, intent: result ?? null, confidence: result?.confidence ?? null, provider: provider.name, model: provider.name === "openai" ? (process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna") : "Interpretador local", status, latency_ms: Date.now() - startedAt }).then(() => {});
  };
  try {
    const parseInput = body.data.input
      .replace(/\bhj\b/gi, "hoje")
      .replace(/\bagr\b/gi, "agora")
      .replace(/\bont\b/gi, "ontem");
    const result = normalizeTransaction(await new AIParserService(provider).parse(parseInput, { now, timezone: "America/Sao_Paulo" }), body.data.input, now);
    let accountResolution: AccountResolution = null;
    if (result.intent === "transfer") {
      const { data: accounts, error } = await supabase!.from("accounts").select("id,name").eq("user_id", userId).eq("is_active", true);
      if (error) throw error;
      const fromAccountResolution = resolveTransferAccount(result.data.fromAccount, accounts ?? []);
      const toAccountResolution = resolveTransferAccount(result.data.toAccount, accounts ?? []);
      await record("success", result);
      return NextResponse.json({ data: { ...result, fromAccountResolution, toAccountResolution }, provider: provider.name });
    }
    if (result.intent === "transaction" && result.data.account) {
      const { data: accounts } = await supabase!.from("accounts").select("id,name").eq("user_id", userId).eq("is_active", true);
      accountResolution = resolveAccount(result.data.account, accounts ?? []);
    }
    await record("success", result);
    return NextResponse.json({ data: { ...result, accountResolution }, provider: provider.name });
  } catch {
    await record("error").catch(() => {});
    return NextResponse.json({ error: "Não foi possível interpretar o texto agora. Tente novamente." }, { status: 502 });
  }
}
