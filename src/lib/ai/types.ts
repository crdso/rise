export type IntentType = "expense" | "income" | "reminder" | "event" | "school_task" | "debt_owed" | "debt_receivable" | "note";

export interface ParsedIntent {
  type: IntentType;
  confidence: number;
  amount?: number;
  category?: string;
  account?: string;
  description?: string;
  date?: string; // ISO
  time?: string;
  person?: string;
  title?: string;
  priority?: "low" | "medium" | "high";
  ambiguous?: boolean;
  alternatives?: IntentType[];
  raw: string;
}
