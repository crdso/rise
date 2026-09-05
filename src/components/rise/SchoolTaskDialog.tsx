"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toSaoPauloDateTimeLocal, fromSaoPauloDateTimeLocal } from "@/lib/timezone";
import {
  TYPE_LABEL,
  SCHOOL_PRIORITY_LABEL,
  SCHOOL_PRIORITY_COLOR,
  type SchoolPriority,
  type SchoolTask,
  type SchoolTaskInput,
  type SchoolTaskType,
} from "@/types/school";

const TYPES: SchoolTaskType[] = ["homework", "assignment", "exam", "presentation", "project", "other"];
const PRIORITIES: SchoolPriority[] = ["low", "medium", "high"];

export function SchoolTaskDialog({
  open,
  onClose,
  onSave,
  initial,
  subjects = [],
  draft,
}: {
  open: boolean;
  onClose: () => void;
  /** Deve REJEITAR em caso de falha: o dialog só fecha após sucesso. */
  onSave: (data: SchoolTaskInput) => Promise<void>;
  initial?: SchoolTask | null;
  subjects?: string[];
  draft?: Partial<SchoolTaskInput>;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SchoolTaskType>("homework");
  const [priority, setPriority] = useState<SchoolPriority>("medium");
  const [due, setDue] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setSubject(initial.subject || "");
      setDescription(initial.description || "");
      setType(initial.type);
      setPriority(initial.priority);
      setDue(initial.due_at ? toSaoPauloDateTimeLocal(initial.due_at) : "");
    } else {
      setTitle(draft?.title || "");
      setSubject(draft?.subject || "");
      setDescription(draft?.description || "");
      setType(draft?.type || "homework");
      setPriority(draft?.priority || "medium");
      setDue(draft?.due_at ? toSaoPauloDateTimeLocal(draft.due_at) : "");
    }
    setErr("");
  }, [open, initial, draft]);

  const submit = async () => {
    if (loading) return;
    if (title.trim().length < 2) {
      setErr("Título mínimo 2 caracteres");
      return;
    }
    let due_at: string | null = null;
    if (due) {
      try {
        due_at = fromSaoPauloDateTimeLocal(due);
      } catch {
        setErr("Data inválida");
        return;
      }
    }
    setLoading(true);
    setErr("");
    try {
      await onSave({
        title: title.trim(),
        subject: subject.trim() || null,
        description: description.trim() || null,
        type,
        priority,
        due_at,
      });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!loading) onClose();
            }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[480px] max-h-[88dvh] overflow-auto rounded-t-[22px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--elevated)] p-5 pb-[calc(1rem+var(--sab))] shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
          >
            <div className="mx-auto lg:hidden h-1 w-9 rounded-full bg-[var(--border-strong)] mb-4" />

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{initial ? "Editar atividade" : "Nova atividade"}</h3>
              <button
                onClick={onClose}
                disabled={loading}
                className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center disabled:opacity-50"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Título</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Lista de exercícios cap. 7"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Matéria</label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Química"
                    list="school-subjects"
                    className="mt-1"
                  />
                  <datalist id="school-subjects">
                    {subjects.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Entrega</label>
                  <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1" />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Tipo</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      aria-pressed={type === t}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium ${
                        type === t
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Prioridade</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      aria-pressed={priority === p}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium ${
                        priority === p ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--card-soft)]"
                      }`}
                      style={{ borderColor: priority === p ? SCHOOL_PRIORITY_COLOR[p] : undefined }}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full mr-1"
                        style={{ background: SCHOOL_PRIORITY_COLOR[p] }}
                      />
                      {SCHOOL_PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
                  placeholder="Opcional"
                />
              </div>

              {err && <p className="text-xs text-red-400">{err}</p>}

              <Button onClick={submit} disabled={loading} aria-busy={loading} className="w-full rounded-full">
                {loading ? "Salvando..." : initial ? "Salvar" : "Criar atividade"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
