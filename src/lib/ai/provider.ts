import type { ParsedIntent } from "./types";

export interface AIProvider {
  name: string;
  parse(input: string): Promise<ParsedIntent>;
}
