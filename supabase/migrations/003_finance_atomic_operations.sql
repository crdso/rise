-- 003 - Hardening finanças: atomicidade, case-insensitive categorias, saldo negativo

-- 5. Permitir saldo inicial negativo
alter table public.accounts alter column initial_balance type numeric(12,2);
-- remove eventual check min 0 se existir (não havia check explícito, mas garantir)
do $$ begin
  -- tenta remover check se existir
  execute 'alter table public.accounts drop constraint if exists accounts_initial_balance_check';
exception when others then null;
end $$;

-- 2. Categorias case-insensitive: trim + lower
-- remover constraint única antiga (user_id, name) se for case-sensitive
alter table public.transaction_categories drop constraint if exists transaction_categories_user_id_name_key;
-- criar índice único por usuário em lower(trim(name))
create unique index if not exists transaction_categories_user_lower_name_idx
  on public.transaction_categories (user_id, lower(trim(name)));

-- Helper para normalizar nome
create or replace function public.normalize_category_name(n text) returns text language sql immutable as $$ select lower(trim(n)) $$;

-- 1. Funções atômicas com audit log - todas SECURITY DEFINER com search_path restrito
-- Garantir audit_logs só via service role: já sem policy de INSERT para authenticated (001+002)

-- CREATE ACCOUNT com audit
create or replace function public.create_account_with_audit(
  p_user_id uuid,
  p_name text,
  p_type text,
  p_icon text,
  p_color text,
  p_initial_balance numeric
) returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acc public.accounts;
begin
  if p_user_id is null then raise exception 'user required'; end if;
  insert into public.accounts (user_id, name, type, icon, color, initial_balance)
  values (p_user_id, trim(p_name), p_type, nullif(trim(p_icon),''), nullif(trim(p_color),''), p_initial_balance)
  returning * into v_acc;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (p_user_id, 'Você', 'criou uma conta', 'account', v_acc.id, to_jsonb(v_acc), 'web');

  return v_acc;
end;
$$;
revoke all on function public.create_account_with_audit(uuid,text,text,text,text,numeric) from public;
grant execute on function public.create_account_with_audit(uuid,text,text,text,text,numeric) to authenticated;

-- UPDATE ACCOUNT com audit (inclui ativar/desativar)
create or replace function public.update_account_with_audit(
  p_user_id uuid,
  p_id uuid,
  p_name text,
  p_type text,
  p_icon text,
  p_color text,
  p_initial_balance numeric,
  p_is_active boolean
) returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.accounts;
  v_after public.accounts;
  v_action text;
begin
  select * into v_before from public.accounts where id = p_id and user_id = p_user_id for update;
  if not found then raise exception 'account not found'; end if;

  update public.accounts set
    name = coalesce(trim(p_name), name),
    type = coalesce(p_type, type),
    icon = case when p_icon is not null then nullif(trim(p_icon),'') else icon end,
    color = case when p_color is not null then nullif(trim(p_color),'') else color end,
    initial_balance = coalesce(p_initial_balance, initial_balance),
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where id = p_id and user_id = p_user_id
  returning * into v_after;

  if p_is_active is not null and p_is_active <> v_before.is_active then
    v_action := case when p_is_active then 'ativou uma conta' else 'desativou uma conta' end;
  else
    v_action := 'editou uma conta';
  end if;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (p_user_id, 'Você', v_action, 'account', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');

  return v_after;
end;
$$;
revoke all on function public.update_account_with_audit(uuid,uuid,text,text,text,text,numeric,boolean) from public;
grant execute on function public.update_account_with_audit(uuid,uuid,text,text,text,text,numeric,boolean) to authenticated;

-- CREATE TRANSACTION com audit e ownership + categoria dedup
create or replace function public.create_transaction_with_audit(
  p_user_id uuid,
  p_type text,
  p_amount numeric,
  p_description text,
  p_category_id uuid,
  p_category_name text,
  p_account_id uuid,
  p_occurred_at timestamptz,
  p_notes text,
  p_payment_method text,
  p_is_recurring boolean
) returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat_id uuid;
  v_tx public.transactions;
begin
  if p_user_id is null then raise exception 'user required'; end if;

  -- ownership validações
  if p_account_id is not null then
    perform 1 from public.accounts where id = p_account_id and user_id = p_user_id;
    if not found then raise exception 'account not found'; end if;
  end if;
  if p_category_id is not null then
    perform 1 from public.transaction_categories where id = p_category_id and user_id = p_user_id;
    if not found then raise exception 'category not found'; end if;
  end if;

  -- categoria por nome com dedup case-insensitive
  v_cat_id := p_category_id;
  if v_cat_id is null and p_category_name is not null and trim(p_category_name) <> '' then
    select id into v_cat_id from public.transaction_categories
    where user_id = p_user_id and lower(trim(name)) = lower(trim(p_category_name))
    limit 1;
    if v_cat_id is null then
      insert into public.transaction_categories (user_id, name)
      values (p_user_id, trim(p_category_name))
      returning id into v_cat_id;
    end if;
  end if;

  insert into public.transactions (user_id, type, amount, description, category_id, account_id, occurred_at, notes, payment_method, is_recurring)
  values (p_user_id, p_type, p_amount, nullif(trim(p_description),''), v_cat_id, p_account_id, p_occurred_at, nullif(trim(p_notes),''), nullif(trim(p_payment_method),''), coalesce(p_is_recurring,false))
  returning * into v_tx;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (p_user_id, 'Você', case when p_type='expense' then 'criou uma despesa' else 'criou uma receita' end, 'transaction', v_tx.id, to_jsonb(v_tx), 'web');

  return v_tx;
end;
$$;
revoke all on function public.create_transaction_with_audit(uuid,text,numeric,text,uuid,text,uuid,timestamptz,text,text,boolean) from public;
grant execute on function public.create_transaction_with_audit(uuid,text,numeric,text,uuid,text,uuid,timestamptz,text,text,boolean) to authenticated;

-- UPDATE TRANSACTION com audit
create or replace function public.update_transaction_with_audit(
  p_user_id uuid,
  p_id uuid,
  p_type text,
  p_amount numeric,
  p_description text,
  p_category_id uuid,
  p_category_name text,
  p_account_id uuid,
  p_occurred_at timestamptz,
  p_notes text,
  p_payment_method text,
  p_is_recurring boolean
) returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.transactions;
  v_after public.transactions;
  v_cat_id uuid;
begin
  select * into v_before from public.transactions where id = p_id and user_id = p_user_id for update;
  if not found then raise exception 'transaction not found'; end if;

  if p_account_id is not null then
    perform 1 from public.accounts where id = p_account_id and user_id = p_user_id;
    if not found then raise exception 'account not found'; end if;
  end if;
  if p_category_id is not null then
    perform 1 from public.transaction_categories where id = p_category_id and user_id = p_user_id;
    if not found then raise exception 'category not found'; end if;
  end if;

  v_cat_id := p_category_id;
  if v_cat_id is null and p_category_name is not null and trim(p_category_name) <> '' then
    select id into v_cat_id from public.transaction_categories where user_id = p_user_id and lower(trim(name)) = lower(trim(p_category_name)) limit 1;
    if v_cat_id is null then
      insert into public.transaction_categories (user_id, name) values (p_user_id, trim(p_category_name)) returning id into v_cat_id;
    end if;
  end if;

  update public.transactions set
    type = coalesce(p_type, type),
    amount = coalesce(p_amount, amount),
    description = case when p_description is not null then nullif(trim(p_description),'') else description end,
    category_id = case when v_cat_id is not null then v_cat_id when p_category_id is not null then p_category_id when p_category_name is not null then v_cat_id else category_id end,
    account_id = case when p_account_id is not null then p_account_id else account_id end,
    occurred_at = coalesce(p_occurred_at, occurred_at),
    notes = case when p_notes is not null then nullif(trim(p_notes),'') else notes end,
    payment_method = case when p_payment_method is not null then nullif(trim(p_payment_method),'') else payment_method end,
    is_recurring = coalesce(p_is_recurring, is_recurring),
    updated_at = now()
  where id = p_id and user_id = p_user_id
  returning * into v_after;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (p_user_id, 'Você', 'editou uma transação', 'transaction', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');

  return v_after;
end;
$$;
revoke all on function public.update_transaction_with_audit(uuid,uuid,text,numeric,text,uuid,text,uuid,timestamptz,text,text,boolean) from public;
grant execute on function public.update_transaction_with_audit(uuid,uuid,text,numeric,text,uuid,text,uuid,timestamptz,text,text,boolean) to authenticated;

-- DELETE TRANSACTION com audit
create or replace function public.delete_transaction_with_audit(
  p_user_id uuid,
  p_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before public.transactions;
begin
  select * into v_before from public.transactions where id = p_id and user_id = p_user_id for update;
  if not found then raise exception 'transaction not found'; end if;

  delete from public.transactions where id = p_id and user_id = p_user_id;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, origin)
  values (p_user_id, 'Você', 'excluiu uma transação', 'transaction', p_id, to_jsonb(v_before), 'web');
end;
$$;
revoke all on function public.delete_transaction_with_audit(uuid,uuid) from public;
grant execute on function public.delete_transaction_with_audit(uuid,uuid) to authenticated;
