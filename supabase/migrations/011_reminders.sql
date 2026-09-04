-- 011 - Fase 3.4: Lembretes
--
-- A tabela public.reminders já existe desde a 001. Esta migration NÃO a recria:
-- apenas acrescenta colunas, ajusta RLS para o padrão do RISE (SELECT own +
-- escrita somente por RPC SECURITY DEFINER) e cria as RPCs auditadas.
--
-- MODELO DE STATUS
--   Persistido : 'pending' | 'done' | 'archived'
--   Derivado   : 'overdue' = pending + due_at já passou (dia/hora civil de São Paulo)
--   'overdue' NUNCA é gravado. O CHECK herdado da 001 ainda o aceita por
--   compatibilidade, mas nenhuma RPC daqui grava esse valor — não existe cron
--   responsável por virar pending -> overdue, é sempre cálculo no momento da leitura.
--
-- MODELO DE RECORRÊNCIA
--   recurrence: null | 'daily' | 'weekly' | 'monthly'  ('none' na UI == null aqui)
--   Ao concluir uma ocorrência de um lembrete recorrente COM due_at:
--     1. grava-se uma linha histórica (parent_id = mestre, status='done', due_at da
--        ocorrência concluída, recurrence=null) — o histórico nunca se perde;
--     2. o lembrete mestre permanece 'pending' e tem due_at avançado para a
--        próxima ocorrência.
--   Concluir recorrente SEM due_at não tem "próxima ocorrência" calculável:
--   nesse caso ele é simplesmente fechado (comportamento documentado e simples).
--   Nenhum scheduler externo é necessário nesta fase.

-- ============================================================
-- Colunas
-- ============================================================
alter table public.reminders add column if not exists recurrence text;
alter table public.reminders add column if not exists completed_at timestamptz;
alter table public.reminders add column if not exists parent_id uuid references public.reminders(id) on delete cascade;

alter table public.reminders drop constraint if exists reminders_recurrence_check;
alter table public.reminders add constraint reminders_recurrence_check
  check (recurrence is null or recurrence in ('daily','weekly','monthly'));

create index if not exists reminders_user_due_idx on public.reminders(user_id, due_at);
create index if not exists reminders_user_status_idx on public.reminders(user_id, status);
create index if not exists reminders_parent_idx on public.reminders(parent_id);

-- ============================================================
-- RLS: authenticated só lê o que é seu; escrita apenas via RPC
-- ============================================================
drop policy if exists "owner all reminders" on public.reminders;
drop policy if exists "reminders select own" on public.reminders;
create policy "reminders select own" on public.reminders
  for select to authenticated using (auth.uid() = user_id);
alter table public.reminders enable row level security;

-- ============================================================
-- Helper: próxima ocorrência
-- Calculada no horário de parede de São Paulo (preserva a hora do lembrete)
-- e reaproveita add_months_preserve_eom criada na 007.
-- ============================================================
create or replace function public.next_reminder_due(p_due timestamptz, p_recurrence text)
returns timestamptz
language plpgsql
stable
set search_path = public
as $$
declare
  v_local timestamp;
  v_next_local timestamp;
begin
  if p_due is null or p_recurrence is null then return null; end if;
  v_local := p_due at time zone 'America/Sao_Paulo';
  v_next_local := case p_recurrence
    when 'daily'   then v_local + interval '1 day'
    when 'weekly'  then v_local + interval '7 days'
    when 'monthly' then public.add_months_preserve_eom(v_local::date, 1) + v_local::time
    else null
  end;
  if v_next_local is null then return null; end if;
  return v_next_local at time zone 'America/Sao_Paulo';
end;
$$;

-- ============================================================
-- CREATE
-- ============================================================
create or replace function public.create_reminder_with_audit(
  p_title text,
  p_notes text,
  p_due_at timestamptz,
  p_priority text,
  p_recurrence text
) returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_rec text := nullif(p_recurrence, 'none');
  v_rem public.reminders;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  if p_title is null or length(trim(p_title)) < 2 then raise exception 'título muito curto'; end if;
  if v_rec is not null and p_due_at is null then
    raise exception 'lembrete recorrente exige data';
  end if;

  insert into public.reminders (user_id, title, notes, due_at, priority, status, is_recurring, recurrence)
  values (
    v_user,
    trim(p_title),
    nullif(trim(p_notes),''),
    p_due_at,
    coalesce(p_priority,'medium'),
    'pending',
    v_rec is not null,
    v_rec
  )
  returning * into v_rem;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', 'criou um lembrete', 'reminder', v_rem.id, to_jsonb(v_rem), 'web');
  return v_rem;
end;
$$;
revoke all on function public.create_reminder_with_audit(text,text,timestamptz,text,text) from public;
grant execute on function public.create_reminder_with_audit(text,text,timestamptz,text,text) to authenticated;

-- ============================================================
-- UPDATE (patch jsonb: distingue ausente de null)
-- status nunca muda por aqui — só pelas RPCs de concluir/reabrir/arquivar.
-- ============================================================
create or replace function public.update_reminder_with_audit(
  p_id uuid,
  p_patch jsonb
) returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_before public.reminders;
  v_after public.reminders;
  v_rec text;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.reminders where id=p_id and user_id=v_user for update;
  if not found then raise exception 'reminder not found'; end if;
  if v_before.parent_id is not null then
    raise exception 'ocorrência histórica não pode ser editada';
  end if;
  if p_patch ? 'status' then raise exception 'status muda apenas por concluir/reabrir/arquivar'; end if;

  v_rec := case
    when p_patch ? 'recurrence' then nullif(nullif(p_patch->>'recurrence','none'),'')
    else v_before.recurrence
  end;

  if v_rec is not null then
    if (case when p_patch ? 'due_at' then nullif(p_patch->>'due_at','') else v_before.due_at::text end) is null then
      raise exception 'lembrete recorrente exige data';
    end if;
  end if;

  update public.reminders set
    title = case when p_patch ? 'title' then trim(p_patch->>'title') else title end,
    notes = case when p_patch ? 'notes' then case when p_patch->>'notes' is null then null else nullif(trim(p_patch->>'notes'),'') end else notes end,
    due_at = case when p_patch ? 'due_at' then case when p_patch->>'due_at' is null or p_patch->>'due_at'='' then null else (p_patch->>'due_at')::timestamptz end else due_at end,
    priority = case when p_patch ? 'priority' then p_patch->>'priority' else priority end,
    recurrence = v_rec,
    is_recurring = v_rec is not null,
    updated_at = now()
  where id=p_id and user_id=v_user
  returning * into v_after;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user, 'Você', 'editou um lembrete', 'reminder', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
  return v_after;
end;
$$;
revoke all on function public.update_reminder_with_audit(uuid,jsonb) from public;
grant execute on function public.update_reminder_with_audit(uuid,jsonb) to authenticated;

-- ============================================================
-- COMPLETE (com avanço da série recorrente)
-- Retorna a linha que continua "viva": o mestre avançado, ou o próprio lembrete fechado.
-- ============================================================
create or replace function public.complete_reminder_with_audit(p_id uuid)
returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_before public.reminders;
  v_after public.reminders;
  v_occ public.reminders;
  v_next timestamptz;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.reminders where id=p_id and user_id=v_user for update;
  if not found then raise exception 'reminder not found'; end if;
  if v_before.status <> 'pending' then raise exception 'lembrete não está pendente'; end if;

  if v_before.recurrence is null or v_before.due_at is null then
    update public.reminders
      set status='done', completed_at=now(), updated_at=now()
      where id=p_id and user_id=v_user
      returning * into v_after;
    insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
    values (v_user, 'Você', 'concluiu um lembrete', 'reminder', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
    return v_after;
  end if;

  -- 1) histórico da ocorrência concluída
  insert into public.reminders (user_id, title, notes, due_at, priority, status, is_recurring, recurrence, completed_at, parent_id)
  values (v_user, v_before.title, v_before.notes, v_before.due_at, v_before.priority, 'done', false, null, now(), v_before.id)
  returning * into v_occ;

  -- 2) mestre avança para a próxima ocorrência e continua pendente
  v_next := public.next_reminder_due(v_before.due_at, v_before.recurrence);
  update public.reminders
    set due_at = v_next, updated_at = now()
    where id=p_id and user_id=v_user
    returning * into v_after;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user, 'Você', 'concluiu uma ocorrência recorrente', 'reminder', p_id, to_jsonb(v_before),
          jsonb_build_object('occurrence', to_jsonb(v_occ), 'next', to_jsonb(v_after)), 'web');
  return v_after;
end;
$$;
revoke all on function public.complete_reminder_with_audit(uuid) from public;
grant execute on function public.complete_reminder_with_audit(uuid) to authenticated;

-- ============================================================
-- REOPEN (done/archived -> pending). Ocorrência histórica não reabre.
-- ============================================================
create or replace function public.reopen_reminder_with_audit(p_id uuid)
returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_before public.reminders;
  v_after public.reminders;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.reminders where id=p_id and user_id=v_user for update;
  if not found then raise exception 'reminder not found'; end if;
  if v_before.parent_id is not null then raise exception 'ocorrência histórica não pode ser reaberta'; end if;
  if v_before.status = 'pending' then raise exception 'lembrete já está pendente'; end if;

  update public.reminders
    set status='pending', completed_at=null, updated_at=now()
    where id=p_id and user_id=v_user
    returning * into v_after;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user, 'Você', 'reabriu um lembrete', 'reminder', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
  return v_after;
end;
$$;
revoke all on function public.reopen_reminder_with_audit(uuid) from public;
grant execute on function public.reopen_reminder_with_audit(uuid) to authenticated;

-- ============================================================
-- ARCHIVE (alternativa ao hard delete)
-- ============================================================
create or replace function public.archive_reminder_with_audit(p_id uuid)
returns public.reminders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_before public.reminders;
  v_after public.reminders;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.reminders where id=p_id and user_id=v_user for update;
  if not found then raise exception 'reminder not found'; end if;
  if v_before.status = 'archived' then return v_before; end if;

  update public.reminders
    set status='archived', updated_at=now()
    where id=p_id and user_id=v_user
    returning * into v_after;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user, 'Você', 'arquivou um lembrete', 'reminder', p_id, to_jsonb(v_before), to_jsonb(v_after), 'web');
  return v_after;
end;
$$;
revoke all on function public.archive_reminder_with_audit(uuid) from public;
grant execute on function public.archive_reminder_with_audit(uuid) to authenticated;
