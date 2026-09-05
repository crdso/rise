-- 014 - Escola
--
-- As tabelas school_workspaces / school_subjects / school_tasks já existem
-- desde a 001. Aqui elas ganham o mesmo padrão do resto do RISE: leitura
-- própria por RLS e escrita apenas por RPC auditada, além das funções que
-- faltavam para o módulo funcionar de verdade.
--
-- STATUS: 'overdue' é DERIVADO (pendente + due_at no passado), como nos
-- lembretes. Nunca é gravado — não existe rotina agendada para virar o status.
-- O que persiste é: not_started | in_progress | done | archived.

alter table public.school_tasks drop constraint if exists school_tasks_status_check;
alter table public.school_tasks add constraint school_tasks_status_check
  check (status in ('not_started','in_progress','done','archived'));

-- linhas antigas que porventura tenham 'overdue' gravado voltam a ser pendentes
update public.school_tasks set status = 'not_started' where status = 'overdue';

alter table public.school_tasks add column if not exists completed_at timestamptz;
alter table public.school_tasks add column if not exists notes text;

create index if not exists school_tasks_user_due_idx on public.school_tasks(user_id, due_at);
create index if not exists school_tasks_user_status_idx on public.school_tasks(user_id, status);
create unique index if not exists school_subjects_ws_lower_name_idx
  on public.school_subjects (workspace_id, lower(trim(name)));

-- ============================================================
-- RLS
-- ============================================================
do $$ declare t text; tables text[] := array['school_workspaces','school_subjects','school_tasks']; begin
  foreach t in array tables loop
    execute format('drop policy if exists "owner all %s" on public.%I', t, t);
    execute format('drop policy if exists "%s select own" on public.%I', t, t);
    execute format('create policy "%s select own" on public.%I for select to authenticated using (auth.uid() = user_id)', t, t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ============================================================
-- Workspace do ano letivo
-- ============================================================
create or replace function public.ensure_school_workspace()
returns public.school_workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_ws public.school_workspaces;
begin
  if v_user is null then raise exception 'unauthorized'; end if;

  select * into v_ws from public.school_workspaces
  where user_id = v_user and status = 'active'
  order by year desc limit 1;
  if found then return v_ws; end if;

  insert into public.school_workspaces (user_id, name, year, status)
  values (v_user, 'Ensino Médio — 3º ano', 2026, 'active')
  returning * into v_ws;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', 'criou o workspace escolar', 'school_workspace', v_ws.id, to_jsonb(v_ws), 'web');
  return v_ws;
end;
$$;
revoke all on function public.ensure_school_workspace() from public;
grant execute on function public.ensure_school_workspace() to authenticated;

-- ============================================================
-- CREATE TASK (resolve a matéria por nome, como as categorias financeiras)
-- ============================================================
create or replace function public.create_school_task_with_audit(
  p_title text,
  p_subject text,
  p_description text,
  p_type text,
  p_priority text,
  p_due_at timestamptz,
  p_notes text
) returns public.school_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_ws public.school_workspaces;
  v_subject_id uuid;
  v_task public.school_tasks;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  if p_title is null or length(trim(p_title)) < 2 then raise exception 'título muito curto'; end if;

  v_ws := public.ensure_school_workspace();

  if p_subject is not null and trim(p_subject) <> '' then
    insert into public.school_subjects (workspace_id, user_id, name)
    values (v_ws.id, v_user, trim(p_subject))
    on conflict (workspace_id, lower(trim(name))) do nothing;
    select id into v_subject_id from public.school_subjects
    where workspace_id = v_ws.id and lower(trim(name)) = lower(trim(p_subject)) limit 1;
  end if;

  insert into public.school_tasks (user_id, workspace_id, subject_id, title, description, type, priority, status, due_at, notes)
  values (v_user, v_ws.id, v_subject_id, trim(p_title), nullif(trim(p_description),''),
          coalesce(p_type,'assignment'), coalesce(p_priority,'medium'), 'not_started', p_due_at, nullif(trim(p_notes),''))
  returning * into v_task;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', 'criou uma atividade escolar', 'school_task', v_task.id, to_jsonb(v_task), 'web');
  return v_task;
end;
$$;
revoke all on function public.create_school_task_with_audit(text,text,text,text,text,timestamptz,text) from public;
grant execute on function public.create_school_task_with_audit(text,text,text,text,text,timestamptz,text) to authenticated;

-- ============================================================
-- UPDATE TASK
-- ============================================================
create or replace function public.update_school_task_with_audit(
  p_id uuid,
  p_patch jsonb
) returns public.school_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_before public.school_tasks;
  v_after public.school_tasks;
  v_subject_id uuid;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.school_tasks where id=p_id and user_id=v_user for update;
  if not found then raise exception 'task not found'; end if;

  v_subject_id := v_before.subject_id;
  if p_patch ? 'subject' then
    if p_patch->>'subject' is null or trim(p_patch->>'subject') = '' then
      v_subject_id := null;
    else
      insert into public.school_subjects (workspace_id, user_id, name)
      values (v_before.workspace_id, v_user, trim(p_patch->>'subject'))
      on conflict (workspace_id, lower(trim(name))) do nothing;
      select id into v_subject_id from public.school_subjects
      where workspace_id = v_before.workspace_id and lower(trim(name)) = lower(trim(p_patch->>'subject')) limit 1;
    end if;
  end if;

  update public.school_tasks set
    title = case when p_patch ? 'title' then trim(p_patch->>'title') else title end,
    description = case when p_patch ? 'description'
      then case when p_patch->>'description' is null then null else nullif(trim(p_patch->>'description'),'') end
      else description end,
    notes = case when p_patch ? 'notes'
      then case when p_patch->>'notes' is null then null else nullif(trim(p_patch->>'notes'),'') end
      else notes end,
    type = case when p_patch ? 'type' then p_patch->>'type' else type end,
    priority = case when p_patch ? 'priority' then p_patch->>'priority' else priority end,
    status = case when p_patch ? 'status' then p_patch->>'status' else status end,
    completed_at = case
      when p_patch ? 'status' and p_patch->>'status' = 'done' then now()
      when p_patch ? 'status' and p_patch->>'status' <> 'done' then null
      else completed_at end,
    due_at = case when p_patch ? 'due_at'
      then case when p_patch->>'due_at' is null or p_patch->>'due_at'='' then null else (p_patch->>'due_at')::timestamptz end
      else due_at end,
    subject_id = v_subject_id,
    updated_at = now()
  where id=p_id and user_id=v_user
  returning * into v_after;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user, 'Você',
          case when (p_patch ? 'status') and p_patch->>'status' = 'done' then 'concluiu uma atividade escolar'
               when (p_patch ? 'status') and p_patch->>'status' = 'archived' then 'arquivou uma atividade escolar'
               else 'editou uma atividade escolar' end,
          'school_task', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
  return v_after;
end;
$$;
revoke all on function public.update_school_task_with_audit(uuid,jsonb) from public;
grant execute on function public.update_school_task_with_audit(uuid,jsonb) to authenticated;

-- ============================================================
-- Arquivamento do ano letivo
--
-- Correção sobre a 001/002: o insert de auditoria varria TODOS os workspaces
-- já arquivados a cada execução, então rodar a função duas vezes duplicava os
-- registros. Agora só audita o que foi arquivado nesta chamada.
-- ============================================================
-- A 001 declarava esta assinatura com RETURNS void. PostgreSQL não permite
-- trocar o tipo de retorno via CREATE OR REPLACE, então remove a versão antiga.
drop function if exists public.archive_school_workspaces_if_due();

create or replace function public.archive_school_workspaces_if_due()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  with archived as (
    update public.school_workspaces
      set status = 'archived', archived_at = now()
      where status = 'active'
        and archived_at is null
        and (now() at time zone 'America/Sao_Paulo')::date >= make_date(year, 12, 15)
      returning id, user_id, name, year
  ), logged as (
    insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
    select user_id, 'Sistema', 'arquivou o ano letivo automaticamente', 'school_workspace', id,
           jsonb_build_object('name', name, 'year', year), 'system'
    from archived
    returning 1
  )
  select count(*) into v_count from logged;
  return v_count;
end;
$$;
revoke all on function public.archive_school_workspaces_if_due() from public;
grant execute on function public.archive_school_workspaces_if_due() to authenticated;
