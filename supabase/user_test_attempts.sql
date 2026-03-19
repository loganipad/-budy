-- Run in Supabase SQL editor before using /api/test-attempts.

create table if not exists public.user_test_attempts (
  id bigint generated always as identity primary key,
  user_id text not null,
  section text not null,
  total_score integer not null default 0,
  correct_count integer not null default 0,
  total_questions integer not null default 0,
  skill_breakdown jsonb not null default '{}'::jsonb,
  source text not null default 'web',
  created_at timestamptz not null default now()
);

create index if not exists user_test_attempts_user_id_created_at_idx
  on public.user_test_attempts (user_id, created_at);
