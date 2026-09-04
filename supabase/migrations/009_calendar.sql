-- 009 - Calendário: RLS SELECT own, RPCs auditados, categorias

-- Garantir RLS apenas SELECT para events (escritas via RPC)
drop policy if exists "owner all events" on public.events;
drop policy if exists "events select own" on public.events;
create policy "events select own" on public.events for select to authenticated using (auth.uid()=user_id);

-- RPC create
create or replace function public.create_event_with_audit(
  p_title text,
  p_description text,
  p_category text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day boolean
) returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_ev public.events;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  if p_ends_at is not null and p_ends_at < p_starts_at then raise exception 'ends_at antes de starts_at'; end if;
  insert into public.events (user_id, title, description, category, starts_at, ends_at, all_day)
  values (v_user, trim(p_title), nullif(trim(p_description),''), coalesce(p_category,'personal'), p_starts_at, p_ends_at, coalesce(p_all_day,false))
  returning * into v_ev;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', 'criou um evento', 'event', v_ev.id, to_jsonb(v_ev), 'web');
  return v_ev;
end;
$$;
revoke all on function public.create_event_with_audit(text,text,text,timestamptz,timestamptz,boolean) from public;
grant execute on function public.create_event_with_audit(text,text,text,timestamptz,timestamptz,boolean) to authenticated;

create or replace function public.update_event_with_audit(
  p_id uuid,
  p_patch jsonb
) returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_before public.events;
  v_after public.events;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.events where id=p_id and user_id=v_user for update;
  if not found then raise exception 'event not found'; end if;
  update public.events set
    title = case when p_patch ? 'title' then trim(p_patch->>'title') else title end,
    description = case when p_patch ? 'description' then case when p_patch->>'description' is null then null else nullif(trim(p_patch->>'description'),'') end else description end,
    category = case when p_patch ? 'category' then p_patch->>'category' else category end,
    starts_at = case when p_patch ? 'starts_at' then (p_patch->>'starts_at')::timestamptz else starts_at end,
    ends_at = case when p_patch ? 'ends_at' then case when p_patch->>'ends_at' is null then null else (p_patch->>'ends_at')::timestamptz end else ends_at end,
    all_day = case when p_patch ? 'all_day' then (p_patch->>'all_day')::boolean else all_day end,
    updated_at = now()
  where id=p_id and user_id=v_user returning * into v_after;
  if v_after.ends_at is not null and v_after.ends_at < v_after.starts_at then raise exception 'ends_at antes de starts_at'; end if;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user, 'Você', 'editou um evento', 'event', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
  return v_after;
end;
$$;
revoke all on function public.update_event_with_audit(uuid,jsonb) from public;
grant execute on function public.update_event_with_audit(uuid,jsonb) to authenticated;

create or replace function public.delete_event_with_audit(p_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_before public.events;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.events where id=p_id and user_id=v_user for update;
  if not found then raise exception 'event not found'; end if;
  delete from public.events where id=p_id and user_id=v_user;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, origin)
  values (v_user, 'Você', 'excluiu um evento', 'event', p_id, to_jsonb(v_before), 'web');
end;
$$;
revoke all on function public.delete_event_with_audit(uuid) from public;
grant execute on function public.delete_event_with_audit(uuid) to authenticated;
