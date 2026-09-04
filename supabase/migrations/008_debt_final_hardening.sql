-- 008 - Debt final hardening: amount immutable for is_installment, overdue derived, installment partial

-- Ensure is_installment amount immutable
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

  if v_before.is_installment and (p_patch ? 'is_installment' or p_patch ? 'installments_count' or p_patch ? 'first_due_date') then
    raise exception 'parcelamento não pode ser alterado após criação';
  end if;
  if not v_before.is_installment and (p_patch ? 'is_installment' and (p_patch->>'is_installment')::boolean) then
    raise exception 'não é possível transformar em parcelado via edição';
  end if;

  -- amount immutable for is_installment
  if v_before.is_installment and (p_patch ? 'amount') then
    v_new_amount := (p_patch->>'amount')::numeric;
    if v_new_amount is distinct from v_before.amount then
      raise exception 'valor total de dívida parcelada não pode ser alterado';
    end if;
  end if;

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

  -- recalcular status com lógica parcelada
  select coalesce(sum(amount),0) into v_paid from public.debt_payments where debt_id=p_id and user_id=v_user;
  if v_after.is_installment then
    -- verifica se alguma parcela vencida com saldo
    if exists (select 1 from public.debt_installments di where di.debt_id=p_id and di.user_id=v_user and di.due_date < (now() at time zone 'America/Sao_Paulo')::date and (select coalesce(sum(amount),0) from public.debt_payments where installment_id=di.id) < di.amount -0.005) and v_paid < v_after.amount -0.005 then
      update public.debts set status='overdue' where id=p_id;
    elsif v_paid >= v_after.amount -0.005 then
      update public.debts set status='paid' where id=p_id;
    elsif v_paid > 0 then
      update public.debts set status='partial' where id=p_id;
    else
      update public.debts set status='pending' where id=p_id;
    end if;
  else
    update public.debts set status = public.debt_status(v_after.amount, v_paid, v_after.due_date) where id=p_id;
  end if;

  select * into v_after from public.debts where id=p_id;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user, 'Você', 'editou uma dívida', 'debt', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
  return v_after;
end;
$$;
revoke all on function public.update_debt_with_audit(uuid,jsonb) from public;
grant execute on function public.update_debt_with_audit(uuid,jsonb) to authenticated;

-- helper para status de parcela derivado
create or replace function public.installment_status(p_amount numeric, p_paid numeric, p_due date) returns text
language sql stable
as $$
  select case
    when p_paid >= p_amount -0.005 then 'paid'
    when p_due < (now() at time zone 'America/Sao_Paulo')::date and p_paid < p_amount -0.005 then 'overdue'
    when p_paid > 0 and p_paid < p_amount then 'partial'
    else 'pending'
  end
$$;

-- atualiza add_debt_payment para usar helper e overdue derivado
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
  if p_installment_id is not null then
    select coalesce(sum(amount),0) into v_paid_installment from public.debt_payments where installment_id=p_installment_id and user_id=v_user;
    update public.debt_installments set status = public.installment_status(v_inst.amount, v_paid_installment, v_inst.due_date) where id=p_installment_id;
  end if;
  select coalesce(sum(amount),0) into v_paid_total from public.debt_payments where debt_id=p_debt_id and user_id=v_user;
  -- atualiza status da dívida com lógica parcelada
  if v_debt.is_installment then
    if v_paid_total >= v_debt.amount -0.005 then
      update public.debts set paid_amount=v_paid_total, status='paid', updated_at=now() where id=p_debt_id;
    elsif exists (select 1 from public.debt_installments di where di.debt_id=p_debt_id and di.user_id=v_user and di.due_date < (now() at time zone 'America/Sao_Paulo')::date and (select coalesce(sum(amount),0) from public.debt_payments where installment_id=di.id) < di.amount -0.005) then
      update public.debts set paid_amount=v_paid_total, status='overdue', updated_at=now() where id=p_debt_id;
    elsif v_paid_total >0 then
      update public.debts set paid_amount=v_paid_total, status='partial', updated_at=now() where id=p_debt_id;
    else
      update public.debts set paid_amount=v_paid_total, status='pending', updated_at=now() where id=p_debt_id;
    end if;
  else
    update public.debts set paid_amount=v_paid_total, status=public.debt_status(v_debt.amount, v_paid_total, v_debt.due_date), updated_at=now() where id=p_debt_id;
  end if;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', 'registrou um pagamento', 'debt_payment', v_pay.id, to_jsonb(v_pay), 'web');
  return v_pay;
end;
$$;
revoke all on function public.add_debt_payment_with_audit(uuid,numeric,timestamptz,text,boolean,uuid,text,uuid) from public;
grant execute on function public.add_debt_payment_with_audit(uuid,numeric,timestamptz,text,boolean,uuid,text,uuid) to authenticated;
