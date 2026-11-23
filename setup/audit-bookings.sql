-- Apply to the dedicated Supabase database before enabling audit checkout.
create table public.audit_bookings (
  id uuid primary key,
  stripe_session text unique not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  blocked_until timestamptz not null,
  checkout_expires_at timestamptz not null,
  status text not null default 'held' check (status in ('held', 'expired', 'paid', 'confirmed')),
  check (starts_at < ends_at and ends_at <= blocked_until)
);

alter table public.audit_bookings enable row level security;
revoke all on public.audit_bookings from public, anon, authenticated;
grant select, update on public.audit_bookings to service_role;
create index audit_bookings_active_start on public.audit_bookings (starts_at)
  where status in ('held', 'paid', 'confirmed');

create function public.reserve_audit(
  p_id uuid, p_session text, p_start timestamptz, p_end timestamptz,
  p_expires timestamptz, p_buffer integer, p_capacity integer
) returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  week_start timestamp := date_trunc('week', p_start at time zone 'Europe/Berlin');
begin
  perform pg_advisory_xact_lock(807195);
  if p_start <= now() or p_expires <= now() or exists (
    select 1 from public.audit_bookings
    where status in ('held', 'paid', 'confirmed')
      and starts_at < p_end + make_interval(mins => p_buffer)
      and blocked_until > p_start
  ) or (
    select count(*) from public.audit_bookings
    where status in ('held', 'paid', 'confirmed')
      and starts_at >= (week_start at time zone 'Europe/Berlin')
      and starts_at < ((week_start + interval '7 days') at time zone 'Europe/Berlin')
  ) >= p_capacity then
    return false;
  end if;

  insert into public.audit_bookings (id, stripe_session, starts_at, ends_at, blocked_until, checkout_expires_at)
  values (p_id, p_session, p_start, p_end, p_end + make_interval(mins => p_buffer), p_expires);
  return true;
end;
$$;

revoke all on function public.reserve_audit(uuid, text, timestamptz, timestamptz, timestamptz, integer, integer)
  from public, anon, authenticated;
grant insert on public.audit_bookings to service_role;
grant execute on function public.reserve_audit(uuid, text, timestamptz, timestamptz, timestamptz, integer, integer)
  to service_role;
