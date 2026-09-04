-- 006 - Brands for accounts (domain, not ephemeral logo URL)
alter table public.accounts add column if not exists brand_domain text;
alter table public.accounts add column if not exists brand_key text;
create index if not exists accounts_brand_domain_idx on public.accounts(brand_domain);

-- Atualiza RPCs para persistir brand_domain/brand_key atomicamente
create or replace function public.create_account_with_audit(
  p_name text,
  p_type text,
  p_icon text,
  p_color text,
  p_initial_balance numeric,
  p_brand_domain text default null,
  p_brand_key text default null
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
  insert into public.accounts (user_id, name, type, icon, color, initial_balance, brand_domain, brand_key)
  values (v_user_id, trim(p_name), p_type, nullif(trim(p_icon),''), nullif(trim(p_color),''), p_initial_balance, nullif(trim(p_brand_domain),''), nullif(trim(p_brand_key),''))
  returning * into v_acc;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user_id, 'Você', 'criou uma conta', 'account', v_acc.id, to_jsonb(v_acc), 'web');
  return v_acc;
end;
$$;
revoke all on function public.create_account_with_audit(text,text,text,text,numeric,text,text) from public;
grant execute on function public.create_account_with_audit(text,text,text,text,numeric,text,text) to authenticated;

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
    brand_domain = case when p_patch ? 'brand_domain' then case when p_patch->>'brand_domain' is null then null else nullif(trim(p_patch->>'brand_domain'),'') end else brand_domain end,
    brand_key = case when p_patch ? 'brand_key' then case when p_patch->>'brand_key' is null then null else nullif(trim(p_patch->>'brand_key'),'') end else brand_key end,
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
