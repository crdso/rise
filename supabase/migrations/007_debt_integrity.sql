-- 007 - Hardening dívidas: installment_id, status partial, overdue priority, RLS, date helper

-- 4. installment_id
alter table public.debt_payments add column if not exists installment_id uuid references public.debt_installments(id) on delete set null;
create index if not exists debt_payments_installment_idx on public.debt_payments(installment_id);

-- 5. installment status partial
alter table public.debt_installments drop constraint if exists debt_installments_status_check;
alter table public.debt_installments add constraint debt_installments_status_check check (status in ('pending','partial','paid','overdue'));

-- 7 & 8. debt_status com ordem correta e STABLE, America/Sao_Paulo
create or replace function public.debt_status(p_amount numeric, p_paid numeric, p_due date) returns text
language sql stable
as $$
  select case
    when p_paid >= p_amount - 0.005 then 'paid'
    when p_due is not null and p_due < (now() at time zone 'America/Sao_Paulo')::date and p_paid < p_amount then 'overdue'
    when p_paid > 0 and p_paid < p_amount then 'partial'
    else 'pending'
  end
$$;

-- helper para adicionar meses preservando último dia do mês
create or replace function public.add_months_preserve_eom(p_date date, p_months int) returns date
language plpgsql immutable as $$
declare
  v_year int;
  v_month int;
  v_day int;
  v_target_month int;
  v_target_year int;
  v_last_day int;
begin
  v_year := extract(year from p_date);
  v_month := extract(month from p_date);
  v_day := extract(day from p_date);
  v_target_month := v_month + p_months;
  v_target_year := v_year + (v_target_month-1)/12;
  v_target_month := ((v_target_month-1) % 12) + 1;
  -- último dia do mês alvo
  v_last_day := extract(day from (date_trunc('month', make_date(v_target_year, v_target_month, 1) + interval '1 month') - interval '1 day'));
  if v_day > v_last_day then
    return make_date(v_target_year, v_target_month, v_last_day);
  else
    return make_date(v_target_year, v_target_month, v_day);
  end if;
end;
$$;

-- atualizar create_debt para usar helper de data
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
      v_due := public.add_months_preserve_eom(p_first_due_date, i-1);
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

-- update_debt com validação amount >= pago e bloqueio parcela edição
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
  v_paid numeric;
  v_new_amount numeric;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.debts where id=p_id and user_id=v_user for update;
  if not found then raise exception 'debt not found'; end if;

  -- bloquear alteração de parcelamento
  if v_before.is_installment and (p_patch ? 'is_installment' or p_patch ? 'installments_count' or p_patch ? 'first_due_date') then
    raise exception 'parcelamento não pode ser alterado após criação';
  end if;
  if not v_before.is_installment and (p_patch ? 'is_installment' and (p_patch->>'is_installment')::boolean) then
    raise exception 'não é possível transformar em parcelado via edição';
  end if;

  -- validar amount >= já pago
  if p_patch ? 'amount' then
    v_new_amount := (p_patch->>'amount')::numeric;
    select coalesce(sum(amount),0) into v_paid from public.debt_payments where debt_id=p_id and user_id=v_user;
    if v_new_amount < v_paid - 0.005 then raise exception 'valor não pode ser menor que o já pago (%)', v_paid; end if;
  end if;

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

  -- recalcular status
  select coalesce(sum(amount),0) into v_paid from public.debt_payments where debt_id=p_id and user_id=v_user;
  update public.debts set status = public.debt_status(v_after.amount, v_paid, v_after.due_date) where id=p_id;

  select * into v_after from public.debts where id=p_id;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user, 'Você', 'editou uma dívida', 'debt', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
  return v_after;
end;
$$;
revoke all on function public.update_debt_with_audit(uuid,jsonb) from public;
grant execute on function public.update_debt_with_audit(uuid,jsonb) to authenticated;

-- add_debt_payment com installment_id, partial logic e overpayment block
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
  v_paid_installment numeric;
  v_inst public.debt_installments;
  v_inst_remaining numeric;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_debt from public.debts where id=p_debt_id and user_id=v_user for update;
  if not found then raise exception 'debt not found'; end if;

  -- overpayment check dívida
  select coalesce(sum(amount),0) into v_paid_total from public.debt_payments where debt_id=p_debt_id and user_id=v_user;
  if p_amount > (v_debt.amount - v_paid_total) + 0.005 then raise exception 'pagamento maior que o restante da dívida (%)', (v_debt.amount - v_paid_total); end if;

  if p_installment_id is not null then
    select * into v_inst from public.debt_installments where id=p_installment_id and debt_id=p_debt_id and user_id=v_user for update;
    if not found then raise exception 'installment not found'; end if;
    select coalesce(sum(amount),0) into v_paid_installment from public.debt_payments where installment_id=p_installment_id and user_id=v_user;
    v_inst_remaining := v_inst.amount - v_paid_installment;
    if p_amount > v_inst_remaining + 0.005 then raise exception 'pagamento maior que o restante da parcela (%)', v_inst_remaining; end if;
  end if;

  if p_account_id is not null then
    perform 1 from public.accounts where id=p_account_id and user_id=v_user;
    if not found then raise exception 'account not found'; end if;
  end if;

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

  insert into public.debt_payments (user_id, debt_id, amount, paid_at, notes, transaction_id, installment_id)
  values (v_user, p_debt_id, p_amount, coalesce(p_paid_at, now()), nullif(trim(p_notes),''), v_tx_id, p_installment_id)
  returning * into v_pay;

  -- atualizar status da parcela com partial
  if p_installment_id is not null then
    select coalesce(sum(amount),0) into v_paid_installment from public.debt_payments where installment_id=p_installment_id and user_id=v_user;
    update public.debt_installments set status = case
      when v_paid_installment >= v_inst.amount -0.005 then 'paid'
      when v_paid_installment > 0 and v_paid_installment < v_inst.amount and v_inst.due_date < (now() at time zone 'America/Sao_Paulo')::date then 'overdue'
      when v_paid_installment > 0 then 'partial'
      when v_inst.due_date < (now() at time zone 'America/Sao_Paulo')::date then 'overdue'
      else 'pending'
    end where id=p_installment_id;
  end if;

  -- atualizar status da dívida
  select coalesce(sum(amount),0) into v_paid_total from public.debt_payments where debt_id=p_debt_id and user_id=v_user;
  update public.debts set paid_amount = v_paid_total, status = public.debt_status(amount, v_paid_total, due_date), updated_at = now() where id=p_debt_id and user_id=v_user;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', 'registrou um pagamento', 'debt_payment', v_pay.id, to_jsonb(v_pay), 'web');
  return v_pay;
end;
$$;
revoke all on function public.add_debt_payment_with_audit(uuid,numeric,timestamptz,text,boolean,uuid,text,uuid) from public;
grant execute on function public.add_debt_payment_with_audit(uuid,numeric,timestamptz,text,boolean,uuid,text,uuid) to authenticated;

-- RLS: apenas SELECT para authenticated, escritas via RPC
drop policy if exists "owner all debts" on public.debts;
create policy "debts select own" on public.debts for select to authenticated using (auth.uid()=user_id);

drop policy if exists "owner all debt_payments" on public.debt_payments;
create policy "debt_payments select own" on public.debt_payments for select to authenticated using (auth.uid()=user_id);

drop policy if exists "owner all debt_installments" on public.debt_installments;
create policy "debt_installments select own" on public.debt_installments for select to authenticated using (auth.uid()=user_id);

-- garantir RLS habilitado
alter table public.debts enable row level security;
alter table public.debt_payments enable row level security;
alter table public.debt_installments enable row level security;
