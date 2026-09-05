-- 015 - Atomic AI account resolution and transaction creation.
do $$
begin
  if exists (
    select 1 from public.accounts
    where is_active
    group by user_id, lower(trim(name))
    having count(*) > 1
  ) then
    raise exception 'active account names must be deduplicated before applying 015';
  end if;
end $$;

create unique index if not exists accounts_user_active_lower_name_uidx
  on public.accounts (user_id, lower(trim(name))) where is_active;

create table if not exists public.finance_operation_idempotency (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  request_fingerprint text not null,
  response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);
alter table public.finance_operation_idempotency enable row level security;

create or replace function public.ensure_active_account_and_create_transaction_with_audit(
  p_idempotency_key uuid, p_account_name text, p_account_type text, p_account_color text,
  p_account_brand_domain text, p_account_brand_key text, p_type text, p_amount numeric,
  p_description text, p_category_id uuid, p_category_name text, p_occurred_at timestamptz,
  p_notes text, p_payment_method text, p_is_recurring boolean
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid(); v_norm text := lower(trim(p_account_name)); v_fingerprint text;
  v_saved jsonb; v_acc public.accounts; v_tx public.transactions; v_cat public.transaction_categories; v_result jsonb;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  if p_idempotency_key is null or v_norm = '' then raise exception 'idempotency key and account name are required'; end if;
  if p_type not in ('expense','income') or p_amount is null or p_amount <= 0 then raise exception 'invalid transaction'; end if;
  v_fingerprint := md5(concat_ws('|', v_norm, p_type, p_amount::text, coalesce(p_description,''), coalesce(p_category_id::text,''), coalesce(p_category_name,''), p_occurred_at::text, coalesce(p_notes,''), coalesce(p_payment_method,''), coalesce(p_is_recurring,false)::text));

  insert into public.finance_operation_idempotency (user_id, idempotency_key, request_fingerprint)
  values (v_user, p_idempotency_key, v_fingerprint) on conflict do nothing;
  if not found then
    select request_fingerprint, response into v_fingerprint, v_saved from public.finance_operation_idempotency
    where user_id = v_user and idempotency_key = p_idempotency_key for update;
    if v_fingerprint <> md5(concat_ws('|', v_norm, p_type, p_amount::text, coalesce(p_description,''), coalesce(p_category_id::text,''), coalesce(p_category_name,''), p_occurred_at::text, coalesce(p_notes,''), coalesce(p_payment_method,''), coalesce(p_is_recurring,false)::text)) then raise exception 'idempotency key reuse'; end if;
    return v_saved;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || v_norm, 0));
  select * into v_acc from public.accounts where user_id = v_user and is_active and lower(trim(name)) = v_norm for update;
  if not found then
    insert into public.accounts (user_id, name, type, color, initial_balance, is_active, brand_domain, brand_key)
    values (v_user, trim(p_account_name), coalesce(p_account_type,'checking'), nullif(trim(p_account_color),''), 0, true, nullif(trim(p_account_brand_domain),''), nullif(trim(p_account_brand_key),'')) returning * into v_acc;
    insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
    values (v_user, 'Você', 'criou uma conta', 'account', v_acc.id, to_jsonb(v_acc), 'ai');
  end if;

  if p_category_id is not null then
    select * into v_cat from public.transaction_categories where id = p_category_id and user_id = v_user;
    if not found then raise exception 'category not found'; end if;
  elsif nullif(trim(p_category_name),'') is not null then
    insert into public.transaction_categories (user_id,name) values (v_user,trim(p_category_name))
    on conflict (user_id, lower(trim(name))) do nothing returning * into v_cat;
    if v_cat.id is null then select * into v_cat from public.transaction_categories where user_id=v_user and lower(trim(name))=lower(trim(p_category_name)); end if;
  end if;

  insert into public.transactions (user_id, account_id, category_id, type, amount, description, notes, payment_method, is_recurring, occurred_at)
  values (v_user, v_acc.id, v_cat.id, p_type, p_amount, nullif(trim(p_description),''), nullif(trim(p_notes),''), nullif(trim(p_payment_method),''), coalesce(p_is_recurring,false), p_occurred_at)
  returning * into v_tx;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', case when p_type='income' then 'criou uma receita' else 'criou uma despesa' end, 'transaction', v_tx.id, to_jsonb(v_tx), 'ai');
  v_result := jsonb_build_object('account',to_jsonb(v_acc),'transaction',to_jsonb(v_tx),'category',case when v_cat.id is null then null else to_jsonb(v_cat) end);
  update public.finance_operation_idempotency set response=v_result where user_id=v_user and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;
revoke all on function public.ensure_active_account_and_create_transaction_with_audit(uuid,text,text,text,text,text,text,numeric,text,uuid,text,timestamptz,text,text,boolean) from public;
grant execute on function public.ensure_active_account_and_create_transaction_with_audit(uuid,text,text,text,text,text,text,numeric,text,uuid,text,timestamptz,text,text,boolean) to authenticated;
notify pgrst, 'reload schema';
