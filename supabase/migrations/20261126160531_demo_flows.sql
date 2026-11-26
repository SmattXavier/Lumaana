-- Demo flows: online booking lookup + simulated Paystack, guest app access,
-- housekeeping, night-audit preview, Lagos business dates, signup hardening.

-- ---------------------------------------------------------------
-- Security: roles come from app metadata (service role only), never from
-- user metadata, which anyone can set on a public sign-up.
-- ---------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'guest');
  v_branch uuid := nullif(new.raw_app_meta_data->>'branch_id','')::uuid;
begin
  insert into public.profiles (id, email, full_name, role, branch_id)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), v_role, v_branch);
  if v_role = 'guest' then
    insert into public.guests (user_id, full_name, email, phone)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email, new.raw_user_meta_data->>'phone')
    on conflict (lower(email)) where email is not null
    do update set user_id = excluded.user_id;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------
-- Business dates follow the hotel's clock (WAT), not the server's (UTC).
-- ---------------------------------------------------------------
create or replace function public.lagos_today() returns date
language sql stable set search_path = public as $$
  select (now() at time zone 'Africa/Lagos')::date
$$;

alter table public.folio_items alter column business_date set default public.lagos_today();
alter table public.payments    alter column business_date set default public.lagos_today();

-- The open business day for a branch: the day after the last closed audit,
-- or today if the branch has never closed a day.
create or replace function public.branch_business_date(p_branch uuid) returns date
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select max(business_date) + 1 from public.night_audits where branch_id = p_branch and status = 'closed'),
    public.lagos_today())
$$;

-- Online room nights should be dated in hotel time too.
create or replace function public.confirm_online_payment(
  p_reservation uuid, p_reference text, p_amount_kobo bigint
) returns void
language plpgsql security definer set search_path = public as $$
declare v_res public.reservations; v_folio uuid; d date;
begin
  select * into v_res from public.reservations where id = p_reservation for update;
  if v_res.id is null then raise exception 'Reservation not found.'; end if;
  if v_res.status = 'confirmed' then return; end if;  -- idempotent on webhook retries
  if v_res.status <> 'pending_payment' then raise exception 'Reservation is %.', v_res.status; end if;
  if p_amount_kobo < v_res.total_kobo then raise exception 'Payment short by % kobo.', v_res.total_kobo - p_amount_kobo; end if;

  update public.reservations set status = 'confirmed' where id = p_reservation;

  insert into public.folios (branch_id, reservation_id) values (v_res.branch_id, p_reservation)
  returning id into v_folio;

  for d in select generate_series(v_res.check_in, v_res.check_out - 1, '1 day')::date loop
    insert into public.folio_items (folio_id, branch_id, kind, description, qty, unit_kobo, amount_kobo, business_date)
    values (v_folio, v_res.branch_id, 'room', 'Room night ' || to_char(d, 'DD Mon'), 1, v_res.nightly_rate_kobo, v_res.nightly_rate_kobo, greatest(d, public.lagos_today()));
  end loop;

  insert into public.payments (folio_id, branch_id, method, amount_kobo, status, reference)
  values (v_folio, v_res.branch_id, 'paystack', p_amount_kobo, 'succeeded', p_reference);
end $$;

-- ---------------------------------------------------------------
-- Online booking: public summary by confirmation code, simulated payment
-- ---------------------------------------------------------------
-- The confirmation code is only shown to whoever made the booking, so it
-- works as the bearer token for these two public calls.
create or replace function public.booking_summary(p_code text)
returns table (
  reservation_id uuid, confirmation_code text, status public.reservation_status,
  branch_name text, branch_slug text, branch_address text, branch_phone text,
  room_type text, check_in date, check_out date, nights int, adults int, children int,
  nightly_rate_kobo bigint, total_kobo bigint, currency text,
  guest_name text, guest_email text, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select r.id, r.confirmation_code, r.status,
         b.name, b.slug, b.address, b.phone,
         rt.name, r.check_in, r.check_out, (r.check_out - r.check_in)::int, r.adults, r.children,
         r.nightly_rate_kobo, r.total_kobo, r.currency,
         g.full_name, g.email, r.created_at
  from public.reservations r
  join public.branches b on b.id = r.branch_id
  join public.room_types rt on rt.id = r.room_type_id
  join public.guests g on g.id = r.guest_id
  where r.confirmation_code = upper(trim(p_code)) and r.source = 'online'
$$;

-- PROTOTYPE ONLY: stands in for the Paystack webhook until live keys exist.
-- Confirms a pending online booking as if Paystack had charged the full total.
create or replace function public.confirm_test_payment(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare v_res public.reservations;
begin
  select * into v_res from public.reservations
   where confirmation_code = upper(trim(p_code)) and source = 'online';
  if v_res.id is null then raise exception 'Booking not found.'; end if;
  if v_res.status = 'confirmed' then return v_res.confirmation_code; end if;
  if v_res.status <> 'pending_payment' then raise exception 'This booking is %.', replace(v_res.status::text, '_', ' '); end if;
  if v_res.created_at < now() - interval '30 minutes' then
    raise exception 'This booking hold has expired. Please search again and rebook.';
  end if;
  perform public.confirm_online_payment(
    v_res.id, 'TEST-' || v_res.confirmation_code || '-' || to_char(now(), 'YYYYMMDDHH24MISS'), v_res.total_kobo);
  return v_res.confirmation_code;
end $$;

-- ---------------------------------------------------------------
-- Guest app
-- ---------------------------------------------------------------
-- A guest can see the room they are booked into (number, floor).
create policy rooms_guest_read on public.rooms for select
  using (exists (select 1 from public.reservations r
                 where r.room_id = rooms.id and r.guest_id = public.my_guest_id()));

-- PROTOTYPE ONLY: the guest settles their balance from the guest app
-- (stands in for a Paystack charge). Staff can also call it for a folio they can access.
create or replace function public.pay_balance_test(p_reservation uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_res public.reservations; v_folio public.folios; v_bal bigint;
begin
  select * into v_res from public.reservations where id = p_reservation;
  if v_res.id is null or not (public.can_access_branch(v_res.branch_id) or v_res.guest_id = public.my_guest_id()) then
    raise exception 'Reservation not found.';
  end if;
  if v_res.status <> 'checked_in' then raise exception 'Only an in-house stay can be paid from the guest app.'; end if;
  select * into v_folio from public.folios where reservation_id = p_reservation for update;
  if v_folio.status = 'closed' then raise exception 'This folio is closed.'; end if;
  v_bal := public.folio_balance_kobo(v_folio.id);
  if v_bal <= 0 then raise exception 'Nothing to pay — your bill is settled.'; end if;
  insert into public.payments (folio_id, branch_id, method, amount_kobo, status, reference, received_by)
  values (v_folio.id, v_folio.branch_id, 'paystack', v_bal, 'succeeded',
          'TEST-' || v_res.confirmation_code || '-' || to_char(now(), 'YYYYMMDDHH24MISS'), auth.uid());
  return v_bal;
end $$;

-- ---------------------------------------------------------------
-- Housekeeping: vacant rooms toggle between dirty and clean.
-- Occupied comes from check-in/out, out of order from maintenance tickets.
-- ---------------------------------------------------------------
create or replace function public.set_room_clean(p_room uuid, p_clean boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  select * into v_room from public.rooms where id = p_room for update;
  if v_room.id is null or not public.can_access_branch(v_room.branch_id) then raise exception 'Room not found.'; end if;
  if v_room.status not in ('vacant_clean','vacant_dirty') then
    raise exception 'Room % is %; only vacant rooms can be marked clean or dirty.', v_room.number, replace(v_room.status::text,'_',' ');
  end if;
  update public.rooms
     set status = case when p_clean then 'vacant_clean' else 'vacant_dirty' end::public.room_status
   where id = p_room;
end $$;

-- ---------------------------------------------------------------
-- Night audit: shared summary, a read-only preview, and a stricter close
-- ---------------------------------------------------------------
create or replace function public.business_day_summary(p_branch uuid, p_date date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_rooms int; v_occupied int;
begin
  if not public.can_access_branch(p_branch) then raise exception 'Not allowed.'; end if;
  select count(*) into v_rooms from public.rooms where branch_id = p_branch and status <> 'out_of_order';
  select count(*) into v_occupied from public.reservations
   where branch_id = p_branch and status in ('checked_in','checked_out')
     and daterange(check_in, check_out, '[)') @> p_date;
  return jsonb_build_object(
    'rooms_available', v_rooms,
    'rooms_occupied', v_occupied,
    'occupancy_pct', case when v_rooms = 0 then 0 else round(100.0 * v_occupied / v_rooms, 1) end,
    'room_revenue_kobo', coalesce((select sum(amount_kobo) from public.folio_items where branch_id = p_branch and business_date = p_date and kind = 'room'),0),
    'other_revenue_kobo', coalesce((select sum(amount_kobo) from public.folio_items where branch_id = p_branch and business_date = p_date and kind <> 'room'),0),
    'payments_kobo', coalesce((select sum(amount_kobo) from public.payments where branch_id = p_branch and business_date = p_date and status = 'succeeded'),0),
    'payments_by_method', coalesce((select jsonb_object_agg(method, total) from (
        select method, sum(amount_kobo) total from public.payments
        where branch_id = p_branch and business_date = p_date and status = 'succeeded' group by method) m),'{}'::jsonb),
    'rooms_dirty', (select count(*) from public.rooms where branch_id = p_branch and status = 'vacant_dirty'),
    'rooms_out_of_order', (select count(*) from public.rooms where branch_id = p_branch and status = 'out_of_order'),
    'arrivals_pending', (select count(*) from public.reservations where branch_id = p_branch and status = 'confirmed' and check_in <= p_date),
    'unsettled_checkouts', (select count(*) from public.reservations r join public.folios f on f.reservation_id = r.id
        where r.branch_id = p_branch and r.status = 'checked_out' and public.folio_balance_kobo(f.id) <> 0)
  );
end $$;

create or replace function public.close_business_day(p_branch uuid, p_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_summary jsonb; v_open date;
begin
  if not public.can_access_branch(p_branch) or not public.is_manager() and public.app_role() <> 'front_desk' then
    raise exception 'Not allowed.';
  end if;
  if exists (select 1 from public.night_audits where branch_id = p_branch and business_date = p_date and status = 'closed') then
    raise exception 'Business day % is already closed.', to_char(p_date, 'DD Mon YYYY');
  end if;
  v_open := public.branch_business_date(p_branch);
  if p_date <> v_open then
    raise exception 'The open business day is %; close that day first.', to_char(v_open, 'DD Mon YYYY');
  end if;
  if p_date > public.lagos_today() then
    raise exception 'Business day % has not started yet.', to_char(p_date, 'DD Mon YYYY');
  end if;

  v_summary := public.business_day_summary(p_branch, p_date);
  if (v_summary->>'unsettled_checkouts')::int > 0 then
    raise exception '% checked-out folio(s) still carry a balance. Settle them before closing the day.', v_summary->>'unsettled_checkouts';
  end if;

  insert into public.night_audits (branch_id, business_date, status, summary, closed_by)
  values (p_branch, p_date, 'closed', v_summary, auth.uid());
  return v_summary;
end $$;

-- ---------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------
grant execute on function public.lagos_today() to anon, authenticated;
grant execute on function public.booking_summary(text), public.confirm_test_payment(text) to anon, authenticated;
grant execute on function
  public.branch_business_date(uuid),
  public.pay_balance_test(uuid),
  public.set_room_clean(uuid, boolean),
  public.business_day_summary(uuid, date)
  to authenticated;
revoke all on function public.confirm_online_payment(uuid, text, bigint) from public, anon, authenticated;

-- Front-desk board also reacts to reservations changing (arrivals, check-outs).
alter publication supabase_realtime add table public.reservations;
