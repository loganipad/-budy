-- Atomic AI Deep Dive credit consumption helper.
-- Run in Supabase SQL editor before deploying atomic credit enforcement.

create or replace function public.consume_ai_deep_dive_credit(
  p_user_id text,
  p_period_key text,
  p_email text,
  p_credit_limit integer
)
returns table (
  used_count integer,
  credit_limit integer,
  remaining_credits integer,
  consumed boolean
)
language plpgsql
as $$
declare
  v_limit integer := greatest(1, coalesce(p_credit_limit, 1));
begin
  if p_user_id is null or btrim(p_user_id) = '' then
    raise exception 'Missing user id';
  end if;

  if p_period_key is null or btrim(p_period_key) = '' then
    raise exception 'Missing period key';
  end if;

  insert into public.ai_deep_dive_usage (user_id, period_key, email, used_count, credit_limit, updated_at)
  values (p_user_id, p_period_key, nullif(lower(btrim(coalesce(p_email, ''))), ''), 1, v_limit, timezone('utc', now()))
  on conflict (user_id, period_key)
  do update
    set used_count = case
      when public.ai_deep_dive_usage.used_count < greatest(public.ai_deep_dive_usage.credit_limit, excluded.credit_limit)
        then public.ai_deep_dive_usage.used_count + 1
      else public.ai_deep_dive_usage.used_count
    end,
        credit_limit = greatest(public.ai_deep_dive_usage.credit_limit, excluded.credit_limit),
        email = coalesce(nullif(lower(btrim(excluded.email)), ''), public.ai_deep_dive_usage.email),
        updated_at = timezone('utc', now())
  returning
    public.ai_deep_dive_usage.used_count,
    public.ai_deep_dive_usage.credit_limit,
    greatest(public.ai_deep_dive_usage.credit_limit - public.ai_deep_dive_usage.used_count, 0),
    public.ai_deep_dive_usage.used_count <= public.ai_deep_dive_usage.credit_limit
  into used_count, credit_limit, remaining_credits, consumed;

  return next;
end;
$$;
