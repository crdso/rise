-- 013 - Importantes
--
-- Coisas que o usuário quer guardar e reencontrar depois: um código, um
-- endereço, uma decisão, um trecho de conversa. NÃO é gerenciador de senhas.
--
-- AVISO DE SEGURANÇA (repetido no SETUP.md e na própria interface):
-- o conteúdo é gravado em texto puro na coluna `content`. Existe RLS por
-- usuário e TLS em trânsito, mas NÃO há criptografia fim-a-fim: quem tiver
-- acesso administrativo ao banco lê o conteúdo. Por isso a interface
-- desencoraja explicitamente guardar senha, token ou chave aqui.

create table if not exists public.important_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text,
  tag text,
  pinned boolean not null default false,
  remind_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists important_items_user_idx on public.important_items(user_id, pinned desc, updated_at desc);
create index if not exists important_items_remind_idx on public.important_items(user_id, remind_at);

drop trigger if exists set_updated_at_important_items on public.important_items;
create trigger set_updated_at_important_items
  before update on public.important_items
  for each row execute function public.handle_updated_at();

-- RLS: leitura própria; escrita apenas via RPC auditada
alter table public.important_items enable row level security;
drop policy if exists "important_items select own" on public.important_items;
create policy "important_items select own" on public.important_items
  for select to authenticated using (auth.uid() = user_id);

-- ============================================================
-- CREATE
-- ============================================================
create or replace function public.create_important_with_audit(
  p_title text,
  p_content text,
  p_tag text,
  p_pinned boolean,
  p_remind_at timestamptz
) returns public.important_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.important_items;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  if p_title is null or length(trim(p_title)) < 2 then raise exception 'título muito curto'; end if;

  insert into public.important_items (user_id, title, content, tag, pinned, remind_at)
  values (v_user, trim(p_title), nullif(trim(p_content),''), nullif(trim(p_tag),''), coalesce(p_pinned,false), p_remind_at)
  returning * into v_row;

  -- o conteúdo NÃO entra no audit log: seria duplicar em outra tabela algo
  -- que o usuário marcou como sensível. Guarda-se só título e metadados.
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', 'guardou um item importante', 'important_item', v_row.id,
          jsonb_build_object('title', v_row.title, 'tag', v_row.tag, 'pinned', v_row.pinned), 'web');
  return v_row;
end;
$$;
revoke all on function public.create_important_with_audit(text,text,text,boolean,timestamptz) from public;
grant execute on function public.create_important_with_audit(text,text,text,boolean,timestamptz) to authenticated;

-- ============================================================
-- UPDATE
-- ============================================================
create or replace function public.update_important_with_audit(
  p_id uuid,
  p_patch jsonb
) returns public.important_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_before public.important_items;
  v_after public.important_items;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  select * into v_before from public.important_items where id=p_id and user_id=v_user for update;
  if not found then raise exception 'item not found'; end if;

  update public.important_items set
    title = case when p_patch ? 'title' then trim(p_patch->>'title') else title end,
    content = case when p_patch ? 'content'
      then case when p_patch->>'content' is null then null else nullif(trim(p_patch->>'content'),'') end
      else content end,
    tag = case when p_patch ? 'tag'
      then case when p_patch->>'tag' is null then null else nullif(trim(p_patch->>'tag'),'') end
      else tag end,
    pinned = case when p_patch ? 'pinned' then (p_patch->>'pinned')::boolean else pinned end,
    remind_at = case when p_patch ? 'remind_at'
      then case when p_patch->>'remind_at' is null or p_patch->>'remind_at'='' then null else (p_patch->>'remind_at')::timestamptz end
      else remind_at end,
    updated_at = now()
  where id=p_id and user_id=v_user
  returning * into v_after;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, before, after, origin)
  values (v_user, 'Você', 'editou um item importante', 'important_item', p_id,
          jsonb_build_object('title', v_before.title, 'tag', v_before.tag, 'pinned', v_before.pinned),
          jsonb_build_object('title', v_after.title, 'tag', v_after.tag, 'pinned', v_after.pinned), 'web');
  return v_after;
end;
$$;
revoke all on function public.update_important_with_audit(uuid,jsonb) from public;
grant execute on function public.update_important_with_audit(uuid,jsonb) to authenticated;

-- ============================================================
-- PIN / ARCHIVE / RESTORE
-- ============================================================
create or replace function public.toggle_important_pin_with_audit(p_id uuid)
returns public.important_items
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_row public.important_items;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  update public.important_items set pinned = not pinned, updated_at = now()
  where id=p_id and user_id=v_user returning * into v_row;
  if not found then raise exception 'item not found'; end if;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', case when v_row.pinned then 'fixou um item importante' else 'desafixou um item importante' end,
          'important_item', p_id, jsonb_build_object('title', v_row.title, 'pinned', v_row.pinned), 'web');
  return v_row;
end; $$;
revoke all on function public.toggle_important_pin_with_audit(uuid) from public;
grant execute on function public.toggle_important_pin_with_audit(uuid) to authenticated;

create or replace function public.archive_important_with_audit(p_id uuid, p_archived boolean default true)
returns public.important_items
language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_row public.important_items;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  update public.important_items
    set archived_at = case when coalesce(p_archived,true) then now() else null end,
        pinned = case when coalesce(p_archived,true) then false else pinned end,
        updated_at = now()
  where id=p_id and user_id=v_user returning * into v_row;
  if not found then raise exception 'item not found'; end if;
  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', case when v_row.archived_at is null then 'restaurou um item importante' else 'arquivou um item importante' end,
          'important_item', p_id, jsonb_build_object('title', v_row.title), 'web');
  return v_row;
end; $$;
revoke all on function public.archive_important_with_audit(uuid,boolean) from public;
grant execute on function public.archive_important_with_audit(uuid,boolean) to authenticated;
