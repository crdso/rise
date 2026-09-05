"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toSaoPauloDateTimeLocal, fromSaoPauloDateTimeLocal } from "@/lib/timezone";
import type { Reminder, ReminderInput, ReminderPriority, ReminderRecurrence } from "@/types/reminder";
import { PRIORITY_COLOR, PRIORITY_LABEL, RECURRENCE_LABEL } from "@/types/reminder";

const PRIORITIES: ReminderPriority[] = ["low", "medium", "high"];
const RECURRENCES: ReminderRecurrence[] = ["none", "daily", "weekly", "monthly"];

export function ReminderDialog({
  open,
  onClose,
  onSave,
  initial,
  draft,
}: {
  open: boolean;
  onClose: () => void;
  /** Deve REJEITAR em caso de falha: o dialog só fecha após sucesso. */
  onSave: (data: ReminderInput) => Promise<void>;
  initial?: Reminder | null;
  draft?: Partial<ReminderInput>;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<ReminderPriority>("medium");
  const [recurrence, setRecurrence] = useState<ReminderRecurrence>("none");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setNotes(initial.notes || "");
      setDue(initial.due_at ? toSaoPauloDateTimeLocal(initial.due_at) : "");
      setPriority(initial.priority);
      setRecurrence(initial.recurrence || "none");
    } else {
      setTitle(draft?.title || "");
      setNotes(draft?.notes || "");
      setDue(draft?.due_at ? toSaoPauloDateTimeLocal(draft.due_at) : "");
      setPriority(draft?.priority || "medium");
      setRecurrence(draft?.recurrence || "none");
    }
    setErr("");
  }, [open, initial, draft]);

  const submit = async () => {
    if (loading) return; // impede duplo clique / duplo submit
    if (title.trim().length < 2) { setErr("Título mínimo 2 caracteres"); return; }
    if (recurrence !== "none" && !due) { setErr("Lembrete recorrente precisa de data"); return; }
    let due_at: string | null = null;
    if (due) {
      try { due_at = fromSaoPauloDateTimeLocal(due); } catch { setErr("Data inválida"); return; }
    }
    setLoading(true);
    setErr("");
    try {
      await onSave({ title: title.trim(), notes: notes.trim() || null, due_at, priority, recurrence });
      onClose(); // só fecha no sucesso
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
            onClick={() => { if (!loading) onClose(); }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[480px] max-h-[88dvh] overflow-auto rounded-t-[22px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--elevated)] p-5 pb-[calc(1rem+var(--sab))] shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{initial ? "Editar lembrete" : "Novo lembrete"}</h3>
              <button onClick={onClose} disabled={loading} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center disabled:opacity-50">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Título</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Pagar internet" className="mt-1" />
              </div>

              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Notas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm"
                  placeholder="Opcional"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Data e hora</label>
                <div className="mt-1 flex gap-2">
                  <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="flex-1" />
                  {due && (
                    <Button type="button" variant="ghost" size="sm" className="rounded-full shrink-0" onClick={() => { setDue(""); setRecurrence("none"); }}>
                      Sem data
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-[var(--faint)]">Horário de Brasília. Sem data, o lembrete fica na seção “Sem data”.</p>
              </div>

              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Prioridade</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium ${priority === p ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--card-soft)]"}`}
                      style={{ borderColor: priority === p ? PRIORITY_COLOR[p] : undefined }}
                    >
                      <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ background: PRIORITY_COLOR[p] }} />
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Repetição</label>
                <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RECURRENCES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRecurrence(r)}
                      disabled={r !== "none" && !due}
                      title={r !== "none" && !due ? "Defina uma data para repetir" : undefined}
                      className={`rounded-xl border px-2 py-2 text-xs font-medium disabled:opacity-40 ${recurrence === r ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--card-soft)]"}`}
                    >
                      {RECURRENCE_LABEL[r]}
                    </button>
                  ))}
                </div>
                {recurrence !== "none" && (
                  <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                    Ao concluir, a ocorrência vai para o histórico e a próxima é agendada automaticamente.
                  </p>
                )}
              </div>

              {err && <p className="text-xs text-[var(--negative)]">{err}</p>}

              <Button onClick={submit} disabled={loading} aria-busy={loading} className="w-full rounded-full">
                {loading ? "Salvando..." : initial ? "Salvar" : "Criar lembrete"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
