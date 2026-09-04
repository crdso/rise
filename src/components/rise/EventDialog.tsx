"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { eventSchema } from "@/lib/validators/calendar";
import { toSaoPauloDateTimeLocal, fromSaoPauloDateTimeLocal, nowSaoPauloDateTimeLocal } from "@/lib/timezone";
import type { CalendarEvent } from "@/types/calendar";

// As cores vêm dos tokens do tema, então categoria e calendário nunca divergem.
const CATS = [
  { id: "personal", label: "Pessoal", color: "var(--chart-1)" },
  { id: "school", label: "Escola", color: "var(--chart-5)" },
  { id: "finance", label: "Financeiro", color: "var(--chart-2)" },
  { id: "important", label: "Importante", color: "var(--negative)" },
];

export function EventDialog({ open, onClose, onSave, initial, initialDate, initialTime }: { open: boolean; onClose: () => void; onSave: (data: Omit<CalendarEvent,"id"|"user_id"|"created_at"|"updated_at">) => Promise<void>; initial?: CalendarEvent | null; initialDate?: string | null; initialTime?: string | null }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("personal");
  const [start, setStart] = useState(nowSaoPauloDateTimeLocal());
  const [end, setEnd] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (initial) {
        setTitle(initial.title); setDesc(initial.description||""); setCat(initial.category);
        setStart(toSaoPauloDateTimeLocal(initial.starts_at));
        setEnd(initial.ends_at ? toSaoPauloDateTimeLocal(initial.ends_at) : "");
        setAllDay(initial.all_day);
      } else {
        setTitle(""); setDesc(""); setCat("personal");
        if (initialDate) {
          // dia clicado na grade; initialTime vem da faixa de hora da semana/dia
          setStart(`${initialDate}T${initialTime || "09:00"}`);
        } else {
          setStart(nowSaoPauloDateTimeLocal());
        }
        setEnd(""); setAllDay(false);
      }
      setErr("");
    }
  }, [open, initial, initialDate, initialTime]);

  const submit = async () => {
    if (loading) return; // impede duplo clique / duplo submit
    let starts_at: string, ends_at: string | null = null;
    try {
      starts_at = allDay ? fromSaoPauloDateTimeLocal(start.split("T")[0] + "T00:00") : fromSaoPauloDateTimeLocal(start);
      // all_day ignora horario de fim -> o campo fica oculto e ends_at vai nulo
      if (end && !allDay) ends_at = fromSaoPauloDateTimeLocal(end);
    } catch { setErr("Data inválida"); return; }
    const parsed = eventSchema.safeParse({ title, description: desc||null, category: cat, starts_at, ends_at, all_day: allDay });
    if (!parsed.success) { setErr(parsed.error.issues[0]?.message||"Verifique"); return; }
    setLoading(true);
    setErr("");
    try {
      // onSave DEVE rejeitar em caso de falha (o parent faz rethrow depois do toast).
      // Só fechamos o dialog após o sucesso; no erro o formulário permanece aberto.

      await onSave({ title: parsed.data.title, description: parsed.data.description||null, category: parsed.data.category as never, starts_at: parsed.data.starts_at, ends_at: parsed.data.ends_at||null, all_day: !!parsed.data.all_day });
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
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => { if (!loading) onClose(); }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <motion.div initial={{ opacity:0, y:18, scale:0.98 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:10, scale:0.98 }} className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[480px] max-h-[88dvh] overflow-auto rounded-t-[22px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--elevated)] p-5 pb-[calc(1rem+var(--sab))] shadow-[0_28px_70px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{initial?"Editar evento":"Novo evento"}</h3>
              <button onClick={onClose} disabled={loading} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center disabled:opacity-50"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Título</label>
                <Input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex: Reunião" className="mt-1" />
              </div>
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Descrição</label>
                <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm" placeholder="Opcional" />
              </div>
              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Categoria</label>
                <div className="mt-1 grid grid-cols-4 gap-2">
                  {CATS.map(c=>(
                    <button key={c.id} onClick={()=>setCat(c.id)} className={`rounded-xl border px-2 py-2 text-xs font-medium ${cat===c.id?"border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]":"border-[var(--border)] bg-[var(--card-soft)]"}`} style={{ borderColor: cat===c.id? c.color : undefined }}>
                      <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ background: c.color }} />{c.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allDay} onChange={e=>setAllDay(e.target.checked)} className="h-4 w-4" /> Dia inteiro</label>
              <div className={`grid gap-3 ${allDay ? "grid-cols-1" : "grid-cols-2"}`}>
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Início</label>
                  <Input type={allDay?"date":"datetime-local"} value={allDay? start.split("T")[0] : start} onChange={e=>setStart(allDay? e.target.value+"T00:00" : e.target.value)} className="mt-1" />
                </div>
                {!allDay && (
                  <div>
                    <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Fim opcional</label>
                    <Input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} className="mt-1" />
                  </div>
                )}
              </div>
              {err && <p className="text-xs text-[var(--negative)]">{err}</p>}
              <Button onClick={submit} disabled={loading} aria-busy={loading} className="w-full rounded-full">{loading ? "Salvando..." : initial ? "Salvar" : "Criar evento"}</Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
