import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function headerDate(d = new Date()) {
  return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
}

export const demoFinance = {
  balance: 4218.90,
  expenseMonth: 2483.72,
  incomeMonth: 3200,
  deltaVsPrev: -12, // %
  sparkline: [1800, 2100, 1950, 2300, 2483, 2200, 2400],
  biggestDay: { date: "18 de agosto", amount: 412, category: "Alimentação" },
  topCategory: "Alimentação",
  mostUsedAccount: "Nubank",
};

export const demoAccounts = [
  { id: "inter", name: "Inter", balance: 1842.5, type: "Banco Inter", color: "#FF6A30", logo: "/icons/banks/inter.svg", fallback: "I" },
  { id: "nubank", name: "Nubank", balance: 1320, type: "Nubank", color: "#820AD1", logo: "/icons/banks/nubank.svg", fallback: "Nu" },
  { id: "mp", name: "Mercado Pago", balance: 420.3, type: "Mercado Pago", color: "#00A9FF", logo: "/icons/banks/mercadopago.svg", fallback: "MP" },
  { id: "bb", name: "Banco do Brasil", balance: 636.1, type: "Banco do Brasil", color: "#FCDA2A", logo: "/icons/banks/bb.svg", fallback: "BB" },
];

export const demoAgendaToday = [
  { id: "1", time: "08:00", title: "Prova de Química", meta: "Ácidos e bases · Sala 3", kind: "school" as const },
  { id: "2", time: "14:30", title: "Reunião — projeto ENTEC", meta: "Sala 3 · com equipe", kind: "event" as const },
  { id: "3", time: "18:00", title: "Pagar João — R$ 70", meta: "Vence hoje · pendente", kind: "reminder" as const },
];

export const demoDebts = [
  { person: "João", amount: 70, due: "10/09", kind: "owed" as const, status: "pending" as const },
  { person: "Carlos", amount: 25, note: "lanche", kind: "receivable" as const, status: "pending" as const },
];

export const demoSchool = [
  { title: "Trabalho de História", due: "05/09", priority: "alta" as const, progress: 30 },
  { title: "Lista de Física", due: "08/09", priority: "média" as const, progress: 55 },
];

export const demoEvents = [
  { date: 5, title: "Entrega História", dot: "school" },
  { date: 8, title: "Prova Química", dot: "school" },
  { date: 12, title: "Fatura Nubank", dot: "finance" },
];
