import type { AIProvider } from "./provider";
import type { ParseContext, ParsedIntent } from "./types";

export class MockAIProvider implements AIProvider {
  name = "mock" as const;

  async parse(input: string, context: ParseContext): Promise<ParsedIntent> {
    const lower = input.toLowerCase();
    const amountMatch = lower.match(/(\d+[.,]?\d*)/);
    const amount = amountMatch ? Number(amountMatch[1].replace(",", ".")) : null;
    const today = context.now;

    if (/\b(mandei|transferi|passei|joguei|movi)\b/.test(lower)) {
      const accounts = input.match(/\b(?:do|da|de)\s+(.+?)\s+(?:pro|pra|para(?:\s+[oa])?|no|na)\s+(.+?)(?:\s+(?:hoje|agora))?\s*$/i);
      return { intent: "transfer", confidence: accounts && amount ? 0.85 : 0.5,
        missingFields: [...(amount ? [] : ["amount"]), ...(accounts ? [] : ["fromAccount", "toAccount"])], clarification: null,
        data: { amount, fromAccount: accounts?.[1] ?? null, toAccount: accounts?.[2] ?? null, occurredAt: today, notes: null } };
    }

    if (/(gastei|paguei|comprei)/.test(lower)) return { intent: "transaction", confidence: 0.72, missingFields: amount ? [] : ["amount"], clarification: null, data: { type: "expense", amount, description: input, occurredAt: lower.includes("hoje") ? today : null, account: null, category: lower.includes("almoç") || lower.includes("lanche") ? "Alimentação" : null, paymentMethod: null, notes: null } };
    if (/(recebi|receber)/.test(lower)) return { intent: "transaction", confidence: 0.7, missingFields: amount ? [] : ["amount"], clarification: null, data: { type: "income", amount, description: input, occurredAt: null, account: null, category: null, paymentMethod: null, notes: null } };
    if (/(lembra|lembrete)/.test(lower)) return { intent: "reminder", confidence: 0.68, missingFields: [], clarification: null, data: { title: input, dueAt: null, notes: null, priority: "medium", recurrence: "none" } };
    if (/(prova|trabalho|atividade)/.test(lower)) return { intent: "school_task", confidence: 0.68, missingFields: [], clarification: null, data: { title: input, subject: null, description: null, type: lower.includes("prova") ? "exam" : "homework", priority: "medium", dueAt: null } };
    if (/(devo|dever)/.test(lower)) return { intent: "debt", confidence: 0.65, missingFields: amount ? ["person"] : ["amount", "person"], clarification: "Confirme a pessoa e o valor antes de salvar.", data: { kind: "owed", person: null, amount, description: null, dueDate: null, notes: null } };
    if (/(anota|anote|lembrar)/.test(lower)) return { intent: "important", confidence: 0.6, missingFields: [], clarification: null, data: { title: input, content: null, tag: null, pinned: false, remindAt: null } };
    return { intent: "unknown", confidence: 0.3, missingFields: [], clarification: "Não entendi o que você quer adicionar. Tente mencionar um gasto, lembrete, evento, dívida ou anotação.", data: {} };
  }
}
