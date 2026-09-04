import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";
import type { ParsedIntent } from "./types";

// Desacoplado: AIParserService não conhece UI nem DB, apenas delega ao provider e valida.
export class AIParserService {
  constructor(private provider: AIProvider = new MockAIProvider()) {}
  async parse(input: string): Promise<ParsedIntent> {
    const trimmed = input.trim();
    if (!trimmed) throw new Error("Entrada vazia");
    const intent = await this.provider.parse(trimmed);
    // validação mínima estrutural
    if (!intent.type) throw new Error("Parser não retornou tipo");
    return intent;
  }
  setProvider(p: AIProvider) { this.provider = p; }
}
