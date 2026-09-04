import type { AIProvider } from "./provider";
import type { ParsedIntent } from "./types";

export class MockAIProvider implements AIProvider {
  name = "mock";
  async parse(input: string): Promise<ParsedIntent> {
    const lower = input.toLowerCase();
    const amountMatch = lower.match(/(\d+[.,]?\d*)/);
    const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : undefined;
    // simple heuristics
    if (lower.includes("gastei") || lower.includes("paguei") || lower.includes("comprei") || lower.includes("gasto")) {
      return {
        type: "expense",
        confidence: 0.86,
        amount,
        category: lower.includes("mercado") ? "Mercado" : lower.includes("lanche") ? "Alimentação" : "Outros",
        account: lower.includes("nubank") ? "Nubank" : lower.includes("inter") ? "Inter" : undefined,
        description: input,
        date: new Date().toISOString(),
        raw: input,
      };
    }
    if (lower.includes("recebi") || lower.includes("receber")) {
      return { type: "income", confidence: 0.8, amount, description: input, date: new Date().toISOString(), raw: input };
    }
    if (lower.includes("prova") || lower.includes("trabalho") || lower.includes("atividade")) {
      return { type: "school_task", confidence: 0.78, title: input.slice(0, 60), description: input, date: new Date().toISOString(), raw: input };
    }
    if (lower.includes("lembra") || lower.includes("lembrete")) {
      const amb = lower.includes("pagar") && lower.includes("pro ");
      return { type: "reminder", confidence: amb ? 0.55 : 0.82, title: input.slice(0, 60), ambiguous: amb, alternatives: amb ? ["debt_owed", "reminder"] : undefined, raw: input };
    }
    if (lower.includes("devo") || lower.includes("dever")) {
      return { type: "debt_owed", confidence: 0.75, amount, person: "João", raw: input };
    }
    return { type: "note", confidence: 0.6, description: input, raw: input };
  }
}
