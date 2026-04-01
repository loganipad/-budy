create table if not exists public.ai_deep_dive_usage (
  user_id text not null,
  period_key text not null,
  email text null,
  used_count integer not null default 0,
  credit_limit integer not null default 40,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ai_deep_dive_usage_pkey primary key (user_id, period_key)
);

create index if not exists ai_deep_dive_usage_period_idx
  on public.ai_deep_dive_usage (period_key, updated_at desc);