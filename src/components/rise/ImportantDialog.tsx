"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, Pin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toSaoPauloDateTimeLocal, fromSaoPauloDateTimeLocal } from "@/lib/timezone";
import { IMPORTANT_SECURITY_NOTE, type ImportantInput, type ImportantItem } from "@/types/important";

export function ImportantDialog({
  open,
  onClose,
  onSave,
  initial,
  suggestedTags = [],
  draft,
}: {
  open: boolean;
  onClose: () => void;
  /** Deve REJEITAR em caso de falha: o dialog só fecha após sucesso. */
  onSave: (data: ImportantInput) => Promise<void>;
  initial?: ImportantItem | null;
  suggestedTags?: string[];
  draft?: Partial<ImportantInput>;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("");
  const [pinned, setPinned] = useState(false);
  const [remind, setRemind] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setContent(initial.content || "");
      setTag(initial.tag || "");
      setPinned(initial.pinned);
      setRemind(initial.remind_at ? toSaoPauloDateTimeLocal(initial.remind_at) : "");
    } else {
      setTitle(draft?.title || "");
      setContent(draft?.content || "");
      setTag(draft?.tag || "");
      setPinned(!!draft?.pinned);
      setRemind(draft?.remind_at ? toSaoPauloDateTimeLocal(draft.remind_at) : "");
    }
    setErr("");
  }, [open, initial, draft]);

  const submit = async () => {
    if (loading) return;
    if (title.trim().length < 2) {
      setErr("Título mínimo 2 caracteres");
      return;
    }
    let remind_at: string | null = null;
    if (remind) {
      try {
        remind_at = fromSaoPauloDateTimeLocal(remind);
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
        content: content.trim() || null,
        tag: tag.trim() || null,
        pinned,
        remind_at,
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
            className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[500px] max-h-[88dvh] overflow-auto rounded-t-[22px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--elevated)] p-5 pb-[calc(1rem+var(--sab))] shadow-[0_28px_70px_rgba(0,0,0,0.55)]"
          >
            <div className="mx-auto lg:hidden h-1 w-9 rounded-full bg-[var(--border-strong)] mb-4" />

            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{initial ? "Editar item" : "Guardar algo importante"}</h3>
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
                  placeholder="Ex: Placa do carro do tio"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Conteúdo</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm resize-y"
                  placeholder="O que você quer lembrar depois"
                />
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
                <p className="text-[11.5px] leading-snug text-amber-200">{IMPORTANT_SECURITY_NOTE}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Etiqueta</label>
                  <Input
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="Opcional"
                    list="important-tags"
                    className="mt-1"
                  />
                  <datalist id="important-tags">
                    {suggestedTags.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs text-[var(--faint)] uppercase tracking-wide">Lembrar em</label>
                  <Input
                    type="datetime-local"
                    value={remind}
                    onChange={(e) => setRemind(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPinned((v) => !v)}
                aria-pressed={pinned}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  pinned
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
                }`}
              >
                <Pin className="h-3.5 w-3.5" />
                {pinned ? "Fixado no painel" : "Fixar no painel"}
              </button>

              {err && <p className="text-xs text-red-400">{err}</p>}

              <Button onClick={submit} disabled={loading} aria-busy={loading} className="w-full rounded-full">
                {loading ? "Salvando..." : initial ? "Salvar" : "Guardar"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
