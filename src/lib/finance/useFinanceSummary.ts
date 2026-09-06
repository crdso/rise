"use client";
import { useEffect, useState } from "react";
import { useFinanceStore } from "@/lib/store/financeStore";

type FinanceSummary = { totalBalance: number; accountBalances: Record<string, number>; month: { income: number; expense: number; count: number } };

// The paginated history may contain only one transfer leg. Always refresh the
// authoritative aggregate after a financial write instead of summing that page.
export function useFinanceSummary(month: string) {
  const transactions = useFinanceStore(state => state.transactions);
  const accounts = useFinanceStore(state => state.accounts);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/finance/summary?month=${month}`, { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then(payload => { if (!controller.signal.aborted) setSummary(payload?.data ?? null); })
      .catch(() => { if (!controller.signal.aborted) setSummary(null); });
    return () => controller.abort();
  }, [month, transactions, accounts]);
  return summary;
}
