import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useDebtStore, debtPaidAmount, debtRemaining } from "@/lib/store/debtStore";
import type { Debt, DebtPayment, DebtInstallment } from "@/types/debt";

function uid(){ return crypto.randomUUID(); }

async function api<T>(url:string, init?:RequestInit): Promise<T>{
  const r=await fetch(url,{ ...init, headers:{ "Content-Type":"application/json", ...(init?.headers||{}) }});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error || `API ${r.status}`);
  return j.data as T;
}

function addMonthsPreserveEOM(dateStr:string, monthsToAdd:number): string{
  const [y,m,d]=dateStr.split("-").map(Number);
  let targetMonth=m+monthsToAdd;
  let targetYear=y + Math.floor((targetMonth-1)/12);
  targetMonth = ((targetMonth-1)%12)+1;
  const lastDay=new Date(targetYear, targetMonth, 0).getDate();
  const day=Math.min(d, lastDay);
  const mm=String(targetMonth).padStart(2,"0");
  const dd=String(day).padStart(2,"0");
  return `${targetYear}-${mm}-${dd}`;
}

function installmentStatus(amount:number, paid:number, dueDate:string): DebtInstallment["status"]{
  if(paid >= amount -0.005) return "paid";
  if(paid>0 && paid < amount){
    const today=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Sao_Paulo"})).toISOString().slice(0,10);
    if(dueDate < today) return "overdue";
    return "partial";
  }
  const today=new Date(new Date().toLocaleString("en-US",{timeZone:"America/Sao_Paulo"})).toISOString().slice(0,10);
  if(dueDate < today) return "overdue";
  return "pending";
}

export const debtService = {
  listDebts(){ return useDebtStore.getState().debts; },

  async createDebt(data:{ person:string; description?:string|null; kind:"owed"|"receivable"; amount:number; due_date?:string|null; notes?:string|null; is_installment?:boolean; installments_count?:number|null; first_due_date?:string|null }): Promise<Debt>{
    if(!isSupabaseConfigured()){
      const now=new Date().toISOString();
      const debt:Debt={ id:uid(), user_id:"demo", person:data.person.trim(), description:data.description?.trim()||null, kind:data.kind, amount:data.amount, due_date:data.due_date||null, notes:data.notes||null, status:"pending", is_installment:!!data.is_installment, installments_count:data.installments_count||null, archived_at:null, created_at:now, updated_at:now };
      useDebtStore.getState().upsertDebt(debt);
      if(debt.is_installment && debt.installments_count && data.first_due_date){
        const per=Math.floor(debt.amount/debt.installments_count*100)/100;
        const rem=+(debt.amount - per*(debt.installments_count-1)).toFixed(2);
        for(let i=1;i<=debt.installments_count;i++){
          const due=addMonthsPreserveEOM(data.first_due_date, i-1);
          const inst:DebtInstallment={ id:uid(), user_id:"demo", debt_id:debt.id, installment_number:i, amount:i===debt.installments_count?rem:per, due_date:due, status:"pending", created_at:now };
          useDebtStore.getState().upsertInstallment(inst);
        }
      }
      return debt;
    }
    const created=await api<Debt>("/api/debts",{ method:"POST", body:JSON.stringify(data)});
    useDebtStore.getState().upsertDebt(created);
    if(created.is_installment){
      try{
        const res=await fetch(`/api/debts/${created.id}/installments`).then(r=>r.json());
        if(res.data) res.data.forEach((i:DebtInstallment)=> useDebtStore.getState().upsertInstallment(i));
      }catch{}
    }
    return created;
  },

  async updateDebt(id:string, patch: Partial<Pick<Debt,"person"|"description"|"kind"|"amount"|"due_date"|"notes">>): Promise<Debt>{
    if(!isSupabaseConfigured()){
      const s=useDebtStore.getState();
      const prev=s.debts.find(d=>d.id===id);
      if(!prev) throw new Error("debt not found");
      if(prev.is_installment && ("is_installment" in patch || "installments_count" in patch)) throw new Error("parcelamento não pode ser alterado");
      if(patch.amount !== undefined){
        const paid=debtPaidAmount(id, s.payments);
        if(patch.amount < paid -0.005) throw new Error(`valor não pode ser menor que o já pago (${paid})`);
      }
      const next={ ...prev, ...patch, person: patch.person!==undefined? patch.person.trim(): prev.person, description: patch.description!==undefined? (patch.description?.trim()||null) : prev.description, updated_at:new Date().toISOString() } as Debt;
      s.upsertDebt(next);
      return next;
    }
    const updated=await api<Debt>(`/api/debts/${id}`,{ method:"PATCH", body:JSON.stringify(patch)});
    useDebtStore.getState().upsertDebt(updated);
    return updated;
  },

  async addPayment(debtId:string, data:{ amount:number; notes?:string|null; create_transaction?:boolean; account_id?:string|null; transaction_category?:string|null; installment_id?:string|null }): Promise<DebtPayment>{
    if(!isSupabaseConfigured()){
      const debt=useDebtStore.getState().debts.find(d=>d.id===debtId);
      if(!debt) throw new Error("debt not found");
      const paid=debtPaidAmount(debtId, useDebtStore.getState().payments);
      const remaining=debt.amount - paid;
      if(data.amount > remaining +0.005) throw new Error(`pagamento maior que o restante (${remaining})`);
      if(data.installment_id){
        const inst=useDebtStore.getState().installments.find(i=>i.id===data.installment_id);
        if(!inst) throw new Error("installment not found");
        const paidInst=useDebtStore.getState().payments.filter(p=>p.installment_id===data.installment_id).reduce((s,p)=>s+p.amount,0);
        const remInst=inst.amount - paidInst;
        if(data.amount > remInst +0.005) throw new Error(`pagamento maior que o restante da parcela (${remInst})`);
      }
      const pay:DebtPayment={ id:uid(), user_id:"demo", debt_id:debtId, amount:data.amount, paid_at:new Date().toISOString(), notes:data.notes||null, transaction_id:null, installment_id:data.installment_id||null, created_at:new Date().toISOString()};
      if(data.create_transaction){
        const { financeService } = await import("./finance");
        const tx=await financeService.createTransaction({ account_id:data.account_id||null, category_id:null, category_name:data.transaction_category||null, type: debt.kind==="owed"?"expense":"income", amount:data.amount, description: `${debt.person} - ${debt.description||""}`.trim(), occurred_at:new Date().toISOString(), notes:data.notes||null, payment_method:null, is_recurring:false } as never);
        (pay as unknown as { transaction_id:string }).transaction_id = (tx as unknown as { id:string }).id;
      }
      useDebtStore.getState().upsertPayment(pay);
      if(data.installment_id){
        const inst=useDebtStore.getState().installments.find(i=>i.id===data.installment_id)!;
        const paidInst=useDebtStore.getState().payments.filter(p=>p.installment_id===data.installment_id).reduce((s,p)=>s+p.amount,0);
        const status=installmentStatus(inst.amount, paidInst, inst.due_date);
        useDebtStore.getState().upsertInstallment({ ...inst, status });
      }
      return pay;
    }
    const created=await api<DebtPayment>(`/api/debts/${debtId}/payments`,{ method:"POST", body:JSON.stringify(data)});
    useDebtStore.getState().upsertPayment(created);
    if(created.transaction_id){
      try{ const { financeService } = await import("./finance"); await financeService.refreshFromServer(); }catch{}
    }
    if(data.installment_id){
      try{
        const res=await fetch(`/api/debts/${debtId}/installments`).then(r=>r.json());
        if(res.data) {
          const existing=useDebtStore.getState().installments.filter(i=>i.debt_id!==debtId);
          useDebtStore.getState().setInstallments([...existing, ...res.data]);
        }
      }catch{}
    }
    try{
      const res=await fetch(`/api/debts`).then(r=>r.json());
      const found=res.data?.find((d:Debt)=>d.id===debtId);
      if(found) useDebtStore.getState().upsertDebt(found);
    }catch{}
    return created;
  },

  async archiveDebt(id:string){
    if(!isSupabaseConfigured()){
      const d=useDebtStore.getState().debts.find(x=>x.id===id);
      if(d) useDebtStore.getState().upsertDebt({ ...d, archived_at:new Date().toISOString(), updated_at:new Date().toISOString() });
      return;
    }
    const archived=await api<Debt>(`/api/debts/${id}/archive`,{ method:"POST"});
    useDebtStore.getState().upsertDebt(archived);
  },

  async refreshFromServer(){
    if(!isSupabaseConfigured()) return;
    const [dR, pR, iR]=await Promise.all([fetch("/api/debts"), fetch("/api/debts/payments"), fetch("/api/debts/installments")]);
    if(!dR.ok) throw new Error("debts sync failed");
    if(!pR.ok) throw new Error("payments sync failed");
    if(!iR.ok) throw new Error("installments sync failed");
    const [dJ,pJ,iJ]=await Promise.all([dR.json(), pR.json(), iR.json()]);
    if(dJ.data) useDebtStore.getState().setDebts(dJ.data);
    if(pJ.data) useDebtStore.getState().setPayments(pJ.data);
    if(iJ.data) useDebtStore.getState().setInstallments(iJ.data);
  }
};
