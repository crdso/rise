"use client";
import { useMemo, useState } from "react";
import { Plus, Pin, PinOff, Pencil, Archive, ArchiveRestore, Search, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/rise/EmptyState";
import { ImportantDialog } from "@/components/rise/ImportantDialog";
import { useToast } from "@/components/ui/toast";
import { importantService } from "@/lib/services/importantService";
import { useImportantStore, activeItems, archivedItems, itemTags } from "@/lib/store/importantStore";
import { formatDateKey, saoPauloDateKey } from "@/lib/timezone";
import { IMPORTANT_SECURITY_NOTE, type ImportantInput, type ImportantItem } from "@/types/important";

export default function ImportantesPage() {
  const { items } = useImportantStore();
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ImportantItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const tags = useMemo(() => itemTags(items), [items]);

  const visible = useMemo(() => {
    const base = showArchived ? archivedItems(items) : activeItems(items);
    const needle = q.trim().toLowerCase();
    return base.filter((i) => {
      if (tag && i.tag !== tag) return false;
      if (!needle) return true;
      return `${i.title} ${i.content ?? ""} ${i.tag ?? ""}`.toLowerCase().includes(needle);
    });
  }, [items, showArchived, q, tag]);

  const pinned = visible.filter((i) => i.pinned);
  const rest = visible.filter((i) => !i.pinned);

  const handleSave = async (data: ImportantInput) => {
    try {
      if (editing) await importantService.update(editing.id, data);
      else await importantService.create(data);
      push({ title: editing ? "Item atualizado" : "Item guardado" });
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" });
      throw e;
    }
  };

  const run = async (id: string, fn: () => Promise<unknown>, okTitle: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await fn();
      push({ title: okTitle });
    } catch (e: unknown) {
      push({ title: "Erro", desc: e instanceof Error ? e.message : "", variant: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const Card = ({ item }: { item: ImportantItem }) => {
    const busy = busyId === item.id;
    return (
      <article className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold leading-tight break-words">{item.title}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-[var(--muted-foreground)]">
              {item.tag && (
                <span className="rounded-full bg-[var(--card-soft)] border border-[var(--border)] px-2 py-0.5">
                  {item.tag}
                </span>
              )}
              {item.remind_at && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDateKey(saoPauloDateKey(item.remind_at), { day: "2-digit", month: "short" })}
                </span>
              )}
              <span className="text-[var(--faint)]">
                {formatDateKey(saoPauloDateKey(item.updated_at), { day: "2-digit", month: "short" })}
              </span>
            </div>
          </div>
          {item.pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-label="Fixado" />}
        </div>

        {item.content && (
          <p className="text-[13px] leading-relaxed text-[var(--muted-foreground)] whitespace-pre-wrap break-words line-clamp-6">
            {item.content}
          </p>
        )}

        <div className="flex flex-wrap gap-1 pt-1">
          {!item.archived_at && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full h-8 px-2.5"
              disabled={busy}
              onClick={() => run(item.id, () => importantService.togglePin(item.id), item.pinned ? "Desafixado" : "Fixado")}
            >
              {item.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              <span className="sr-only">{item.pinned ? "Desafixar" : "Fixar"}</span>
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full h-8 px-2.5"
            disabled={busy}
            onClick={() => {
              setEditing(item);
              setOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="sr-only">Editar</span>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full h-8 px-2.5"
            disabled={busy}
            onClick={() =>
              run(
                item.id,
                () => importantService.setArchived(item.id, !item.archived_at),
                item.archived_at ? "Restaurado" : "Arquivado"
              )
            }
          >
            {item.archived_at ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
            <span className="sr-only">{item.archived_at ? "Restaurar" : "Arquivar"}</span>
          </Button>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Importantes</h1>
          <p className="text-[12.5px] text-[var(--muted-foreground)] mt-1">
            Coisas que você quer reencontrar depois.
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Guardar
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2.5">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
        <p className="text-[11.5px] leading-snug text-amber-200/90">{IMPORTANT_SECURITY_NOTE}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--faint)]" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar…"
            className="pl-9 h-10 rounded-full bg-[var(--card)]"
            aria-label="Buscar itens importantes"
          />
        </div>
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5 min-w-max">
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                aria-pressed={tag === t}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-medium whitespace-nowrap ${
                  tag === t
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
                }`}
              >
                {t}
              </button>
            ))}
            <button
              onClick={() => setShowArchived((v) => !v)}
              aria-pressed={showArchived}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium whitespace-nowrap ${
                showArchived
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
              }`}
            >
              Arquivados
            </button>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={showArchived ? "Nada arquivado" : "Nada guardado ainda"}
          desc={
            showArchived
              ? "Itens arquivados saem da lista principal, mas continuam aqui."
              : "Um código, um endereço, uma decisão — o que você não quer perder."
          }
          action={
            !showArchived ? (
              <Button
                size="sm"
                variant="soft"
                className="rounded-full"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Guardar algo
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {pinned.length > 0 && (
            <section>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)] mb-2">Fixados</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {pinned.map((i) => (
                  <Card key={i.id} item={i} />
                ))}
              </div>
            </section>
          )}
          {rest.length > 0 && (
            <section>
              {pinned.length > 0 && (
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--faint)] mb-2">
                  Outros
                </h2>
              )}
              <div className="grid sm:grid-cols-2 gap-3">
                {rest.map((i) => (
                  <Card key={i.id} item={i} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <ImportantDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        initial={editing}
        suggestedTags={tags}
      />
    </div>
  );
}
