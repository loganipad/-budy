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

create table if not exists public.user_subscriptions (
  user_id text primary key,
  email text,
  is_premium boolean not null default false,
  subscription_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  last_event_id text,
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_stripe_customer_id_idx
  on public.user_subscriptions (stripe_customer_id);

create index if not exists user_subscriptions_stripe_subscription_id_idx
  on public.user_subscriptions (stripe_subscription_id);

create table if not exists public.stripe_event_log (
  event_id text primary key,
  event_type text,
  user_id text,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_event_log_user_id_processed_at_idx
  on public.stripe_event_log (user_id, processed_at);
