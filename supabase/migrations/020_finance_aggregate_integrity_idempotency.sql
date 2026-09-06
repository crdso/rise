-- 020 - Authoritative finance aggregates, payment-linked transaction guards and idempotent writes.
create table if not exists public.financial_operation_idempotency (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (operation in ('transaction','debt_payment')),
  idempotency_key uuid not null,
  fingerprint text not null,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, operation, idempotency_key)
);
alter table public.financial_operation_idempotency enable row level security;

create or replace function public.finance_summary(p_month text)
returns jsonb language sql security definer set search_path = public as $$
  with account_totals as (
    select a.id, a.initial_balance + coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as balance
    from accounts a left join transactions t on t.account_id = a.id and t.user_id = a.user_id
    where a.user_id = auth.uid() group by a.id, a.initial_balance, a.is_active
  ), month_totals as (
    select coalesce(sum(amount) filter (where type='income'),0) income, coalesce(sum(amount) filter (where type='expense'),0) expense, count(*) count
    from transactions where user_id=auth.uid() and to_char(occurred_at at time zone 'America/Sao_Paulo','YYYY-MM')=p_month
  )
  select jsonb_build_object('totalBalance', coalesce((select sum(at.balance) from account_totals at join accounts a on a.id=at.id where a.is_active),0), 'accountBalances', coalesce((select jsonb_object_agg(id,balance) from account_totals),'{}'::jsonb), 'month', (select jsonb_build_object('income',income,'expense',expense,'count',count) from month_totals));
$$;
revoke all on function public.finance_summary(text) from public;
grant execute on function public.finance_summary(text) to authenticated;

create or replace function public.create_transaction_idempotent_with_audit(p_idempotency_key uuid, p_type text, p_amount numeric, p_description text, p_category_id uuid, p_category_name text, p_account_id uuid, p_occurred_at timestamptz, p_notes text, p_payment_method text, p_is_recurring boolean)
returns public.transactions language plpgsql security definer set search_path = public as $$
declare v_user uuid:=auth.uid(); v_fingerprint text:=md5(concat_ws('|',p_type,p_amount,p_description,p_category_id,p_category_name,p_account_id,p_occurred_at,p_notes,p_payment_method,p_is_recurring)); v_saved jsonb; v_tx public.transactions;
begin
  if v_user is null or p_idempotency_key is null then raise exception 'idempotency key required'; end if;
  insert into financial_operation_idempotency(user_id,operation,idempotency_key,fingerprint) values(v_user,'transaction',p_idempotency_key,v_fingerprint) on conflict do nothing;
  if not found then select fingerprint,response into v_fingerprint,v_saved from financial_operation_idempotency where user_id=v_user and operation='transaction' and idempotency_key=p_idempotency_key for update; if v_fingerprint <> md5(concat_ws('|',p_type,p_amount,p_description,p_category_id,p_category_name,p_account_id,p_occurred_at,p_notes,p_payment_method,p_is_recurring)) then raise exception 'idempotency key reuse'; end if; return jsonb_populate_record(null::transactions,v_saved); end if;
  select public.create_transaction_with_audit(p_type,p_amount,p_description,p_category_id,p_category_name,p_account_id,p_occurred_at,p_notes,p_payment_method,p_is_recurring) into v_tx;
  update financial_operation_idempotency set response=to_jsonb(v_tx) where user_id=v_user and operation='transaction' and idempotency_key=p_idempotency_key;
  return v_tx;
end;
$$;
grant execute on function public.create_transaction_idempotent_with_audit(uuid,text,numeric,text,uuid,text,uuid,timestamptz,text,text,boolean) to authenticated;

create or replace function public.add_debt_payment_idempotent_with_audit(p_idempotency_key uuid, p_debt_id uuid, p_amount numeric, p_paid_at timestamptz, p_notes text, p_create_transaction boolean, p_account_id uuid, p_category_name text, p_installment_id uuid)
returns public.debt_payments language plpgsql security definer set search_path = public as $$
declare v_user uuid:=auth.uid(); v_fingerprint text:=md5(concat_ws('|',p_debt_id,p_amount,p_paid_at,p_notes,p_create_transaction,p_account_id,p_category_name,p_installment_id)); v_saved jsonb; v_payment public.debt_payments;
begin
  if v_user is null or p_idempotency_key is null then raise exception 'idempotency key required'; end if;
  insert into financial_operation_idempotency(user_id,operation,idempotency_key,fingerprint) values(v_user,'debt_payment',p_idempotency_key,v_fingerprint) on conflict do nothing;
  if not found then select fingerprint,response into v_fingerprint,v_saved from financial_operation_idempotency where user_id=v_user and operation='debt_payment' and idempotency_key=p_idempotency_key for update; if v_fingerprint <> md5(concat_ws('|',p_debt_id,p_amount,p_paid_at,p_notes,p_create_transaction,p_account_id,p_category_name,p_installment_id)) then raise exception 'idempotency key reuse'; end if; return jsonb_populate_record(null::debt_payments,v_saved); end if;
  select public.add_debt_payment_with_audit(p_debt_id,p_amount,p_paid_at,p_notes,p_create_transaction,p_account_id,p_category_name,p_installment_id) into v_payment;
  update financial_operation_idempotency set response=to_jsonb(v_payment) where user_id=v_user and operation='debt_payment' and idempotency_key=p_idempotency_key;
  return v_payment;
end;
$$;
grant execute on function public.add_debt_payment_idempotent_with_audit(uuid,uuid,numeric,timestamptz,text,boolean,uuid,text,uuid) to authenticated;

create or replace function public.update_transaction_guarded_with_audit(p_id uuid,p_patch jsonb) returns public.transactions language plpgsql security definer set search_path=public as $$
begin if exists(select 1 from debt_payments where transaction_id=p_id and user_id=auth.uid()) then raise exception 'linked debt payment transaction must be changed through the payment flow'; end if; return public.update_transaction_with_audit(p_id,p_patch); end; $$;
create or replace function public.delete_transaction_guarded_with_audit(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin if exists(select 1 from debt_payments where transaction_id=p_id and user_id=auth.uid()) then raise exception 'linked debt payment transaction must be changed through the payment flow'; end if; perform public.delete_transaction_with_audit(p_id); end; $$;
grant execute on function public.update_transaction_guarded_with_audit(uuid,jsonb) to authenticated;
grant execute on function public.delete_transaction_guarded_with_audit(uuid) to authenticated;
notify pgrst, 'reload schema';
