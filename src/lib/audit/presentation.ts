import {
  ReceiptText,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Wallet,
  HandCoins,
  CircleDollarSign,
  CalendarDays,
  Bell,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Settings,
  Shield,
  LogIn,
  Bot,
  Cpu,
  Tag,
  Archive,
  Pencil,
  Trash2,
  Plus,
  type LucideIcon,
} from "lucide-react";
import type { AuditEntry } from "@/types/finance";

/**
 * Apresentação do registro de auditoria.
 * Ícones do Lucide mapeados por entidade e refinados pelo verbo da ação —
 * nenhum emoji é usado como ícone de produto.
 */

export type AuditOrigin = "web" | "whatsapp" | "ai" | "system";

export const ORIGIN_LABEL: Record<AuditOrigin, string> = {
  web: "Web",
  whatsapp: "WhatsApp",
  ai: "IA",
  system: "Sistema",
};

export const ORIGIN_ICON: Record<AuditOrigin, LucideIcon> = {
  web: LogIn,
  whatsapp: Bell,
  ai: Bot,
  system: Cpu,
};

export const ENTITY_LABEL: Record<string, string> = {
  transaction: "Transação",
  account: "Conta",
  category: "Categoria",
  debt: "Dívida",
  debt_payment: "Pagamento",
  event: "Evento",
  reminder: "Lembrete",
  school_workspace: "Escola",
  school_task: "Atividade",
  important_item: "Importante",
  settings: "Configurações",
  session: "Sessão",
};

const ENTITY_ICON: Record<string, LucideIcon> = {
  transaction: ReceiptText,
  account: Landmark,
  category: Tag,
  debt: HandCoins,
  debt_payment: CircleDollarSign,
  event: CalendarDays,
  reminder: Bell,
  school_workspace: GraduationCap,
  school_task: BookOpen,
  important_item: Shield,
  settings: Settings,
  session: LogIn,
};

/** Ícone da entrada: entidade primeiro, refinado pelo verbo quando ajuda. */
export function auditIcon(entry: Pick<AuditEntry, "entity" | "action">): LucideIcon {
  const a = entry.action.toLowerCase();

  if (entry.entity === "transaction") {
    if (a.includes("despesa")) return ArrowUpRight;
    if (a.includes("receita")) return ArrowDownLeft;
    return ReceiptText;
  }
  if (entry.entity === "account") {
    if (a.includes("desativou") || a.includes("ativou")) return Wallet;
    return Landmark;
  }
  if (entry.entity === "reminder") {
    if (a.includes("conclu")) return CheckCircle2;
    return Bell;
  }
  if (a.includes("arquivou")) return Archive;
  if (a.includes("excluiu")) return Trash2;
  if (a.includes("editou")) return Pencil;
  if (a.includes("criou")) return Plus;

  return ENTITY_ICON[entry.entity] ?? Cpu;
}

/** Tom da entrada — exclusões e arquivamentos merecem destaque discreto. */
export function auditTone(entry: Pick<AuditEntry, "action" | "entity" | "origin">): "neutral" | "positive" | "danger" | "info" | "security" | "ai" | "settings" | "finance" {
  const a = entry.action.toLowerCase();
  if (a.includes("excluiu")) return "danger";
  if (a.includes("conclu") || a.includes("quitou") || a.includes("registrou um pagamento")) return "positive";
  if (a.includes("criou")) return "positive";
  if (entry.origin === "ai") return "ai";
  if (entry.entity === "session") return "security";
  if (entry.entity === "settings") return "settings";
  if (["transaction", "account", "debt", "debt_payment"].includes(entry.entity)) return "finance";
  if (a.includes("editou") || a.includes("atualizou")) return "info";
  return "neutral";
}

/* ------------------------------------------------------------------ */
/* Diff legível                                                        */
/* ------------------------------------------------------------------ */

const FIELD_LABEL: Record<string, string> = {
  title: "Título",
  description: "Descrição",
  notes: "Notas",
  amount: "Valor",
  type: "Tipo",
  name: "Nome",
  person: "Pessoa",
  kind: "Natureza",
  status: "Situação",
  priority: "Prioridade",
  category: "Categoria",
  category_id: "Categoria",
  account_id: "Conta",
  occurred_at: "Data",
  starts_at: "Início",
  ends_at: "Fim",
  due_at: "Vencimento",
  due_date: "Vencimento",
  all_day: "Dia inteiro",
  is_active: "Ativa",
  is_recurring: "Recorrente",
  recurrence: "Repetição",
  initial_balance: "Saldo inicial",
  paid_amount: "Valor pago",
  archived_at: "Arquivado em",
  completed_at: "Concluído em",
  brand_domain: "Marca",
  color: "Cor",
  icon: "Ícone",
};

/** Campos que são ruído puro num diff de produto. */
const HIDDEN_FIELDS = new Set(["id", "user_id", "created_at", "updated_at", "parent_id"]);

export type AuditChange = { field: string; label: string; before: unknown; after: unknown };

export function auditChanges(entry: Pick<AuditEntry, "before" | "after">): AuditChange[] {
  const before = (entry.before ?? null) as Record<string, unknown> | null;
  const after = (entry.after ?? null) as Record<string, unknown> | null;
  if (!before || !after || typeof before !== "object" || typeof after !== "object") return [];

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: AuditChange[] = [];
  for (const k of keys) {
    if (HIDDEN_FIELDS.has(k)) continue;
    const b = before[k];
    const a = after[k];
    if (JSON.stringify(b) === JSON.stringify(a)) continue;
    out.push({ field: k, label: FIELD_LABEL[k] ?? k, before: b, after: a });
  }
  return out;
}

/** Formata um valor de campo para leitura humana. */
export function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "sim" : "não";
  if (typeof value === "number") {
    if (/(amount|balance|paid)/.test(field))
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    return String(value);
  }
  if (typeof value === "string") {
    // timestamps ISO viram data legível no fuso de São Paulo
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(value));
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      return `${d}/${m}/${y}`;
    }
    return value;
  }
  return JSON.stringify(value);
}

/** Resumo humano de uma entrada, usado na lista. */
export function auditSummary(entry: AuditEntry): string {
  const after = (entry.after ?? null) as Record<string, unknown> | null;
  const before = (entry.before ?? null) as Record<string, unknown> | null;
  const src = after ?? before;
  if (!src || typeof src !== "object") return "";

  const parts: string[] = [];
  const title = src.title ?? src.name ?? src.person ?? src.description;
  if (typeof title === "string" && title.trim()) parts.push(title.trim());
  if (typeof src.amount === "number") {
    parts.push(src.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
  }
  return parts.join(" · ");
}
