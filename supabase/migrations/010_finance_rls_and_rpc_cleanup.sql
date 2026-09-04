-- 010 - Preflight Fase 3.4
--
-- 1) RLS de finanças no mesmo padrão já usado em Dívidas (007) e Calendário (009):
--    authenticated => SELECT apenas dos próprios registros.
--    Escrita => exclusivamente pelas RPCs SECURITY DEFINER auditadas (auth.uid() interno).
-- 2) Remoção do overload obsoleto de create_account_with_audit (assinatura de 5 args da 004),
--    que convivia com a versão canônica de 7 args criada na 006.
-- 3) RPC auditada para criação de categoria: /api/categories fazia INSERT direto na tabela,
--    o que deixaria de funcionar (e nunca gerou audit log). Agora passa por RPC.
--
-- Nenhuma migration anterior foi editada.

-- ============================================================
-- 1) RLS: accounts / transactions / transaction_categories
-- ============================================================

-- accounts
drop policy if exists "owner all accounts" on public.accounts;
drop policy if exists "accounts select own" on public.accounts;
create policy "accounts select own" on public.accounts
  for select to authenticated using (auth.uid() = user_id);

-- transactions
drop policy if exists "owner all transactions" on public.transactions;
drop policy if exists "transactions select own" on public.transactions;
create policy "transactions select own" on public.transactions
  for select to authenticated using (auth.uid() = user_id);

-- transaction_categories
drop policy if exists "owner all transaction_categories" on public.transaction_categories;
drop policy if exists "transaction_categories select own" on public.transaction_categories;
create policy "transaction_categories select own" on public.transaction_categories
  for select to authenticated using (auth.uid() = user_id);

-- garantir RLS habilitado (idempotente)
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_categories enable row level security;

-- Resultado esperado:
--   supabase.from('transactions').insert(...)  => 42501 new row violates row-level security policy
--   supabase.from('accounts').update(...)      => 0 linhas afetadas / violação
--   supabase.rpc('create_transaction_with_audit', ...) => OK (SECURITY DEFINER, dono da tabela)
--   supabase.from('transactions').select(...)  => OK, apenas as próprias linhas

-- ============================================================
-- 2) Limpeza do overload obsoleto de create_account_with_audit
-- ============================================================
-- 004 criou (text,text,text,text,numeric) e 006 criou (text,text,text,text,numeric,text,text)
-- com defaults. As duas coexistindo tornam a resolução ambígua (PGRST203).
-- Mantém-se APENAS a versão canônica de 7 argumentos da 006.
drop function if exists public.create_account_with_audit(text,text,text,text,numeric);

-- ============================================================
-- 3) RPC auditada de categoria
-- ============================================================
-- Dedup case-insensitive pelo índice único transaction_categories_user_lower_name_idx.
-- Se a categoria já existir, devolve a existente SEM gerar audit log (não houve criação).
create or replace function public.create_category_with_audit(
  p_name text,
  p_icon text default null,
  p_color text default null
) returns public.transaction_categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cat public.transaction_categories;
begin
  if v_user is null then raise exception 'unauthorized'; end if;
  if p_name is null or trim(p_name) = '' then raise exception 'nome de categoria obrigatório'; end if;

  insert into public.transaction_categories (user_id, name, icon, color)
  values (v_user, trim(p_name), nullif(trim(p_icon),''), nullif(trim(p_color),''))
  on conflict (user_id, lower(trim(name))) do nothing
  returning * into v_cat;

  if v_cat.id is null then
    -- já existia: retorna a existente, sem audit
    select * into v_cat from public.transaction_categories
    where user_id = v_user and lower(trim(name)) = lower(trim(p_name))
    limit 1;
    if not found then raise exception 'category conflict unresolved'; end if;
    return v_cat;
  end if;

  insert into public.audit_logs (user_id, actor, action, entity, entity_id, after, origin)
  values (v_user, 'Você', 'criou uma categoria', 'category', v_cat.id, to_jsonb(v_cat), 'web');
  return v_cat;
end;
$$;
revoke all on function public.create_category_with_audit(text,text,text) from public;
grant execute on function public.create_category_with_audit(text,text,text) to authenticated;
