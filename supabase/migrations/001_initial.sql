-- RISE - Initial schema (Etapa 2) - ajustado conforme aprovação
-- Timezone: America/Sao_Paulo display, storage timestamptz UTC

-- Enable pgcrypto for gen_random_uuid
create extension if not exists "pgcrypto";

-- user_settings: preferência tema etc (FK auth.users)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'midnight' check (theme in ('midnight','forest','emerald','amethyst','ocean','obsidian','frost','sunset')),
  animations boolean not null default true,
  sounds boolean not null default true,
  density text not null default 'comfortable' check (density in ('comfortable','compact')),
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- accounts: contas internas, saldo calculado via transactions (initial_balance apenas)
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  type text not null check (type in ('checking','wallet','cash','card','savings','other')),
  color text,
  initial_balance numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists accounts_user_id_idx on public.accounts(user_id);

-- transaction_categories
create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text,
  color text,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

-- transactions: fonte da verdade financeira, occurred_at timestamptz único
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.transaction_categories(id) on delete set null,
  type text not null check (type in ('expense','income')),
  amount numeric(12,2) not null check (amount > 0),
  description text,
  notes text,
  payment_method text,
  is_recurring boolean not null default false,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists transactions_user_occurred_idx on public.transactions(user_id, occurred_at desc);
create index if not exists transactions_account_idx on public.transactions(account_id);

-- debts
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person text not null,
  kind text not null check (kind in ('owed','receivable')),
  amount numeric(12,2) not null check (amount > 0),
  paid_amount numeric(12,2) not null default 0,
  due_date date,
  status text not null default 'pending' check (status in ('pending','partial','paid','overdue')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists debts_user_status_idx on public.debts(user_id, status);

-- events: starts_at / ends_at / all_day
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'personal' check (category in ('school','finance','personal','reminder','important')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index if not exists events_user_starts_idx on public.events(user_id, starts_at);

-- reminders
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'pending' check (status in ('pending','done','overdue','archived')),
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- school
create table if not exists public.school_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  year int not null,
  status text not null default 'active' check (status in ('active','archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.school_subjects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.school_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);
create table if not exists public.school_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.school_workspaces(id) on delete cascade,
  subject_id uuid references public.school_subjects(id) on delete set null,
  title text not null,
  description text,
  type text not null check (type in ('exam','assignment','homework','presentation','project','other')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  status text not null default 'not_started' check (status in ('not_started','in_progress','done','overdue')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- monthly_summaries: snapshot/cache, reconstruível a partir de transactions
create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null, -- primeiro dia do mês
  total_expense numeric(12,2) not null default 0,
  total_income numeric(12,2) not null default 0,
  by_category jsonb not null default '[]'::jsonb,
  insights jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, month)
);

-- audit_logs: IMUTÁVEL - apenas insert via service role / server actions, sem update/delete para anon/authenticated
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor text not null, -- 'you' | 'assistant' | 'system' | 'whatsapp'
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  origin text not null check (origin in ('web','whatsapp','ai','system')),
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_user_created_idx on public.audit_logs(user_id, created_at desc);

-- ai_interactions
create table if not exists public.ai_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  input text not null,
  intent jsonb,
  confidence numeric,
  created_at timestamptz not null default now()
);

-- messaging_integrations
create table if not exists public.messaging_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'twilio',
  status text not null default 'disconnected',
  last_in text,
  last_out text,
  last_in_at timestamptz,
  last_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider)
);

-- ============== RLS ==============
alter table public.user_settings enable row level security;
alter table public.accounts enable row level security;
alter table public.transaction_categories enable row level security;
alter table public.transactions enable row level security;
alter table public.debts enable row level security;
alter table public.events enable row level security;
alter table public.reminders enable row level security;
alter table public.school_workspaces enable row level security;
alter table public.school_subjects enable row level security;
alter table public.school_tasks enable row level security;
alter table public.monthly_summaries enable row level security;
alter table public.audit_logs enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.messaging_integrations enable row level security;

-- Helper to avoid duplication: create policies for owner access
do $$ declare t text; tables text[] := array['user_settings','accounts','transaction_categories','transactions','debts','events','reminders','school_workspaces','school_subjects','school_tasks','monthly_summaries','ai_interactions','messaging_integrations']; begin foreach t in array tables loop execute format('drop policy if exists "owner all %s" on public.%I', t, t); execute format('create policy "owner all %s" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t); end loop; end $$;

-- audit_logs: IMUTÁVEL - apenas SELECT para authenticated; INSERT/UPDATE/DELETE somente service_role/server
drop policy if exists "audit select own" on public.audit_logs;
create policy "audit select own" on public.audit_logs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "audit insert service" on public.audit_logs;
-- sem policy de INSERT/UPDATE/DELETE para authenticated => client não pode fabricar logs. Service role bypassa RLS.


-- updated_at trigger
create or replace function public.handle_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists set_updated_at_user_settings on public.user_settings; create trigger set_updated_at_user_settings before update on public.user_settings for each row execute function public.handle_updated_at();
drop trigger if exists set_updated_at_accounts on public.accounts; create trigger set_updated_at_accounts before update on public.accounts for each row execute function public.handle_updated_at();
drop trigger if exists set_updated_at_transactions on public.transactions; create trigger set_updated_at_transactions before update on public.transactions for each row execute function public.handle_updated_at();
drop trigger if exists set_updated_at_debts on public.debts; create trigger set_updated_at_debts before update on public.debts for each row execute function public.handle_updated_at();
drop trigger if exists set_updated_at_events on public.events; create trigger set_updated_at_events before update on public.events for each row execute function public.handle_updated_at();
drop trigger if exists set_updated_at_reminders on public.reminders; create trigger set_updated_at_reminders before update on public.reminders for each row execute function public.handle_updated_at();
drop trigger if exists set_updated_at_school_tasks on public.school_tasks; create trigger set_updated_at_school_tasks before update on public.school_tasks for each row execute function public.handle_updated_at();

-- Função arquivamento escola 15/12/2026 - timezone America/Sao_Paulo
create or replace function public.archive_school_workspaces_if_due() returns void language plpgsql as $$
begin
  update public.school_workspaces
  set status='archived', archived_at=now()
  where status='active'
    and year=2026
    and archived_at is null
    and (now() at time zone 'America/Sao_Paulo')::date >= date '2026-12-15';
  if found then
    insert into public.audit_logs (user_id, actor, action, entity, origin) select user_id, 'system', 'arquivou workspace escolar automaticamente (2026)', 'school_workspace', 'system' from public.school_workspaces where status='archived' and year=2026;
  end if;
end $$;
