create table if not exists public.rorisk_hacksaw_sessions (
  uuid uuid primary key default gen_random_uuid(),
  session_id uuid not null unique,
  provider_session_id text not null,
  user_uuid uuid not null references public.rorisk_users(uuid) on delete cascade,
  game_code text not null,
  provider_game_id text not null,
  bonus_games jsonb not null default '[]'::jsonb,
  provider_default_balance bigint not null check (provider_default_balance >= 0),
  provider_balance bigint not null check (provider_balance >= 0),
  ended boolean not null default false,
  expires_at timestamptz not null default (now() + interval '12 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rorisk_hacksaw_events (
  uuid uuid primary key default gen_random_uuid(),
  session_uuid uuid not null references public.rorisk_hacksaw_sessions(uuid) on delete cascade,
  user_uuid uuid not null references public.rorisk_users(uuid) on delete cascade,
  request_key text not null,
  provider_round_id text,
  bet_amount bigint not null default 0 check (bet_amount >= 0),
  payout_amount bigint not null default 0 check (payout_amount >= 0),
  balance_delta bigint not null,
  status text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_uuid, request_key)
);

create index if not exists rorisk_hacksaw_sessions_user_active_idx
  on public.rorisk_hacksaw_sessions (user_uuid, ended, updated_at desc);

create index if not exists rorisk_hacksaw_events_user_created_idx
  on public.rorisk_hacksaw_events (user_uuid, created_at desc);

alter table public.rorisk_hacksaw_sessions enable row level security;
alter table public.rorisk_hacksaw_events enable row level security;

create or replace function public.increment_rorisk_slot_launch(p_game_code text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.rorisk_slots
  set launch_count = launch_count + 1
  where game_code = p_game_code and active = true;
$$;

create or replace function public.settle_rorisk_hacksaw_event(
  p_session_id uuid,
  p_request_key text,
  p_expected_provider_balance bigint,
  p_new_provider_balance bigint,
  p_provider_round_id text,
  p_bet_amount bigint,
  p_request_payload jsonb,
  p_response_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.rorisk_hacksaw_sessions%rowtype;
  v_event public.rorisk_hacksaw_events%rowtype;
  v_user public.rorisk_users%rowtype;
  v_delta bigint;
  v_payout bigint;
begin
  if p_request_key is null or p_request_key !~ '^[a-f0-9]{64}$' then
    raise exception 'The slot request key is invalid.';
  end if;
  if p_expected_provider_balance < 0 or p_new_provider_balance < 0 or p_bet_amount < 0 then
    raise exception 'The slot balance payload is invalid.';
  end if;

  select * into v_session
  from public.rorisk_hacksaw_sessions
  where session_id = p_session_id
  for update;

  if not found or v_session.ended or v_session.expires_at <= now() then raise exception 'The slot session is no longer active.'; end if;

  select * into v_event
  from public.rorisk_hacksaw_events
  where session_uuid = v_session.uuid and request_key = p_request_key;

  if found then
    select * into v_user from public.rorisk_users where uuid = v_session.user_uuid;
    return jsonb_build_object('event', to_jsonb(v_event), 'user', to_jsonb(v_user), 'idempotent', true);
  end if;

  if v_session.provider_balance <> p_expected_provider_balance then
    raise exception 'The slot session balance changed unexpectedly.';
  end if;

  v_delta := p_new_provider_balance - p_expected_provider_balance;
  if abs(v_delta) > 1000000000 then raise exception 'The slot balance change is invalid.'; end if;

  select * into v_user
  from public.rorisk_users
  where uuid = v_session.user_uuid
  for update;

  if not found then raise exception 'The slot user could not be found.'; end if;
  if coalesce(v_user.rocoins, 0) + v_delta < 0 then raise exception 'Insufficient balance.'; end if;

  update public.rorisk_users
  set rocoins = coalesce(rocoins, 0) + v_delta
  where uuid = v_user.uuid
  returning * into v_user;

  update public.rorisk_hacksaw_sessions
  set provider_balance = p_new_provider_balance,
      updated_at = now()
  where uuid = v_session.uuid
  returning * into v_session;

  v_payout := greatest(0, v_delta + p_bet_amount);
  insert into public.rorisk_hacksaw_events (
    session_uuid, user_uuid, request_key, provider_round_id, bet_amount,
    payout_amount, balance_delta, status, request_payload, response_payload
  ) values (
    v_session.uuid, v_session.user_uuid, p_request_key, nullif(p_provider_round_id, ''), p_bet_amount,
    v_payout, v_delta, p_response_payload #>> '{round,status}',
    coalesce(p_request_payload, '{}'::jsonb), coalesce(p_response_payload, '{}'::jsonb)
  ) returning * into v_event;

  return jsonb_build_object('event', to_jsonb(v_event), 'user', to_jsonb(v_user), 'idempotent', false);
end;
$$;

revoke all on function public.increment_rorisk_slot_launch(text) from public, anon, authenticated;
revoke all on function public.settle_rorisk_hacksaw_event(uuid, text, bigint, bigint, text, bigint, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.increment_rorisk_slot_launch(text) to service_role;
grant execute on function public.settle_rorisk_hacksaw_event(uuid, text, bigint, bigint, text, bigint, jsonb, jsonb) to service_role;
