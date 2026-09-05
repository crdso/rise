import type { ParseContext, ParsedIntent } from "./types";

export interface AIProvider {
  name: "openai" | "mock";
  parse(input: string, context: ParseContext): Promise<ParsedIntent>;
}
