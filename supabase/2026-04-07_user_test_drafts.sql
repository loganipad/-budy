create table if not exists public.user_test_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  sid text not null,
  section text not null default 'unknown',
  question_ids jsonb not null default '[]'::jsonb,
  questions_snapshot jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  flagged_indexes jsonb not null default '[]'::jsonb,
  current_question_index integer not null default 0,
  remaining_time_seconds integer not null default 0,
  timer_paused boolean not null default false,
  test_active boolean not null default true,
  custom_test_label text,
  source text not null default 'web',
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, sid)
);

create index if not exists idx_user_test_drafts_user_updated
  on public.user_test_drafts (user_id, updated_at desc);

create or replace function public.set_user_test_drafts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_test_drafts_updated_at on public.user_test_drafts;
create trigger trg_user_test_drafts_updated_at
before update on public.user_test_drafts
for each row execute function public.set_user_test_drafts_updated_at();