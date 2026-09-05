import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";
import { parsedIntentSchema, type ParseContext, type ParsedIntent } from "./types";

// The service remains provider-agnostic; routes choose OpenAI or the controlled fallback.
export class AIParserService {
  constructor(private provider: AIProvider = new MockAIProvider()) {}

  async parse(input: string, context: ParseContext): Promise<ParsedIntent> {
    const trimmed = input.trim();
    if (!trimmed) throw new Error("Entrada vazia");
    return parsedIntentSchema.parse(await this.provider.parse(trimmed, context));
  }
}
