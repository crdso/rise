/**
 * Dados de exemplo do MODO DEMONSTRAÇÃO.
 *
 * IMPORTANTE: nada aqui é exibido automaticamente. Este módulo só roda quando
 * o usuário clica em "Carregar dados de demonstração", e apenas quando o
 * Supabase NÃO está configurado. Em modo Supabase a função se recusa a rodar.
 *
 * O painel nunca mostra dinheiro inventado: sem dados, mostra R$ 0,00 ou um
 * estado vazio.
 */
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { financeService } from "@/lib/services/finance";
import { debtService } from "@/lib/services/debtService";
import { calendarService } from "@/lib/services/calendarService";
import { reminderService } from "@/lib/services/reminderService";
import { saoPauloTodayKey, addDaysToDateKey, isoFromDateKeyAndTime } from "@/lib/timezone";
import type { AccountType } from "@/types/finance";

const ACCOUNTS: Array<{ name: string; type: AccountType; color: string; initial: number }> = [
  { name: "Nubank", type: "checking", color: "#820AD1", initial: 320.55 },
  { name: "Inter", type: "checking", color: "#FF6A30", initial: 148.2 },
  { name: "Carteira", type: "cash", color: "#6B7280", initial: 60 },
];

type SeedTx = { day: number; type: "expense" | "income"; amount: number; desc: string; cat: string; account: number; time: string };

const TXS: SeedTx[] = [
  { day: -27, type: "income", amount: 1200, desc: "Mesada", cat: "Renda", account: 0, time: "09:00" },
  { day: -25, type: "expense", amount: 62.4, desc: "Mercado", cat: "Alimentação", account: 0, time: "18:20" },
  { day: -22, type: "expense", amount: 34.9, desc: "Lanche", cat: "Alimentação", account: 2, time: "12:40" },
  { day: -20, type: "expense", amount: 89.9, desc: "Passe escolar", cat: "Transporte", account: 1, time: "07:15" },
  { day: -18, type: "expense", amount: 129.9, desc: "Tênis", cat: "Compras", account: 0, time: "16:05" },
  { day: -15, type: "expense", amount: 21.9, desc: "Assinatura de música", cat: "Assinaturas", account: 0, time: "10:00" },
  { day: -13, type: "expense", amount: 47.3, desc: "Material de escola", cat: "Escola", account: 1, time: "14:30" },
  { day: -11, type: "expense", amount: 55, desc: "Cinema", cat: "Lazer", account: 2, time: "20:10" },
  { day: -9, type: "expense", amount: 73.2, desc: "Mercado", cat: "Alimentação", account: 0, time: "19:00" },
  { day: -7, type: "income", amount: 180, desc: "Freela de design", cat: "Renda", account: 1, time: "15:00" },
  { day: -6, type: "expense", amount: 28.5, desc: "Uber", cat: "Transporte", account: 0, time: "22:30" },
  { day: -4, type: "expense", amount: 39.9, desc: "Lanche com a turma", cat: "Alimentação", account: 2, time: "13:10" },
  { day: -2, type: "expense", amount: 112.7, desc: "Fone de ouvido", cat: "Tecnologia", account: 0, time: "11:25" },
  { day: -1, type: "expense", amount: 18.9, desc: "Café", cat: "Alimentação", account: 2, time: "08:45" },
];

/** Popula o modo demonstração. Não faz nada se o Supabase estiver configurado. */
export async function seedDemoData(): Promise<void> {
  if (isSupabaseConfigured()) {
    throw new Error("Dados de demonstração só existem no modo demonstração.");
  }

  const today = saoPauloTodayKey();
  const accounts = [];
  for (const a of ACCOUNTS) {
    accounts.push(
      await financeService.createAccount({
        name: a.name,
        type: a.type,
        icon: null,
        color: a.color,
        brand_domain: null,
        brand_key: null,
        initial_balance: a.initial,
        is_active: true,
      })
    );
  }

  for (const t of TXS) {
    const cat = financeService.ensureCategory(t.cat);
    await financeService.createTransaction({
      account_id: accounts[t.account]?.id ?? null,
      category_id: cat.id,
      type: t.type,
      amount: t.amount,
      description: t.desc,
      notes: null,
      payment_method: null,
      is_recurring: false,
      occurred_at: isoFromDateKeyAndTime(addDaysToDateKey(today, t.day), t.time),
    });
  }

  await debtService.createDebt({
    person: "João",
    description: "rachar a corrida",
    kind: "owed",
    amount: 70,
    due_date: addDaysToDateKey(today, 6),
    notes: null,
    is_installment: false,
  });
  await debtService.createDebt({
    person: "Carlos",
    description: "lanche",
    kind: "receivable",
    amount: 25,
    due_date: addDaysToDateKey(today, -3),
    notes: null,
    is_installment: false,
  });

  await calendarService.create({
    title: "Prova de Química",
    description: "Ácidos e bases",
    category: "school",
    starts_at: isoFromDateKeyAndTime(addDaysToDateKey(today, 1), "08:00"),
    ends_at: null,
    all_day: false,
  });
  await calendarService.create({
    title: "Reunião do projeto",
    description: null,
    category: "personal",
    starts_at: isoFromDateKeyAndTime(today, "14:30"),
    ends_at: null,
    all_day: false,
  });

  await reminderService.create({
    title: "Pagar o João",
    notes: null,
    due_at: isoFromDateKeyAndTime(addDaysToDateKey(today, 6), "18:00"),
    priority: "high",
    recurrence: "none",
  });
  await reminderService.create({
    title: "Renovar o passe escolar",
    notes: null,
    due_at: isoFromDateKeyAndTime(today, "19:00"),
    priority: "medium",
    recurrence: "monthly",
  });
}
