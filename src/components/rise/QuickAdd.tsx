"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet, TrendingUp, CalendarPlus, Bell, GraduationCap, HandCoins, Star, Sparkles, CalendarDays, AlignLeft, Building2, Pencil, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import type { ResolvedParsedIntent } from "@/lib/ai/types";
import { TransactionDialog } from "@/components/rise/TransactionDialog";
import { DebtDialog } from "@/components/rise/DebtDialog";
import { EventDialog } from "@/components/rise/EventDialog";
import { ReminderDialog } from "@/components/rise/ReminderDialog";
import { ImportantDialog } from "@/components/rise/ImportantDialog";
import { SchoolTaskDialog } from "@/components/rise/SchoolTaskDialog";
import { financeService } from "@/lib/services/finance";
import { debtService } from "@/lib/services/debtService";
import { calendarService } from "@/lib/services/calendarService";
import { reminderService } from "@/lib/services/reminderService";
import { importantService } from "@/lib/services/importantService";
import { schoolService } from "@/lib/services/schoolService";
import { useToast } from "@/components/ui/toast";
import { formatBRL } from "@/lib/utils";

export function QuickAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [ai, setAi] = useState("");
  const [parsed, setParsed] = useState<ResolvedParsedIntent | null>(null);
  const [operationKey, setOperationKey] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [aiProvider, setAiProvider] = useState<"openai" | "mock" | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [txOpen, setTxOpen] = useState<null | "expense" | "income">(null);
  const [debtOpen, setDebtOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [importantOpen, setImportantOpen] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const { push } = useToast();

  const handleAI = async () => {
    if (!ai.trim() || aiLoading) return;
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch("/api/ai/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: ai }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data) throw new Error(payload?.error || "Não foi possível interpretar o texto agora.");
      setParsed(payload.data as ResolvedParsedIntent);
      setOperationKey(crypto.randomUUID());
      setConfirmError("");
      setAiProvider(payload.provider === "openai" ? "openai" : "mock");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Não foi possível interpretar o texto agora.");
    } finally {
      setAiLoading(false);
    }
  };

  const openTx = (t: "expense" | "income") => {
    setParsed(null);
    setTxOpen(t);
  };

  const openParsed = () => {
    if (!parsed) return;
    if (parsed.intent === "transfer") { setParsed(null); setOperationKey(null); return; }
    if (parsed.intent === "transaction") setTxOpen(parsed.data.type || "expense");
    if (parsed.intent === "debt") setDebtOpen(true);
    if (parsed.intent === "event") setEventOpen(true);
    if (parsed.intent === "reminder") setReminderOpen(true);
    if (parsed.intent === "important") setImportantOpen(true);
    if (parsed.intent === "school_task") setSchoolOpen(true);
  };

  const anyDialogOpen = !!txOpen || debtOpen || eventOpen || reminderOpen || importantOpen || schoolOpen;
  const previewValues = parsed && parsed.intent !== "unknown"
    ? Object.entries(parsed.data).filter(([, value]) => value !== null && value !== false && value !== "")
    : [];
  const canConfirmTransfer = parsed?.intent === "transfer" && parsed.confidence >= 0.75 && parsed.missingFields.length === 0
    && !!parsed.data.amount && !!parsed.data.occurredAt && !!operationKey
    && parsed.fromAccountResolution?.status === "existing" && parsed.toAccountResolution?.status === "existing"
    && parsed.fromAccountResolution.id !== parsed.toAccountResolution.id;
  const canQuickConfirm = canConfirmTransfer || (parsed?.intent === "transaction" && parsed.confidence >= 0.75 && parsed.missingFields.length === 0 && !!parsed.data.type && !!parsed.data.amount && !!parsed.data.description && !!parsed.data.occurredAt && !!parsed.accountResolution && !!operationKey);
  const confirmTransaction = async () => {
    if (parsed?.intent === "transfer") {
      if (!canConfirmTransfer || !operationKey || confirming || parsed.fromAccountResolution?.status !== "existing" || parsed.toAccountResolution?.status !== "existing") return;
      setConfirming(true); setConfirmError("");
      try {
        await financeService.createTransfer({ amount: parsed.data.amount!, from_account_id: parsed.fromAccountResolution.id,
          to_account_id: parsed.toAccountResolution.id, occurred_at: parsed.data.occurredAt!, notes: parsed.data.notes }, operationKey);
        push({ title: "Transferência registrada", desc: formatBRL(parsed.data.amount!) });
        setParsed(null); setOperationKey(null); onClose();
      } catch {
        setConfirmError("Não foi possível registrar a transferência. Confira as contas e tente novamente.");
      } finally { setConfirming(false); }
      return;
    }
    if (!parsed || parsed.intent !== "transaction" || !parsed.accountResolution || !operationKey || confirming) return;
    setConfirming(true);
    setConfirmError("");
    try {
      await financeService.confirmTransactionWithAccount({ type: parsed.data.type!, amount: parsed.data.amount!, description: parsed.data.description!, account_id: null, account_name: parsed.accountResolution.name, account_color: parsed.accountResolution.status === "create" ? parsed.accountResolution.color : null, account_brand_domain: parsed.accountResolution.status === "create" ? parsed.accountResolution.brandDomain : null, account_brand_key: parsed.accountResolution.status === "create" ? parsed.accountResolution.brandKey : null, category_id: null, category_name: parsed.data.category, occurred_at: parsed.data.occurredAt!, notes: parsed.data.notes, payment_method: parsed.data.paymentMethod, is_recurring: false }, operationKey);
      push({ title: parsed.data.type === "income" ? "Receita adicionada" : "Gasto adicionado", desc: formatBRL(parsed.data.amount!) });
      setParsed(null); setOperationKey(null); onClose();
    } catch {
      setConfirmError("Não foi possível salvar. Tente novamente.");
      push({ title: "Erro", desc: "Não foi possível confirmar a operação.", variant: "error" });
    } finally { setConfirming(false); }
  };

  return (
    <>
      <AnimatePresence>
        {open && !anyDialogOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-50 w-full lg:max-w-[640px] max-h-[86dvh] overflow-hidden rounded-t-[22px] lg:rounded-[20px] border border-[var(--border)] bg-[var(--elevated)] shadow-[0_28px_70px_rgba(0,0,0,0.55)] flex flex-col"
              style={{ paddingBottom: "max(0px,var(--sab))" }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <h3 className="font-semibold">Adicionar</h3>
                <button onClick={onClose} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center hover:bg-[var(--muted)]"><X className="h-4 w-4" /></button>
              </div>

              <div className="p-5 space-y-4 overflow-auto">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-3">
                  <label className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" /> Adicionar com IA</label>
                  <div className="mt-2 flex gap-2">
                    <input value={ai} onChange={(e) => setAi(e.target.value)} placeholder='ex: gastei 32,50 no lanche hoje pelo inter' className="flex-1 h-10 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 text-sm outline-none focus:border-[var(--accent)]" />
                    <button onClick={handleAI} disabled={aiLoading || !ai.trim()} className="h-10 rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] px-5 text-sm font-semibold disabled:opacity-50">{aiLoading ? "Interpretando..." : "Interpretar"}</button>
                  </div>
                  {aiError && <p role="alert" className="mt-2 text-xs text-[var(--negative)]">{aiError}</p>}
                  {parsed && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                      <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />Confira antes de salvar</p>{aiProvider === "openai" && <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[10px] text-[var(--muted-foreground)]"><Sparkles className="h-3 w-3" />Interpretado com IA</span>}</div>
                      {parsed.clarification && <p className="mt-2 text-xs text-amber-300">{parsed.clarification}</p>}
                      {parsed.intent === "unknown" ? <p className="mt-2 text-xs text-[var(--muted-foreground)]">Escolha uma opção abaixo ou reformule o texto.</p> : (
                        <>
                          {parsed.intent === "transfer" ? <>
                            <div className="mt-4"><p className="text-xs text-[var(--muted-foreground)]">Transferência</p><p className="text-xl font-semibold">{parsed.data.amount ? formatBRL(parsed.data.amount) : "Valor não informado"}</p></div>
                            <p className="mt-3 text-sm font-medium">{parsed.fromAccountResolution?.name || parsed.data.fromAccount || "Origem não informada"} → {parsed.toAccountResolution?.name || parsed.data.toAccount || "Destino não informado"}</p>
                            <p className="mt-2 text-xs">Data: {parsed.data.occurredAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(new Date(parsed.data.occurredAt)) : "Não informada"}</p>
                            <p className="mt-2 text-xs text-[var(--muted-foreground)]">Movimenta os saldos das contas sem alterar receitas ou gastos.</p>
                            {[parsed.fromAccountResolution, parsed.toAccountResolution].map((account, index) => account?.status !== "existing" && <p role="alert" key={index} className="mt-2 text-xs text-amber-300">{account?.status === "ambiguous" ? `Há mais de uma conta para ${account.name}. Revise usando um nome sem ambiguidade.` : `Conta ${account?.name || (index === 0 ? "origem" : "destino")} não encontrada. Cadastre a conta antes de transferir.`}</p>)}
                            {parsed.fromAccountResolution?.status === "existing" && parsed.toAccountResolution?.status === "existing" && parsed.fromAccountResolution.id === parsed.toAccountResolution.id && <p role="alert" className="mt-2 text-xs text-amber-300">Escolha contas diferentes para origem e destino.</p>}
                          </> : parsed.intent === "transaction" ? <>
                            <div className="mt-4 flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${parsed.data.type === "income" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--card-soft)] text-[var(--negative)]"}`}>{parsed.data.type === "income" ? <TrendingUp className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}</span><div><p className="text-xs text-[var(--muted-foreground)]">{parsed.data.type === "income" ? "Receita" : "Gasto"}</p><p className="text-xl font-semibold tracking-tight">{parsed.data.amount ? formatBRL(parsed.data.amount) : "Valor não informado"}</p></div></div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                              <div className="flex gap-2 rounded-xl bg-[var(--card-soft)] p-2.5"><Building2 className="mt-0.5 h-4 w-4 text-[var(--faint)]" /><div><p className="text-[10px] uppercase tracking-wide text-[var(--faint)]">Conta</p><p className="text-xs font-medium">{parsed.accountResolution?.name || "Não informada"}</p></div></div>
                              <div className="flex gap-2 rounded-xl bg-[var(--card-soft)] p-2.5"><CalendarDays className="mt-0.5 h-4 w-4 text-[var(--faint)]" /><div><p className="text-[10px] uppercase tracking-wide text-[var(--faint)]">Data</p><p className="text-xs font-medium">{parsed.data.occurredAt ? `Hoje · ${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date(parsed.data.occurredAt))}` : "Não informada"}</p></div></div>
                              <div className="flex gap-2 rounded-xl bg-[var(--card-soft)] p-2.5"><AlignLeft className="mt-0.5 h-4 w-4 text-[var(--faint)]" /><div><p className="text-[10px] uppercase tracking-wide text-[var(--faint)]">Descrição</p><p className="text-xs font-medium">{parsed.data.description || "Não informada"}</p></div></div>
                            </div>
                            {parsed.accountResolution?.status === "create" && <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2"><Building2 className="h-4 w-4 text-[var(--accent)]" /><div className="min-w-0"><p className="text-xs font-semibold">{parsed.accountResolution.name} <span className="ml-1 rounded-full bg-[var(--card)] px-1.5 py-0.5 text-[9px] text-[var(--accent)]">NOVA CONTA</span></p><p className="text-[11px] text-[var(--muted-foreground)]">Será criada automaticamente ao confirmar.</p></div></div>}
                          </> : <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">{previewValues.map(([key, value]) => <div key={key}><dt className="text-[var(--faint)]">{key.replace(/([A-Z])/g, " $1")}</dt><dd className="truncate">{String(value)}</dd></div>)}</dl>}
                          {parsed.missingFields.length > 0 && <p className="mt-2 rounded-lg bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200">Preencha antes de confirmar: {parsed.missingFields.join(", ")}.</p>}
                          {confirmError && <p role="alert" className="mt-3 text-xs text-[var(--negative)]">{confirmError}</p>}
                          <div className="mt-4 flex flex-wrap justify-end gap-2"><button onClick={() => { setParsed(null); setOperationKey(null); }} className="min-h-9 rounded-full px-3 text-xs text-[var(--muted-foreground)]">Cancelar</button><button onClick={openParsed} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[var(--border)] px-3 text-xs font-semibold"><Pencil className="h-3.5 w-3.5" />Revisar</button>{canQuickConfirm && <button onClick={confirmTransaction} disabled={confirming} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[var(--accent)] px-3.5 text-xs font-semibold text-[var(--accent-foreground)] disabled:opacity-50">{confirming ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Salvando...</> : <><Check className="h-3.5 w-3.5" />Confirmar</>}</button>}</div>
                        </>
                      )}
                    </motion.div>
                  )}
                  {!parsed && !aiError && <p className="mt-2 text-xs text-[var(--muted-foreground)]">Descreva em linguagem natural. Você revisa e confirma antes de qualquer salvamento.</p>}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button onClick={() => openTx("expense")} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <Wallet className="h-5 w-5 text-[var(--accent)]" />
                    <p className="mt-2 text-sm font-semibold">Gasto</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Alimentação, transporte...</p>
                  </button>
                  <button onClick={() => openTx("income")} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                    <p className="mt-2 text-sm font-semibold">Receita</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Salário, venda...</p>
                  </button>
                  <button onClick={() => setDebtOpen(true)} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <HandCoins className="h-5 w-5 text-[var(--accent)]" />
                    <p className="mt-2 text-sm font-semibold">Dívida</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Eu devo / Me devem</p>
                  </button>
                  <button onClick={() => setEventOpen(true)} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <CalendarPlus className="h-5 w-5 text-[var(--accent)]" />
                    <p className="mt-2 text-sm font-semibold">Evento</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Reunião, compromisso</p>
                  </button>
                  <button onClick={() => setReminderOpen(true)} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <Bell className="h-5 w-5 text-[var(--accent)]" />
                    <p className="mt-2 text-sm font-semibold">Lembrete</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Com horário/recorrente</p>
                  </button>
                  <button onClick={() => setImportantOpen(true)} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <Star className="h-5 w-5 text-[var(--accent)]" />
                    <p className="mt-2 text-sm font-semibold">Importante</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Guardar para lembrar depois</p>
                  </button>
                  <button onClick={() => setSchoolOpen(true)} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-left hover:border-[var(--border-strong)] hover:bg-[var(--card-soft)] transition-colors">
                    <GraduationCap className="h-5 w-5 text-[var(--accent)]" />
                    <p className="mt-2 text-sm font-semibold">Atividade escolar</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Prova, trabalho, entrega</p>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <TransactionDialog
        open={!!txOpen}
        defaultType={txOpen || "expense"}
        draft={parsed?.intent === "transaction" ? { type: parsed.data.type || "expense", amount: parsed.data.amount ?? undefined, description: parsed.data.description || "", occurred_at: parsed.data.occurredAt || undefined, category_name: parsed.data.category, notes: parsed.data.notes, payment_method: parsed.data.paymentMethod, account_id: parsed.accountResolution?.status === "existing" ? parsed.accountResolution.id : null, account_name: parsed.accountResolution?.status === "create" ? parsed.accountResolution.name : null, account_color: parsed.accountResolution?.status === "create" ? parsed.accountResolution.color : null, account_brand_domain: parsed.accountResolution?.status === "create" ? parsed.accountResolution.brandDomain : null, account_brand_key: parsed.accountResolution?.status === "create" ? parsed.accountResolution.brandKey : null } : undefined}
        onClose={() => setTxOpen(null)}
        onSave={async (data) => {
          try {
            if (data.category_name) {
              const cat = await financeService.ensureCategoryAsync(data.category_name);
              data.category_id = cat.id;
            }
            if (data.account_name) await financeService.confirmTransactionWithAccount(data as never, operationKey || crypto.randomUUID());
            else await financeService.createTransaction(data as never);
            push({ title: data.type === "expense" ? "Gasto adicionado" : "Receita adicionada", desc: formatBRL(data.amount) });
            setTxOpen(null);
            setParsed(null);
            onClose();
          } catch (e: unknown) {
            push({ title: "Erro", desc: e instanceof Error ? e.message : "Falha", variant: "error" });
            throw e; // sem rethrow o dialog acharia que salvou e fecharia perdendo o formulário
          }
        }}
      />
      <DebtDialog
        open={debtOpen}
        draft={parsed?.intent === "debt" ? { kind: parsed.data.kind || "owed", person: parsed.data.person || "", amount: parsed.data.amount ?? undefined, description: parsed.data.description, due_date: parsed.data.dueDate, notes: parsed.data.notes } : undefined}
        onClose={() => setDebtOpen(false)}
        onSave={async (data) => {
          try {
            await debtService.createDebt(data as never);
            push({ title: "Dívida criada", desc: data.person });
            setDebtOpen(false);
            setParsed(null);
            onClose();
          } catch (e: unknown) {
            push({ title: "Erro", desc: e instanceof Error ? e.message : "Falha", variant: "error" });
            throw e; // sem rethrow o dialog acharia que salvou e fecharia perdendo o formulário
          }
        }}
      />
      <EventDialog
        open={eventOpen}
        draft={parsed?.intent === "event" ? { title: parsed.data.title || "", description: parsed.data.description, category: parsed.data.category || "personal", starts_at: parsed.data.startsAt || undefined, ends_at: parsed.data.endsAt, all_day: parsed.data.allDay || false } : undefined}
        onClose={() => setEventOpen(false)}
        onSave={async (data) => {
          try {
            await calendarService.create(data as never);
            push({ title: "Evento criado", desc: data.title });
            setEventOpen(false);
            setParsed(null);
            onClose();
          } catch (e: unknown) {
            push({ title: "Erro", desc: e instanceof Error ? e.message : "Falha", variant: "error" });
            throw e; // sem rethrow o dialog acharia que salvou e fecharia perdendo o formulário
          }
        }}
      />
      <ReminderDialog
        open={reminderOpen}
        draft={parsed?.intent === "reminder" ? { title: parsed.data.title || "", notes: parsed.data.notes, due_at: parsed.data.dueAt, priority: parsed.data.priority || "medium", recurrence: parsed.data.recurrence || "none" } : undefined}
        onClose={() => setReminderOpen(false)}
        onSave={async (data) => {
          try {
            // Toda a lógica vive no reminderService (demo/API) — QuickAdd só dispara.
            await reminderService.create(data);
            push({ title: "Lembrete criado", desc: data.title });
            setReminderOpen(false);
            setParsed(null);
            onClose();
          } catch (e: unknown) {
            push({ title: "Erro", desc: e instanceof Error ? e.message : "Falha", variant: "error" });
            throw e;
          }
        }}
      />
      <ImportantDialog
        open={importantOpen}
        draft={parsed?.intent === "important" ? { title: parsed.data.title || "", content: parsed.data.content, tag: parsed.data.tag, pinned: parsed.data.pinned || false, remind_at: parsed.data.remindAt } : undefined}
        onClose={() => setImportantOpen(false)}
        onSave={async (data) => {
          try {
            await importantService.create(data);
            push({ title: "Guardado em Importantes", desc: data.title });
            setImportantOpen(false);
            setParsed(null);
            onClose();
          } catch (e: unknown) {
            push({ title: "Erro", desc: e instanceof Error ? e.message : "Falha", variant: "error" });
            throw e;
          }
        }}
      />
      <SchoolTaskDialog
        open={schoolOpen}
        draft={parsed?.intent === "school_task" ? { title: parsed.data.title || "", subject: parsed.data.subject, description: parsed.data.description, type: parsed.data.type || "homework", priority: parsed.data.priority || "medium", due_at: parsed.data.dueAt } : undefined}
        onClose={() => setSchoolOpen(false)}
        onSave={async (data) => {
          try {
            await schoolService.create(data);
            push({ title: "Atividade criada", desc: data.title });
            setSchoolOpen(false);
            setParsed(null);
            onClose();
          } catch (e: unknown) {
            push({ title: "Erro", desc: e instanceof Error ? e.message : "Falha", variant: "error" });
            throw e;
          }
        }}
      />
    </>
  );
}
