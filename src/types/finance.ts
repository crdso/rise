export type AccountType = "checking" | "wallet" | "cash" | "card" | "savings" | "other";
export type Account = {
  id: string;
  name: string;
  icon?: string | null;
  type: AccountType;
  color?: string | null;
  initial_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  created_at: string;
};

export type TxType = "expense" | "income";
export type Transaction = {
  id: string;
  account_id: string | null;
  category_id: string | null;
  type: TxType;
  amount: number;
  description?: string | null;
  notes?: string | null;
  payment_method?: string | null;
  is_recurring: boolean;
  occurred_at: string; // timestamptz ISO
  created_at: string;
  updated_at: string;
  // joined
  account?: Account | null;
  category?: Category | null;
};

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entity_id?: string | null;
  before?: unknown;
  after?: unknown;
  origin: "web" | "whatsapp" | "ai" | "system";
  created_at: string;
};
