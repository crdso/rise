-- 005 - Dívidas com histórico de pagamentos e parcelamentos

-- Atualiza tabela debts existente para suportar novo modelo
alter table public.debts add column if not exists description text;
alter table public.debts add column if not exists is_installment boolean not null default false;
alter table public.debts add column if not exists installments_count int;
alter table public.debts add column if not exists archived_at timestamptz;

-- Novos: debt_payments e debt_installments
create table if not exists public.debt_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  notes text,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists debt_payments_debt_idx on public.debt_payments(debt_id);
create index if not exists debt_payments_user_idx on public.debt_payments(user_id);

create table if not exists public.debt_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  installment_number int not null check (installment_number > 0),
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','paid','overdue')),
  created_at timestamptz not null default now(),
  unique(debt_id, installment_number)
);
create index if not exists debt_installments_debt_idx on public.debt_installments(debt_id);

-- RLS
alter table public.debt_payments enable row level security;
alter table public.debt_installments enable row level security;
drop policy if exists "owner all debt_payments" on public.debt_payments;
create policy "owner all debt_payments" on public.debt_payments for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "owner all debt_installments" on public.debt_installments;
create policy "owner all debt_installments" on public.debt_installments for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Função helper para calcular status derivado
create or replace function public.debt_status(p_amount numeric, p_paid numeric, p_due date) returns text language sql immutable as $$
  select case
    when p_paid >= p_amount then 'paid'
    when p_paid > 0 and p_paid < p_amount then 'partial'
    when p_due is not null and p_due < (now() at time zone 'America/Sao_Paulo')::date and p_paid < p_amount then 'overdue'
    else 'pending'
  end
$$;

-- CREATE DEBT com audit e parcelamento
create or replace function public.create_debt_with_audit(
  p_person text,
  p_description text,
  p_kind text,
  p_amount numeric,
  p_due_date date,
  p_notes text,
  p_is_installment boolean,
  p_installments_count int,
  p_first_due_date date
) returns public.debts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_debt public.debts;
  v_per numeric;
  v_rem numeric;
  i int;
  v_due date;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  insert into public.debts (user_id, person, description, kind, amount, due_date, notes, is_installment, installments_count, status)
  values (v_user, trim(p_person), nullif(trim(p_description),''), p_kind, p_amount, p_due_date, nullif(trim(p_notes),''), coalesce(p_is_installment,false), case when coalesce(p_is_installment,false) then p_installments_count else null end, 'pending')
  returning * into v_debt;

  if coalesce(p_is_installment,false) and p_installments_count is not null and p_first_due_date is not null then
    v_per := floor(p_amount / p_installments_count * 100)/100;
    v_rem := p_amount - v_per * (p_installments_count -1);
    for i in 1..p_installments_count loop
      v_due := (p_first_due_date + (i-1) * interval '1 month')::date;
      insert into public.debt_installments (user_id, debt_id, installment_number, amount, due_date)
      values (v_user, v_debt.id, i, case when i = p_installments_count then v_rem else v_per end, v_due);
    end loop;
  end if;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', 'criou uma dívida', 'debt', v_debt.id, to_jsonb(v_debt), 'web');
  return v_debt;
end;
$$;
revoke all on function public.create_debt_with_audit(text,text,text,numeric,date,text,boolean,int,date) from public;
grant execute on function public.create_debt_with_audit(text,text,text,numeric,date,text,boolean,int,date) to authenticated;

-- UPDATE DEBT
create or replace function public.update_debt_with_audit(
  p_id uuid,
  p_patch jsonb
) returns public.debts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_before public.debts;
  v_after public.debts;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.debts where id=p_id and user_id=v_user for update;
  if not found then raise exception 'debt not found'; end if;
  update public.debts set
    person = case when p_patch ? 'person' then trim(p_patch->>'person') else person end,
    description = case when p_patch ? 'description' then case when p_patch->>'description' is null then null else nullif(trim(p_patch->>'description'),'') end else description end,
    kind = case when p_patch ? 'kind' then p_patch->>'kind' else kind end,
    amount = case when p_patch ? 'amount' then (p_patch->>'amount')::numeric else amount end,
    due_date = case when p_patch ? 'due_date' then case when p_patch->>'due_date' is null or p_patch->>'due_date'='' then null else (p_patch->>'due_date')::date end else due_date end,
    notes = case when p_patch ? 'notes' then case when p_patch->>'notes' is null then null else nullif(trim(p_patch->>'notes'),'') end else notes end,
    archived_at = case when p_patch ? 'archived_at' then case when p_patch->>'archived_at' is null then null else (p_patch->>'archived_at')::timestamptz end else archived_at end,
    updated_at = now()
  where id=p_id and user_id=v_user returning * into v_after;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user, 'Você', 'editou uma dívida', 'debt', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
  return v_after;
end;
$$;
revoke all on function public.update_debt_with_audit(uuid,jsonb) from public;
grant execute on function public.update_debt_with_audit(uuid,jsonb) to authenticated;

-- ADD PAYMENT com opcional transaction atômico
create or replace function public.add_debt_payment_with_audit(
  p_debt_id uuid,
  p_amount numeric,
  p_paid_at timestamptz,
  p_notes text,
  p_create_transaction boolean,
  p_account_id uuid,
  p_category_name text,
  p_installment_id uuid
) returns public.debt_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_debt public.debts;
  v_pay public.debt_payments;
  v_tx_id uuid;
  v_cat_id uuid;
  v_paid_total numeric;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_debt from public.debts where id=p_debt_id and user_id=v_user for update;
  if not found then raise exception 'debt not found'; end if;

  if p_installment_id is not null then
    perform 1 from public.debt_installments where id=p_installment_id and debt_id=p_debt_id and user_id=v_user;
    if not found then raise exception 'installment not found'; end if;
  end if;

  if p_account_id is not null then
    perform 1 from public.accounts where id=p_account_id and user_id=v_user;
    if not found then raise exception 'account not found'; end if;
  end if;

  -- transação opcional
  if coalesce(p_create_transaction,false) then
    if p_category_name is not null and trim(p_category_name) <> '' then
      insert into public.transaction_categories (user_id, name) values (v_user, trim(p_category_name))
      on conflict (user_id, lower(trim(name))) do nothing;
      select id into v_cat_id from public.transaction_categories where user_id=v_user and lower(trim(name))=lower(trim(p_category_name)) limit 1;
    end if;
    insert into public.transactions (user_id, type, amount, description, category_id, account_id, occurred_at, notes, payment_method, is_recurring)
    values (v_user, case when v_debt.kind='owed' then 'expense' else 'income' end, p_amount, v_debt.person || ' - ' || coalesce(v_debt.description,''), v_cat_id, p_account_id, coalesce(p_paid_at, now()), p_notes, null, false)
    returning id into v_tx_id;
  end if;

  insert into public.debt_payments (user_id, debt_id, amount, paid_at, notes, transaction_id)
  values (v_user, p_debt_id, p_amount, coalesce(p_paid_at, now()), nullif(trim(p_notes),''), v_tx_id)
  returning * into v_pay;

  if p_installment_id is not null then
    update public.debt_installments set status='paid' where id=p_installment_id and debt_id=p_debt_id;
  end if;

  -- atualizar status da dívida derivado
  select coalesce(sum(amount),0) into v_paid_total from public.debt_payments where debt_id=p_debt_id and user_id=v_user;
  update public.debts set
    paid_amount = v_paid_total,
    status = public.debt_status(amount, v_paid_total, due_date),
    updated_at = now()
  where id=p_debt_id and user_id=v_user;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', 'registrou um pagamento', 'debt_payment', v_pay.id, to_jsonb(v_pay), 'web');

  return v_pay;
end;
$$;
revoke all on function public.add_debt_payment_with_audit(uuid,numeric,timestamptz,text,boolean,uuid,text,uuid) from public;
grant execute on function public.add_debt_payment_with_audit(uuid,numeric,timestamptz,text,boolean,uuid,text,uuid) to authenticated;

-- ARCHIVE
create or replace function public.archive_debt_with_audit(p_id uuid) returns public.debts
language plpgsql security definer set search_path=public as $$
declare v_user uuid := auth.uid(); v_after public.debts;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  update public.debts set archived_at=now(), updated_at=now() where id=p_id and user_id=v_user returning * into v_after;
  if not found then raise exception 'debt not found'; end if;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin) values (v_user,'Você','arquivou uma dívida','debt',p_id,to_jsonb(v_after),'web');
  return v_after;
end;
$$;
revoke all on function public.archive_debt_with_audit(uuid) from public;
grant execute on function public.archive_debt_with_audit(uuid) to authenticated;
