-- 017 - Persisted account ordering.
alter table public.accounts add column if not exists sort_order integer;

with ranked as (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) - 1 as position
  from public.accounts
)
update public.accounts accounts set sort_order = ranked.position from ranked where accounts.id = ranked.id and accounts.sort_order is null;

alter table public.accounts alter column sort_order set not null;
create index if not exists accounts_user_sort_order_idx on public.accounts(user_id, sort_order);

create or replace function public.assign_account_sort_order()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.sort_order is null then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':account-sort-order', 0));
    select coalesce(max(sort_order), -1) + 1 into new.sort_order from public.accounts where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_account_sort_order on public.accounts;
create trigger assign_account_sort_order before insert on public.accounts for each row execute function public.assign_account_sort_order();

create or replace function public.reorder_accounts_with_audit(p_order uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_count integer;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;
  select count(*) into v_count from public.accounts where user_id = v_user_id;
  if coalesce(array_length(p_order, 1), 0) <> v_count or (select count(distinct ordered_id) from unnest(p_order) as ids(ordered_id)) <> v_count then raise exception 'invalid account order'; end if;
  if exists (select 1 from unnest(p_order) as ids(ordered_id) left join public.accounts a on a.id = ids.ordered_id and a.user_id = v_user_id where a.id is null) then raise exception 'invalid account order'; end if;
  perform 1 from public.accounts where user_id = v_user_id for update;
  update public.accounts a set sort_order = ordered.position - 1, updated_at = now()
  from unnest(p_order) with ordinality as ordered(id, position) where a.id = ordered.id and a.user_id = v_user_id;
  insert into public.audit_logs (user_id, actor, action, entity, after, origin)
  values (v_user_id, 'Você', 'reordenou as contas', 'account', jsonb_build_object('order', p_order), 'web');
end;
$$;
revoke all on function public.reorder_accounts_with_audit(uuid[]) from public;
grant execute on function public.reorder_accounts_with_audit(uuid[]) to authenticated;
notify pgrst, 'reload schema';
