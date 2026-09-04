-- 004 - Secure RPCs (auth.uid), ON CONFLICT for categories, JSONB patch for null vs missing

-- Ensure unique index exists (from 003)
create unique index if not exists transaction_categories_user_lower_name_idx
  on public.transaction_categories (user_id, lower(trim(name)));

-- Drop old insecure RPCs with p_user_id
drop function if exists public.create_account_with_audit(uuid,text,text,text,text,numeric);
drop function if exists public.update_account_with_audit(uuid,uuid,text,text,text,text,numeric,boolean);
drop function if exists public.create_transaction_with_audit(uuid,text,numeric,text,uuid,text,uuid,timestamptz,text,text,boolean);
drop function if exists public.update_transaction_with_audit(uuid,uuid,text,numeric,text,uuid,text,uuid,timestamptz,text,text,boolean);
drop function if exists public.delete_transaction_with_audit(uuid,uuid);

-- Secure create account
create or replace function public.create_account_with_audit(
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
  v_user_id uuid := auth.uid();
  v_acc public.accounts;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;
  insert into public.accounts (user_id, name, type, icon, color, initial_balance)
  values (v_user_id, trim(p_name), p_type, nullif(trim(p_icon),''), nullif(trim(p_color),''), p_initial_balance)
  returning * into v_acc;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user_id, 'Você', 'criou uma conta', 'account', v_acc.id, to_jsonb(v_acc), 'web');
  return v_acc;
end;
$$;
revoke all on function public.create_account_with_audit(text,text,text,text,numeric) from public;
grant execute on function public.create_account_with_audit(text,text,text,text,numeric) to authenticated;

-- Secure update account with JSONB patch (distinguishes missing vs null)
create or replace function public.update_account_with_audit(
  p_id uuid,
  p_patch jsonb
) returns public.accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_before public.accounts;
  v_after public.accounts;
  v_action text;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.accounts where id = p_id and user_id = v_user_id for update;
  if not found then raise exception 'account not found'; end if;

  update public.accounts set
    name = case when p_patch ? 'name' then trim(p_patch->>'name') else name end,
    type = case when p_patch ? 'type' then p_patch->>'type' else type end,
    icon = case when p_patch ? 'icon' then case when p_patch->>'icon' is null then null else nullif(trim(p_patch->>'icon'),'') end else icon end,
    color = case when p_patch ? 'color' then case when p_patch->>'color' is null then null else nullif(trim(p_patch->>'color'),'') end else color end,
    initial_balance = case when p_patch ? 'initial_balance' then (p_patch->>'initial_balance')::numeric else initial_balance end,
    is_active = case when p_patch ? 'is_active' then (p_patch->>'is_active')::boolean else is_active end,
    updated_at = now()
  where id = p_id and user_id = v_user_id
  returning * into v_after;

  if (p_patch ? 'is_active') and (p_patch->>'is_active')::boolean is distinct from v_before.is_active then
    v_action := case when (p_patch->>'is_active')::boolean then 'ativou uma conta' else 'desativou uma conta' end;
  else
    v_action := 'editou uma conta';
  end if;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user_id, 'Você', v_action, 'account', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
  return v_after;
end;
$$;
revoke all on function public.update_account_with_audit(uuid,jsonb) from public;
grant execute on function public.update_account_with_audit(uuid,jsonb) to authenticated;

-- Secure create transaction with dedup ON CONFLICT
create or replace function public.create_transaction_with_audit(
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
  v_user_id uuid := auth.uid();
  v_cat_id uuid;
  v_tx public.transactions;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;
  if p_account_id is not null then
    perform 1 from public.accounts where id = p_account_id and user_id = v_user_id;
    if not found then raise exception 'account not found'; end if;
  end if;
  if p_category_id is not null then
    perform 1 from public.transaction_categories where id = p_category_id and user_id = v_user_id;
    if not found then raise exception 'category not found'; end if;
  end if;
  v_cat_id := p_category_id;
  if v_cat_id is null and p_category_name is not null and trim(p_category_name) <> '' then
    -- try ON CONFLICT insert, then select
    insert into public.transaction_categories (user_id, name)
    values (v_user_id, trim(p_category_name))
    on conflict (user_id, lower(trim(name))) do nothing;
    select id into v_cat_id from public.transaction_categories where user_id = v_user_id and lower(trim(name)) = lower(trim(p_category_name)) limit 1;
  end if;
  insert into public.transactions (user_id, type, amount, description, category_id, account_id, occurred_at, notes, payment_method, is_recurring)
  values (v_user_id, p_type, p_amount, nullif(trim(p_description),''), v_cat_id, p_account_id, p_occurred_at, nullif(trim(p_notes),''), nullif(trim(p_payment_method),''), coalesce(p_is_recurring,false))
  returning * into v_tx;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user_id, 'Você', case when p_type='expense' then 'criou uma despesa' else 'criou uma receita' end, 'transaction', v_tx.id, to_jsonb(v_tx), 'web');
  return v_tx;
end;
$$;
revoke all on function public.create_transaction_with_audit(text,numeric,text,uuid,text,uuid,timestamptz,text,text,boolean) from public;
grant execute on function public.create_transaction_with_audit(text,numeric,text,uuid,text,uuid,timestamptz,text,text,boolean) to authenticated;

-- Secure update transaction with JSONB patch (null vs missing)
create or replace function public.update_transaction_with_audit(
  p_id uuid,
  p_patch jsonb
) returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_before public.transactions;
  v_after public.transactions;
  v_cat_id uuid;
  v_has_cat boolean := p_patch ? 'category_id';
  v_has_cat_name boolean := p_patch ? 'category_name';
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.transactions where id = p_id and user_id = v_user_id for update;
  if not found then raise exception 'transaction not found'; end if;

  if (p_patch ? 'account_id') and p_patch->>'account_id' is not null then
    perform 1 from public.accounts where id = (p_patch->>'account_id')::uuid and user_id = v_user_id;
    if not found then raise exception 'account not found'; end if;
  end if;
  if v_has_cat and p_patch->>'category_id' is not null then
    perform 1 from public.transaction_categories where id = (p_patch->>'category_id')::uuid and user_id = v_user_id;
    if not found then raise exception 'category not found'; end if;
  end if;

  -- resolve category_name to category_id if provided and category_id not set
  if v_has_cat_name and p_patch->>'category_name' is not null and trim(p_patch->>'category_name') <> '' and not v_has_cat then
    insert into public.transaction_categories (user_id, name) values (v_user_id, trim(p_patch->>'category_name'))
    on conflict (user_id, lower(trim(name))) do nothing;
    select id into v_cat_id from public.transaction_categories where user_id = v_user_id and lower(trim(name)) = lower(trim(p_patch->>'category_name')) limit 1;
  elsif v_has_cat then
    v_cat_id := case when p_patch->>'category_id' is null then null else (p_patch->>'category_id')::uuid end;
  end if;

  update public.transactions set
    type = case when p_patch ? 'type' then p_patch->>'type' else type end,
    amount = case when p_patch ? 'amount' then (p_patch->>'amount')::numeric else amount end,
    description = case when p_patch ? 'description' then case when p_patch->>'description' is null then null else nullif(trim(p_patch->>'description'),'') end else description end,
    category_id = case when v_has_cat or v_has_cat_name then v_cat_id else category_id end,
    account_id = case when p_patch ? 'account_id' then case when p_patch->>'account_id' is null then null else (p_patch->>'account_id')::uuid end else account_id end,
    occurred_at = case when p_patch ? 'occurred_at' then (p_patch->>'occurred_at')::timestamptz else occurred_at end,
    notes = case when p_patch ? 'notes' then case when p_patch->>'notes' is null then null else nullif(trim(p_patch->>'notes'),'') end else notes end,
    payment_method = case when p_patch ? 'payment_method' then case when p_patch->>'payment_method' is null then null else nullif(trim(p_patch->>'payment_method'),'') end else payment_method end,
    is_recurring = case when p_patch ? 'is_recurring' then (p_patch->>'is_recurring')::boolean else is_recurring end,
    updated_at = now()
  where id = p_id and user_id = v_user_id
  returning * into v_after;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user_id, 'Você', 'editou uma transação', 'transaction', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
  return v_after;
end;
$$;
revoke all on function public.update_transaction_with_audit(uuid,jsonb) from public;
grant execute on function public.update_transaction_with_audit(uuid,jsonb) to authenticated;

-- Secure delete
create or replace function public.delete_transaction_with_audit(
  p_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_before public.transactions;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.transactions where id = p_id and user_id = v_user_id for update;
  if not found then raise exception 'transaction not found'; end if;
  delete from public.transactions where id = p_id and user_id = v_user_id;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, origin)
  values (v_user_id, 'Você', 'excluiu uma transação', 'transaction', p_id, to_jsonb(v_before), 'web');
end;
$$;
revoke all on function public.delete_transaction_with_audit(uuid) from public;
grant execute on function public.delete_transaction_with_audit(uuid) to authenticated;
