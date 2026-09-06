-- 021 - Repair applied 020 composite assignment and add atomic internal transfers.
-- Keep fingerprints and saved responses from 020 compatible with existing retries.
begin;

create or replace function public.create_transaction_idempotent_with_audit(p_idempotency_key uuid, p_type text, p_amount numeric, p_description text, p_category_id uuid, p_category_name text, p_account_id uuid, p_occurred_at timestamptz, p_notes text, p_payment_method text, p_is_recurring boolean)
returns public.transactions language plpgsql security definer set search_path = public as $$
declare v_user uuid:=auth.uid(); v_fingerprint text:=md5(concat_ws('|',p_type,p_amount,p_description,p_category_id,p_category_name,p_account_id,p_occurred_at,p_notes,p_payment_method,p_is_recurring)); v_saved jsonb; v_tx public.transactions;
begin
  if v_user is null or p_idempotency_key is null then raise exception 'idempotency key required'; end if;
  insert into financial_operation_idempotency(user_id,operation,idempotency_key,fingerprint) values(v_user,'transaction',p_idempotency_key,v_fingerprint) on conflict do nothing;
  if not found then select fingerprint,response into v_fingerprint,v_saved from financial_operation_idempotency where user_id=v_user and operation='transaction' and idempotency_key=p_idempotency_key for update; if v_fingerprint <> md5(concat_ws('|',p_type,p_amount,p_description,p_category_id,p_category_name,p_account_id,p_occurred_at,p_notes,p_payment_method,p_is_recurring)) then raise exception 'idempotency key reuse'; end if; return jsonb_populate_record(null::transactions,v_saved); end if;
  v_tx := public.create_transaction_with_audit(p_type,p_amount,p_description,p_category_id,p_category_name,p_account_id,p_occurred_at,p_notes,p_payment_method,p_is_recurring);
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
  v_payment := public.add_debt_payment_with_audit(p_debt_id,p_amount,p_paid_at,p_notes,p_create_transaction,p_account_id,p_category_name,p_installment_id);
  update financial_operation_idempotency set response=to_jsonb(v_payment) where user_id=v_user and operation='debt_payment' and idempotency_key=p_idempotency_key;
  return v_payment;
end;
$$;
grant execute on function public.add_debt_payment_idempotent_with_audit(uuid,uuid,numeric,timestamptz,text,boolean,uuid,text,uuid) to authenticated;


-- No client writes: both sides are created only by the RPC below.
create table public.account_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  occurred_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);
alter table public.account_transfers enable row level security;
create policy "transfers select own" on public.account_transfers
  for select to authenticated using (user_id = auth.uid());
grant select on public.account_transfers to authenticated;
revoke insert, update, delete on public.account_transfers from anon, authenticated;

alter table public.transactions add column transfer_id uuid references public.account_transfers(id) on delete restrict;
create unique index transactions_transfer_side_uidx on public.transactions(transfer_id, type) where transfer_id is not null;
create index account_transfers_user_occurred_idx on public.account_transfers(user_id, occurred_at desc);
alter table public.financial_operation_idempotency drop constraint financial_operation_idempotency_operation_check;
alter table public.financial_operation_idempotency add constraint financial_operation_idempotency_operation_check
  check (operation in ('transaction','debt_payment','transfer'));

-- Immutable at table level, including calls to the older, unguarded RPCs.
-- No edit/delete/estorno API is offered for transfers in this version.
create function public.protect_account_transfer() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'account_transfers' then
    raise exception 'transfer is immutable';
  end if;
  if old.transfer_id is not null then raise exception 'transfer is immutable'; end if;
  if tg_op = 'UPDATE' and new.transfer_id is not null then raise exception 'transfer is immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger protect_transfer before update or delete on public.account_transfers
  for each row execute function public.protect_account_transfer();
create trigger protect_transfer_transaction before update or delete on public.transactions
  for each row execute function public.protect_account_transfer();

-- Deferred constraint checks the COMPLETE aggregate at commit, never just a leg.
create function public.check_account_transfer_integrity() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_transfer public.account_transfers; v_count int; v_matches int;
begin
  if tg_table_name = 'account_transfers' then v_id := new.id; else v_id := new.transfer_id; end if;
  if v_id is null then return null; end if;
  select * into v_transfer from account_transfers where id=v_id;
  select count(*), count(*) filter (where
    t.user_id=v_transfer.user_id and t.amount=v_transfer.amount and t.occurred_at=v_transfer.occurred_at
    and t.notes is not distinct from v_transfer.notes and t.category_id is null and not t.is_recurring
    and ((t.type='expense' and t.account_id=v_transfer.from_account_id)
      or (t.type='income' and t.account_id=v_transfer.to_account_id)))
    into v_count,v_matches from transactions t where t.transfer_id=v_id;
  if v_count <> 2 or v_matches <> 2 then raise exception 'incomplete transfer'; end if;
  if (select count(*) from accounts where user_id=v_transfer.user_id and id in (v_transfer.from_account_id,v_transfer.to_account_id)) <> 2
    then raise exception 'account not found'; end if;
  return null;
end;
$$;
create constraint trigger transfer_integrity after insert on public.account_transfers
  deferrable initially deferred for each row execute function public.check_account_transfer_integrity();
create constraint trigger transfer_legs_integrity after insert on public.transactions
  deferrable initially deferred for each row execute function public.check_account_transfer_integrity();

create or replace function public.create_account_transfer_idempotent_with_audit(
  p_idempotency_key uuid, p_from_account_id uuid, p_to_account_id uuid,
  p_amount numeric, p_occurred_at timestamptz, p_notes text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_fingerprint text; v_existing text; v_response jsonb;
  v_transfer public.account_transfers; v_out public.transactions; v_in public.transactions;
  v_from text; v_to text;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  if p_idempotency_key is null then raise exception 'idempotency key required'; end if;
  if p_from_account_id = p_to_account_id then raise exception 'same transfer account'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 999999999 or p_amount <> round(p_amount,2)
    or p_occurred_at is null or coalesce(length(p_notes),0) > 500 then raise exception 'invalid transfer'; end if;
  -- JSON preserves field positions, nulls and delimiters in user text.
  v_fingerprint := md5(jsonb_build_array(p_from_account_id,p_to_account_id,p_amount,p_occurred_at,p_notes)::text);
  insert into financial_operation_idempotency(user_id,operation,idempotency_key,fingerprint)
    values(v_user,'transfer',p_idempotency_key,v_fingerprint) on conflict do nothing;
  if not found then
    select fingerprint,response into v_existing,v_response from financial_operation_idempotency
      where user_id=v_user and operation='transfer' and idempotency_key=p_idempotency_key for update;
    if v_existing <> v_fingerprint then raise exception 'idempotency key reuse'; end if;
    return v_response;
  end if;
  -- Stable ordering and SHARE locks also serialize against account deactivation.
  perform id from accounts where user_id=v_user and is_active and id in(p_from_account_id,p_to_account_id) order by id for share;
  select name into v_from from accounts where id=p_from_account_id and user_id=v_user and is_active;
  if not found then raise exception 'account not found'; end if;
  select name into v_to from accounts where id=p_to_account_id and user_id=v_user and is_active;
  if not found then raise exception 'account not found'; end if;

  insert into account_transfers(user_id,from_account_id,to_account_id,amount,occurred_at,notes)
    values(v_user,p_from_account_id,p_to_account_id,p_amount,p_occurred_at,p_notes) returning * into v_transfer;
  insert into transactions(user_id,account_id,type,amount,description,occurred_at,notes,transfer_id)
    values(v_user,p_from_account_id,'expense',p_amount,'Transferência: ' || v_from || ' → ' || v_to,p_occurred_at,p_notes,v_transfer.id) returning * into v_out;
  insert into transactions(user_id,account_id,type,amount,description,occurred_at,notes,transfer_id)
    values(v_user,p_to_account_id,'income',p_amount,'Transferência: ' || v_from || ' → ' || v_to,p_occurred_at,p_notes,v_transfer.id) returning * into v_in;
  v_response := jsonb_build_object('transfer',to_jsonb(v_transfer),'transactions',jsonb_build_array(to_jsonb(v_out),to_jsonb(v_in)));
  insert into audit_logs(user_id,actor,action,entity,entity_id,after,origin)
    values(v_user,'Você','transferiu entre contas','account_transfer',v_transfer.id,v_response,'web');
  update financial_operation_idempotency set response=v_response
    where user_id=v_user and operation='transfer' and idempotency_key=p_idempotency_key;
  return v_response;
end;
$$;
revoke all on function public.create_account_transfer_idempotent_with_audit(uuid,uuid,uuid,numeric,timestamptz,text) from public;
grant execute on function public.create_account_transfer_idempotent_with_audit(uuid,uuid,uuid,numeric,timestamptz,text) to authenticated;
revoke all on function public.protect_account_transfer() from public;
revoke all on function public.check_account_transfer_integrity() from public;
revoke all on function public.create_transaction_idempotent_with_audit(uuid,text,numeric,text,uuid,text,uuid,timestamptz,text,text,boolean) from public;
revoke all on function public.add_debt_payment_idempotent_with_audit(uuid,uuid,numeric,timestamptz,text,boolean,uuid,text,uuid) from public;

create or replace function public.finance_summary(p_month text)
returns jsonb language sql security definer set search_path = public as $$
  with account_totals as (
    select a.id, a.initial_balance + coalesce(sum(case when t.type = 'income' then t.amount else -t.amount end), 0) as balance
    from accounts a left join transactions t on t.account_id = a.id and t.user_id = a.user_id
    where a.user_id = auth.uid() group by a.id, a.initial_balance, a.is_active
  ), month_totals as (
    select coalesce(sum(amount) filter (where type='income'),0) income, coalesce(sum(amount) filter (where type='expense'),0) expense, count(*) count
    from transactions where user_id=auth.uid() and transfer_id is null
      and to_char(occurred_at at time zone 'America/Sao_Paulo','YYYY-MM')=p_month
  )
  select jsonb_build_object('totalBalance', coalesce((select sum(at.balance) from account_totals at join accounts a on a.id=at.id where a.is_active),0), 'accountBalances', coalesce((select jsonb_object_agg(id,balance) from account_totals),'{}'::jsonb), 'month', (select jsonb_build_object('income',income,'expense',expense,'count',count) from month_totals));
$$;
notify pgrst, 'reload schema';
commit;
