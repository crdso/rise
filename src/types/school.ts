export type SchoolTaskType = "exam" | "assignment" | "homework" | "presentation" | "project" | "other";
export type SchoolPriority = "low" | "medium" | "high";

/** Status persistido. */
export type SchoolBaseStatus = "not_started" | "in_progress" | "done" | "archived";
/** Status de negócio: "overdue" é DERIVADO, nunca gravado. */
export type SchoolStatus = SchoolBaseStatus | "overdue";

export type SchoolTask = {
  id: string;
  user_id: string;
  workspace_id: string;
  subject_id?: string | null;
  /** nome da matéria resolvido para exibição */
  subject?: string | null;
  title: string;
  description?: string | null;
  notes?: string | null;
  type: SchoolTaskType;
  priority: SchoolPriority;
  status: SchoolBaseStatus;
  due_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type SchoolWorkspace = {
  id: string;
  user_id: string;
  name: string;
  year: number;
  status: "active" | "archived";
  archived_at?: string | null;
  created_at: string;
};

export type SchoolTaskInput = {
  title: string;
  subject?: string | null;
  description?: string | null;
  notes?: string | null;
  type: SchoolTaskType;
  priority: SchoolPriority;
  due_at?: string | null;
};

export const TYPE_LABEL: Record<SchoolTaskType, string> = {
  exam: "Prova",
  assignment: "Trabalho",
  homework: "Atividade",
  presentation: "Apresentação",
  project: "Projeto",
  other: "Outro",
};

export const STATUS_LABEL: Record<SchoolStatus, string> = {
  not_started: "A fazer",
  in_progress: "Em andamento",
  done: "Concluída",
  archived: "Arquivada",
  overdue: "Atrasada",
};

export const SCHOOL_PRIORITY_LABEL: Record<SchoolPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export const SCHOOL_PRIORITY_COLOR: Record<SchoolPriority, string> = {
  low: "#6B7280",
  medium: "#F59E0B",
  high: "#EF4444",
};
