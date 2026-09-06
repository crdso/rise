-- 019 - Minimal product metrics for the Assistant settings screen.
alter table public.ai_interactions add column if not exists provider text;
alter table public.ai_interactions add column if not exists model text;
alter table public.ai_interactions add column if not exists status text not null default 'success';
alter table public.ai_interactions add column if not exists latency_ms integer;
create index if not exists ai_interactions_user_created_idx on public.ai_interactions(user_id, created_at desc);
