"use client";
import { useMemo, useState } from "react";
import { useDebtStore, debtPaidAmount, debtRemaining, debtStatus } from "@/lib/store/debtStore";
import { debtService } from "@/lib/services/debtService";
import { FinanceNav } from "@/components/rise/FinanceNav";
import { DebtDialog } from "@/components/rise/DebtDialog";
import { PaymentDialog } from "@/components/rise/PaymentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, HandCoins, Archive } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export default function DividasPage() {
  const { debts, payments, installments } = useDebtStore();
  const { push } = useToast();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all"|"owed"|"receivable"|"pending"|"overdue"|"paid">("all");
  const [open, setOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<string|null>(null);
  const [payDebt, setPayDebt] = useState<string|null>(null);
  const [detail, setDetail] = useState<string|null>(null);

  const visible = useMemo(() => {
    let list=[...debts].filter(d=>!d.archived_at);
    if(filter==="owed") list=list.filter(d=>d.kind==="owed");
    if(filter==="receivable") list=list.filter(d=>d.kind==="receivable");
    if(filter==="pending") list=list.filter(d=> debtStatus(d,payments,installments)==="pending");
    if(filter==="overdue") list=list.filter(d=> debtStatus(d,payments,installments)==="overdue");
    if(filter==="paid") list=list.filter(d=> debtStatus(d,payments,installments)==="paid" || debtRemaining(d,payments)<=0.01);
    if(q.trim()){
      const qq=q.toLowerCase();
      list=list.filter(d=> d.person.toLowerCase().includes(qq) || (d.description||"").toLowerCase().includes(qq));
    }
    return list;
  }, [debts, payments, installments, q, filter]);

  const totals = useMemo(()=>{
    const owed = debts.filter(d=>d.kind==="owed" && !d.archived_at).reduce((s,d)=> s+ debtRemaining(d,payments),0);
    const recv = debts.filter(d=>d.kind==="receivable" && !d.archived_at).reduce((s,d)=> s+ debtRemaining(d,payments),0);
    const overdue = debts.filter(d=> debtStatus(d,payments,installments)==="overdue" && !d.archived_at).length;
    return { owed, recv, overdue };
  }, [debts, payments, installments]);

  const detailDebt = detail ? debts.find(d=>d.id===detail) : null;
  const detailPayments = detail ? payments.filter(p=>p.debt_id===detail).sort((a,b)=>+new Date(b.paid_at)-+new Date(a.paid_at)) : [];
  const detailInst = detail ? installments.filter(i=>i.debt_id===detail).sort((a,b)=>a.installment_number-b.installment_number) : [];

  const handleCreate = async (data: Parameters<typeof debtService.createDebt>[0]) => {
    try{ await debtService.createDebt(data as never); push({ title:"Dívida criada"});} catch(e:unknown){ push({ title:"Erro", desc:e instanceof Error?e.message:"", variant:"error"}); throw e; }
  };

  const handleUpdate = async (data: Parameters<typeof debtService.updateDebt>[1]) => {
    if(!editDebt) return;
    try{ await debtService.updateDebt(editDebt, data as never); push({ title:"Dívida atualizada"});} catch(e:unknown){ push({ title:"Erro", desc:e instanceof Error?e.message:"", variant:"error"}); throw e; }
  };

  const handlePay = async (data:{ amount:number; notes?:string|null; create_transaction?:boolean; account_id?:string|null; transaction_category?:string|null; installment_id?:string|null})=>{
    if(!payDebt) return;
    try{ await debtService.addPayment(payDebt, data as never); push({ title:"Pagamento registrado", desc:formatBRL(data.amount)});} catch(e:unknown){ push({ title:"Erro", desc:e instanceof Error?e.message:"", variant:"error"});}
  };

  return (
    <div className="space-y-5">
      <FinanceNav />
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Dívidas</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Eu devo / Me devem — pagamentos parciais e parcelamentos.</p>
        </div>
        <Button size="sm" className="rounded-full" onClick={()=>{ setEditDebt(null); setOpen(true);}}><Plus className="h-4 w-4" /> Nova dívida</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--faint)]">Eu devo</p>
          <p className="text-lg font-bold">{formatBRL(totals.owed)}</p>
        </div>
        <div className="rounded-2xl bg-[var(--card)] border border-[var(--border)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--faint)]">Me devem</p>
          <p className="text-lg font-bold text-[var(--positive)]">{formatBRL(totals.recv)}</p>
        </div>
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Vencendo / atrasadas</p>
          <p className="text-lg font-bold text-amber-700">{totals.overdue}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--card)] overflow-x-auto">
          {(["all","owed","receivable","pending","overdue","paid"] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${filter===f?"bg-[var(--accent)] text-[var(--accent-foreground)]":"text-[var(--muted-foreground)]"}`}>{f==="all"?"Todas":f==="owed"?"Eu devo":f==="receivable"?"Me devem":f==="pending"?"Pendentes":f==="overdue"?"Atrasadas":"Pagas"}</button>
          ))}
        </div>
        <div className="flex-1 min-w-[180px] relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]" />
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar pessoa ou descrição" className="pl-9 h-9 rounded-full" />
        </div>
      </div>

      {visible.length===0 ? (
        <div className="rounded-[20px] border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">
          <HandCoins className="h-8 w-8 mx-auto text-[var(--faint)]" />
          <p className="mt-2 text-sm font-medium">Nenhuma dívida</p>
          <p className="text-xs text-[var(--muted-foreground)]">Crie Eu devo ou Me devem, com parcelamento se precisar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((d)=>{
            const paid=d.paid_amount ?? debtPaidAmount(d.id, payments);
            const remaining=debtRemaining(d,payments);
            const status=debtStatus(d,payments,installments);
            const pct=Math.min(100, Math.round((paid/d.amount)*100));
            return (
              <div key={d.id} onClick={()=>setDetail(d.id)} className="rounded-[18px] border border-[var(--border)] bg-[var(--card)] p-4 hover:border-[var(--border-strong)] cursor-pointer transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{d.person} <span className="text-xs text-[var(--faint)]">· {d.kind==="owed"?"você deve":"te devem"}</span></p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">{d.description||"—"} {d.is_installment? `· ${d.installments_count}x`:""}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs">
                      <Badge className={status==="paid"?"bg-emerald-500 text-white": status==="overdue"?"bg-red-500 text-white": status==="partial"?"bg-amber-500 text-white":""}>{status}</Badge>
                      {d.due_date && <span className="text-[var(--muted-foreground)]">vence {d.due_date}</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold">{formatBRL(remaining)} <span className="text-xs font-normal text-[var(--faint)]">de {formatBRL(d.amount)}</span></p>
                    <p className="text-xs text-[var(--muted-foreground)]">pago {formatBRL(paid)}</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                  <div className="h-full bg-[var(--accent)]" style={{ width:`${pct}%`}} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="soft" className="rounded-full h-7 text-xs" onClick={(e)=>{ e.stopPropagation(); setPayDebt(d.id);}}>Pagar</Button>
                  <Button size="sm" variant="ghost" className="rounded-full h-7 text-xs" onClick={(e)=>{ e.stopPropagation(); setEditDebt(d.id); setOpen(true);}}>Editar</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DebtDialog open={open} onClose={()=>{ setOpen(false); setEditDebt(null);}} onSave={async (data)=>{ if(editDebt) await handleUpdate(data as never); else await handleCreate(data); }} initial={editDebt? debts.find(d=>d.id===editDebt)||null : null} />

      <PaymentDialog open={!!payDebt} onClose={()=>setPayDebt(null)} onPay={handlePay} debt={payDebt? debts.find(d=>d.id===payDebt)||null : null} installments={payDebt? installments.filter(i=>i.debt_id===payDebt):[]} />

      {/* Detail drawer */}
      {detailDebt && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={()=>setDetail(null)} />
          <div className="absolute inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 w-full lg:max-w-[560px] max-h-[86dvh] overflow-auto rounded-t-[20px] lg:rounded-[20px] bg-[var(--card)] border border-[var(--border)] p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{detailDebt.person}</h3>
                <p className="text-sm text-[var(--muted-foreground)]">{detailDebt.description} · {detailDebt.kind==="owed"?"Eu devo":"Me devem"}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Total {formatBRL(detailDebt.amount)} · Pago {formatBRL(debtPaidAmount(detailDebt.id, payments))} · Restante {formatBRL(debtRemaining(detailDebt, payments))}</p>
              </div>
              <button onClick={()=>setDetail(null)} className="h-8 w-8 rounded-full bg-[var(--card-soft)] grid place-items-center">×</button>
            </div>

            {detailInst.length>0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--faint)]">Parcelas</p>
                <div className="mt-2 space-y-2">
                  {detailInst.map(inst=> {
                    const paidInst = payments.filter(p=>p.installment_id===inst.id).reduce((s,p)=>s+Number(p.amount),0);
                    const remaining = Number(inst.amount) - paidInst;
                    const pct = Math.min(100, Math.round((paidInst/Number(inst.amount))*100));
                    return (
                      <div key={inst.id} className="border border-[var(--border)] rounded-xl px-3 py-2 bg-[var(--card-soft)]">
                        <div className="flex justify-between text-xs"><span>{inst.installment_number}/{detailInst.length} — {inst.due_date}</span><span className="font-medium">{formatBRL(Number(inst.amount))} · {inst.status}</span></div>
                        {paidInst>0 && <div className="mt-1.5"><div className="h-1 rounded-full bg-[var(--muted)] overflow-hidden"><div className="h-full bg-[var(--accent)]" style={{ width:`${pct}%`}} /></div><p className="text-[11px] text-[var(--muted-foreground)] mt-1">pago {formatBRL(paidInst)} · restante {formatBRL(remaining)}</p></div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--faint)]">Histórico de pagamentos</p>
              <div className="mt-2 space-y-2 max-h-[160px] overflow-auto">
                {detailPayments.length===0 ? <p className="text-xs text-[var(--muted-foreground)]">Nenhum pagamento</p> : detailPayments.map(p=> <div key={p.id} className="flex justify-between text-xs border border-[var(--border)] rounded-xl px-3 py-2"><span>{new Date(p.paid_at).toLocaleDateString("pt-BR")} · {formatBRL(Number(p.amount))}</span><span className="text-[var(--faint)]">{p.notes||""}</span></div>)}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button size="sm" className="rounded-full" onClick={()=>{ setPayDebt(detailDebt.id);}}>Registrar pagamento</Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={async ()=>{ await debtService.archiveDebt(detailDebt.id); setDetail(null); push({ title:"Arquivado"});}}> <Archive className="h-3.5 w-3.5" /> Arquivar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
