-- 012 - Preferências do usuário (aparência + layout do painel)
--
-- O RISE é dark-only: a coluna `theme` da 001 ainda tinha o CHECK com os nomes
-- antigos ('midnight','frost',…), o que rejeitaria os temas atuais. Aqui o CHECK
-- é substituído pelos ids reais, e o tema claro deixa de ser representável.
--
-- Por que estas escritas NÃO geram audit log: preferência de aparência muda a
-- cada arraste de slider. Auditar isso encheria audit_logs de ruído e enterraria
-- os eventos que importam (dinheiro, dívidas, eventos). A RPC continua sendo
-- SECURITY DEFINER com auth.uid() interno — o client nunca informa user_id.

-- ============================================================
-- Colunas
-- ============================================================
alter table public.user_settings add column if not exists custom_theme jsonb;
alter table public.user_settings add column if not exists ambient_intensity numeric(3,2) not null default 1.0;
alter table public.user_settings add column if not exists reduced_motion boolean not null default false;
alter table public.user_settings add column if not exists dashboard jsonb;

alter table public.user_settings drop constraint if exists user_settings_theme_check;
alter table public.user_settings add constraint user_settings_theme_check
  check (theme in ('onyx','blurple','ocean','forest','emerald','amethyst','crimson','chroma','custom'));

-- linhas antigas apontam para temas que não existem mais
update public.user_settings set theme = 'blurple' where theme is null or theme not in
  ('onyx','blurple','ocean','forest','emerald','amethyst','crimson','chroma','custom');

alter table public.user_settings alter column theme set default 'blurple';

alter table public.user_settings drop constraint if exists user_settings_ambient_range;
alter table public.user_settings add constraint user_settings_ambient_range
  check (ambient_intensity >= 0.3 and ambient_intensity <= 1.4);

-- ============================================================
-- RLS: leitura própria; escrita apenas pela RPC
-- ============================================================
drop policy if exists "owner all user_settings" on public.user_settings;
drop policy if exists "user_settings select own" on public.user_settings;
create policy "user_settings select own" on public.user_settings
  for select to authenticated using (auth.uid() = user_id);
alter table public.user_settings enable row level security;

-- ============================================================
-- RPC de upsert
-- ============================================================
create or replace function public.save_user_settings(p_patch jsonb)
returns public.user_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.user_settings;
begin
  if v_user is null then raise exception 'unauthorized'; end if;

  insert into public.user_settings (user_id) values (v_user)
  on conflict (user_id) do nothing;

  update public.user_settings set
    theme = case when p_patch ? 'theme' then p_patch->>'theme' else theme end,
    custom_theme = case when p_patch ? 'custom_theme'
      then case when p_patch->>'custom_theme' is null then null else p_patch->'custom_theme' end
      else custom_theme end,
    ambient_intensity = case when p_patch ? 'ambient_intensity'
      then least(1.4, greatest(0.3, (p_patch->>'ambient_intensity')::numeric)) else ambient_intensity end,
    reduced_motion = case when p_patch ? 'reduced_motion' then (p_patch->>'reduced_motion')::boolean else reduced_motion end,
    density = case when p_patch ? 'density' then p_patch->>'density' else density end,
    dashboard = case when p_patch ? 'dashboard'
      then case when p_patch->>'dashboard' is null then null else p_patch->'dashboard' end
      else dashboard end,
    animations = case when p_patch ? 'animations' then (p_patch->>'animations')::boolean else animations end,
    sounds = case when p_patch ? 'sounds' then (p_patch->>'sounds')::boolean else sounds end,
    updated_at = now()
  where user_id = v_user
  returning * into v_row;

  return v_row;
end;
$$;
revoke all on function public.save_user_settings(jsonb) from public;
grant execute on function public.save_user_settings(jsonb) to authenticated;
