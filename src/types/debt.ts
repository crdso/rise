export type DebtKind = "owed" | "receivable";
export type DebtStatus = "pending" | "partial" | "paid" | "overdue";

export type Debt = {
  id: string;
  user_id: string;
  person: string;
  description?: string | null;
  kind: DebtKind;
  amount: number; // total
  due_date?: string | null; // date (YYYY-MM-DD)
  notes?: string | null;
  status: DebtStatus;
  is_installment: boolean;
  installments_count?: number | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type DebtPayment = {
  id: string;
  user_id: string;
  debt_id: string;
  amount: number;
  paid_at: string; // timestamptz
  notes?: string | null;
  transaction_id?: string | null;
  created_at: string;
};

export type DebtInstallment = {
  id: string;
  user_id: string;
  debt_id: string;
  installment_number: number;
  amount: number;
  due_date: string; // date
  status: "pending" | "paid" | "overdue";
  created_at: string;
};
