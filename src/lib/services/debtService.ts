import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useDebtStore, debtPaidAmount } from "@/lib/store/debtStore";
import { useFinanceStore } from "@/lib/store/financeStore";
import type { Debt, DebtPayment, DebtInstallment } from "@/types/debt";

function uid(){ return crypto.randomUUID(); }

async function api<T>(url:string, init?:RequestInit): Promise<T>{
  const r=await fetch(url,{ ...init, headers:{ "Content-Type":"application/json", ...(init?.headers||{}) }});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error || `API ${r.status}`);
  return j.data as T;
}

export const debtService = {
  listDebts(){ return useDebtStore.getState().debts; },
  listPayments(debtId:string){ return useDebtStore.getState().payments.filter(p=>p.debt_id===debtId); },
  listInstallments(debtId:string){ return useDebtStore.getState().installments.filter(i=>i.debt_id===debtId).sort((a,b)=>a.installment_number-b.installment_number); },

  async createDebt(data:{ person:string; description?:string|null; kind:"owed"|"receivable"; amount:number; due_date?:string|null; notes?:string|null; is_installment?:boolean; installments_count?:number|null; first_due_date?:string|null }): Promise<Debt>{
    if(!isSupabaseConfigured()){
      const now=new Date().toISOString();
      const debt:Debt={ id:uid(), user_id:"demo", person:data.person.trim(), description:data.description?.trim()||null, kind:data.kind, amount:data.amount, due_date:data.due_date||null, notes:data.notes||null, status:"pending", is_installment:!!data.is_installment, installments_count:data.installments_count||null, archived_at:null, created_at:now, updated_at:now };
      useDebtStore.getState().upsertDebt(debt);
      // parcelas demo
      if(debt.is_installment && debt.installments_count && data.first_due_date){
        const per=Math.floor(debt.amount/debt.installments_count*100)/100;
        const rem=+(debt.amount - per*(debt.installments_count-1)).toFixed(2);
        for(let i=1;i<=debt.installments_count;i++){
          const d=new Date(data.first_due_date); d.setMonth(d.getMonth()+i-1);
          const inst:DebtInstallment={ id:uid(), user_id:"demo", debt_id:debt.id, installment_number:i, amount:i===debt.installments_count?rem:per, due_date:d.toISOString().slice(0,10), status:"pending", created_at:now };
          useDebtStore.getState().upsertInstallment(inst);
        }
      }
      return debt;
    }
    const created=await api<Debt>("/api/debts",{ method:"POST", body:JSON.stringify(data)});
    useDebtStore.getState().upsertDebt(created);
    // se parcelada, buscar installments
    if(created.is_installment){
      try{
        const res=await fetch(`/api/debts/${created.id}/installments`).then(r=>r.json());
        if(res.data) res.data.forEach((i:DebtInstallment)=> useDebtStore.getState().upsertInstallment(i));
      }catch{}
    }
    return created;
  },

  async addPayment(debtId:string, data:{ amount:number; notes?:string|null; create_transaction?:boolean; account_id?:string|null; transaction_category?:string|null; installment_id?:string|null }): Promise<DebtPayment>{
    if(!isSupabaseConfigured()){
      const debt=useDebtStore.getState().debts.find(d=>d.id===debtId);
      if(!debt) throw new Error("debt not found");
      const pay:DebtPayment={ id:uid(), user_id:"demo", debt_id:debtId, amount:data.amount, paid_at:new Date().toISOString(), notes:data.notes||null, transaction_id:null, created_at:new Date().toISOString()};
      // opcional transaction
      if(data.create_transaction){
        const { financeService } = await import("./finance");
        const tx=await financeService.createTransaction({ account_id:data.account_id||null, category_id:null, category_name:data.transaction_category||null, type: debt.kind==="owed"?"expense":"income", amount:data.amount, description: `${debt.person} - ${debt.description||""}`.trim(), occurred_at:new Date().toISOString(), notes:data.notes||null, payment_method:null, is_recurring:false } as never);
        (pay as unknown as { transaction_id:string }).transaction_id = (tx as unknown as { id:string }).id;
      }
      useDebtStore.getState().upsertPayment(pay);
      if(data.installment_id){
        const inst=useDebtStore.getState().installments.find(i=>i.id===data.installment_id);
        if(inst) useDebtStore.getState().upsertInstallment({ ...inst, status:"paid" });
      }
      // atualizar status debt via derivado, mas também atualizar paid
      return pay;
    }
    const created=await api<DebtPayment>(`/api/debts/${debtId}/payments`,{ method:"POST", body:JSON.stringify(data)});
    useDebtStore.getState().upsertPayment(created);
    if(created.transaction_id){
      // refresh finance
      try{ const { financeService } = await import("./finance"); await financeService.refreshFromServer(); }catch{}
    }
    if(data.installment_id){
      // refresh installments
      try{
        const res=await fetch(`/api/debts/${debtId}/installments`).then(r=>r.json());
        if(res.data) useDebtStore.getState().setInstallments(res.data.filter((i:DebtInstallment)=>i.debt_id===debtId).concat(useDebtStore.getState().installments.filter(i=>i.debt_id!==debtId)));
      }catch{}
    }
    // atualizar debt status local: refetch debt
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
    const [dJ,pJ,iJ]=await Promise.all([dR.json(), pR.json(), iR.json().catch(()=>({data:[]} ))]);
    if(dJ.data) useDebtStore.getState().setDebts(dJ.data);
    if(pJ.data) useDebtStore.getState().setPayments(pJ.data);
    if(iJ.data) useDebtStore.getState().setInstallments(iJ.data);
  }
};
