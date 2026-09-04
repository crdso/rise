-- ETAPA 2.5 Fixes
-- 1) audit_logs: remover INSERT para authenticated, apenas SELECT own. Service role cria logs server-side.
drop policy if exists "audit insert service" on public.audit_logs;
drop policy if exists "audit select own" on public.audit_logs;
-- recria apenas SELECT para authenticated, sem INSERT/UPDATE/DELETE
create policy "audit select own" on public.audit_logs for select to authenticated using (auth.uid() = user_id);
-- Nenhuma policy de INSERT/UPDATE/DELETE para authenticated => client não pode fabricar logs. Service role bypassa RLS.

-- 2) timezone-aware arquivamento: comparar data local America/Sao_Paulo
create or replace function public.archive_school_workspaces_if_due() returns void language plpgsql as $$
begin
  update public.school_workspaces
  set status='archived', archived_at=now()
  where status='active'
    and year=2026
    and archived_at is null
    and (now() at time zone 'America/Sao_Paulo')::date >= date '2026-12-15';
  if found then
    insert into public.audit_logs (user_id, actor, action, entity, origin)
    select user_id, 'system', 'arquivou workspace escolar automaticamente (2026)', 'school_workspace', 'system'
    from public.school_workspaces where status='archived' and year=2026;
  end if;
end $$;
