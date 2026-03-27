-- Budy.Study current Supabase schema standard.
-- Run this in the Supabase SQL editor to bring an existing project up to date.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.user_test_attempts (
  id bigint generated always as identity primary key,
  user_id text not null,
  section text not null,
  total_score integer not null default 0,
  correct_count integer not null default 0,
  total_questions integer not null default 0,
  skill_breakdown jsonb not null default '{}'::jsonb,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  constraint user_test_attempts_total_score_check check (total_score >= 0),
  constraint user_test_attempts_correct_count_check check (correct_count >= 0),
  constraint user_test_attempts_total_questions_check check (total_questions >= 0),
  constraint user_test_attempts_skill_breakdown_object_check check (jsonb_typeof(skill_breakdown) = 'object')
);

create index if not exists user_test_attempts_user_id_created_at_idx
  on public.user_test_attempts (user_id, created_at desc);

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

drop trigger if exists set_user_subscriptions_updated_at on public.user_subscriptions;
create trigger set_user_subscriptions_updated_at
before update on public.user_subscriptions
for each row
execute function public.set_updated_at();

create table if not exists public.stripe_event_log (
  event_id text primary key,
  event_type text,
  user_id text,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_event_log_user_id_processed_at_idx
  on public.stripe_event_log (user_id, processed_at desc);

create table if not exists public.user_saved_questions (
  id bigint generated always as identity primary key,
  user_id text not null,
  question_key text not null,
  section text not null default 'unknown',
  skill text,
  question_type text,
  prompt text not null,
  passage text,
  answer_options jsonb not null default '[]'::jsonb,
  correct_answer text,
  user_answer text,
  is_correct boolean not null default false,
  is_flagged boolean not null default false,
  was_answered_wrong boolean not null default false,
  source_test_section text,
  source_attempted_at timestamptz,
  last_seen_at timestamptz not null default now(),
  save_count integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_saved_questions_identity_key unique (user_id, question_key),
  constraint user_saved_questions_prompt_check check (char_length(trim(prompt)) > 0),
  constraint user_saved_questions_save_count_check check (save_count >= 1),
  constraint user_saved_questions_answer_options_array_check check (jsonb_typeof(answer_options) = 'array'),
  constraint user_saved_questions_metadata_object_check check (jsonb_typeof(metadata) = 'object')
);

create index if not exists user_saved_questions_user_id_updated_at_idx
  on public.user_saved_questions (user_id, updated_at desc);

create index if not exists user_saved_questions_user_id_wrong_idx
  on public.user_saved_questions (user_id, was_answered_wrong, updated_at desc);

create index if not exists user_saved_questions_user_id_flagged_idx
  on public.user_saved_questions (user_id, is_flagged, updated_at desc);

drop trigger if exists set_user_saved_questions_updated_at on public.user_saved_questions;
create trigger set_user_saved_questions_updated_at
before update on public.user_saved_questions
for each row
execute function public.set_updated_at();