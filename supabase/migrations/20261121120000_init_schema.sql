-- Lumaana prototype: initial schema
-- Scope: HQ/branch tenancy, rooms, reservations, folios, payments,
-- guest requests, maintenance, procurement, night audit, storage policies.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------
create type public.user_role as enum
  ('hq_admin','branch_admin','front_desk','procurement','maintenance','guest');
create type public.room_status as enum
  ('vacant_clean','vacant_dirty','occupied','out_of_order');
create type public.reservation_status as enum
  ('pending_payment','confirmed','checked_in','checked_out','cancelled','no_show');
create type public.reservation_source as enum ('online','walk_in','phone');
create type public.folio_item_kind as enum
  ('room','food','laundry','minibar','other','tax','discount');
create type public.payment_method as enum ('cash','pos','transfer','paystack');
create type public.payment_status as enum ('pending','succeeded','failed','refunded');
create type public.request_type as enum ('housekeeping','laundry','room_service','repair');
create type public.request_status as enum ('open','in_progress','done','cancelled');
create type public.ticket_status as enum ('open','assigned','in_progress','closed');
create type public.ticket_priority as enum ('low','medium','high');
create type public.pr_status as enum ('draft','submitted','approved','rejected');
create type public.audit_status as enum ('open','closed');

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------
create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  city        text not null,
  address     text,
  phone       text,
  hero_image  text,
  currency    text not null default 'NGN',
  vat_rate    numeric(5,4) not null default 0.075,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text,
  role        public.user_role not null default 'guest',
  branch_id   uuid references public.branches(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint staff_need_branch check (
    role in ('hq_admin','guest') or branch_id is not null
  )
);

create table public.room_types (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references public.branches(id) on delete cascade,
  name           text not null,
  description    text,
  base_rate_kobo bigint not null check (base_rate_kobo >= 0),
  max_guests     int not null default 2,
  photo_url      text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (branch_id, name)
);

create table public.rooms (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references public.branches(id) on delete cascade,
  room_type_id  uuid not null references public.room_types(id) on delete restrict,
  number        text not null,
  floor         text,
  status        public.room_status not null default 'vacant_clean',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (branch_id, number)
);

create table public.guests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete set null,
  full_name     text not null,
  email         text,
  phone         text,
  id_type       text,
  id_number     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index guests_email_key on public.guests (lower(email)) where email is not null;

create table public.reservations (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references public.branches(id) on delete cascade,
  room_type_id   uuid not null references public.room_types(id),
  room_id        uuid references public.rooms(id),
  guest_id       uuid not null references public.guests(id),
  check_in       date not null,
  check_out      date not null,
  adults         int not null default 1,
  children       int not null default 0,
  status         public.reservation_status not null default 'pending_payment',
  source         public.reservation_source not null default 'online',
  nightly_rate_kobo bigint not null,
  total_kobo     bigint not null,
  currency       text not null default 'NGN',
  id_photo_path  text,
  notes          text,
  confirmation_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_by     uuid references auth.users(id),
  checked_in_at  timestamptz,
  checked_out_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint stay_dates check (check_out > check_in),
  -- no two live reservations on the same physical room for overlapping nights
  constraint reservations_no_overlap exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (room_id is not null and status in ('confirmed','checked_in'))
);
create index reservations_branch_dates on public.reservations (branch_id, check_in, check_out);
create index reservations_guest on public.reservations (guest_id);

create table public.folios (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references public.branches(id) on delete cascade,
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  currency       text not null default 'NGN',
  status         text not null default 'open' check (status in ('open','closed')),
  closed_at      timestamptz,
  created_at     timestamptz not null default now()
);

create table public.folio_items (
  id            uuid primary key default gen_random_uuid(),
  folio_id      uuid not null references public.folios(id) on delete cascade,
  branch_id     uuid not null references public.branches(id) on delete cascade,
  kind          public.folio_item_kind not null,
  description   text not null,
  qty           numeric(10,2) not null default 1,
  unit_kobo     bigint not null,
  amount_kobo   bigint not null,
  business_date date not null default current_date,
  posted_by     uuid references auth.users(id),
  posted_at     timestamptz not null default now()
);
create index folio_items_folio on public.folio_items (folio_id);

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  folio_id      uuid not null references public.folios(id) on delete cascade,
  branch_id     uuid not null references public.branches(id) on delete cascade,
  method        public.payment_method not null,
  amount_kobo   bigint not null check (amount_kobo > 0),
  status        public.payment_status not null default 'succeeded',
  reference     text unique,
  business_date date not null default current_date,
  received_by   uuid references auth.users(id),
  paid_at       timestamptz not null default now()
);
create index payments_folio on public.payments (folio_id);

create table public.service_requests (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references public.branches(id) on delete cascade,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  type           public.request_type not null,
  note           text,
  status         public.request_status not null default 'open',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.maintenance_tickets (
  id           uuid primary key default gen_random_uuid(),
  branch_id    uuid not null references public.branches(id) on delete cascade,
  room_id      uuid references public.rooms(id) on delete set null,
  title        text not null,
  description  text,
  priority     public.ticket_priority not null default 'medium',
  status       public.ticket_status not null default 'open',
  blocks_room  boolean not null default false,
  assigned_to  uuid references auth.users(id),
  created_by   uuid references auth.users(id),
  closed_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.purchase_requests (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references public.branches(id) on delete cascade,
  title         text not null,
  notes         text,
  status        public.pr_status not null default 'draft',
  total_kobo    bigint not null default 0,
  requested_by  uuid references auth.users(id),
  decided_by    uuid references auth.users(id),
  decided_at    timestamptz,
  decision_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.purchase_request_items (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid not null references public.purchase_requests(id) on delete cascade,
  branch_id    uuid not null references public.branches(id) on delete cascade,
  description  text not null,
  qty          numeric(10,2) not null default 1,
  unit_kobo    bigint not null default 0
);

create table public.night_audits (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references public.branches(id) on delete cascade,
  business_date date not null,
  status        public.audit_status not null default 'closed',
  summary       jsonb not null default '{}'::jsonb,
  closed_by     uuid references auth.users(id),
  closed_at     timestamptz not null default now(),
  unique (branch_id, business_date)
);

-- ---------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ declare t text;
begin
  foreach t in array array['branches','profiles','room_types','rooms','guests',
    'reservations','service_requests','maintenance_tickets','purchase_requests']
  loop
    execute format('create trigger %I_updated_at before update on public.%I
      for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------
-- Auth helpers (security definer so RLS policies can call them cheaply)
-- ---------------------------------------------------------------
create or replace function public.app_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.app_branch_id() returns uuid
language sql stable security definer set search_path = public as $$
  select branch_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_hq() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'hq_admin' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role <> 'guest' from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.can_access_branch(p_branch uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_hq() or (public.is_staff() and public.app_branch_id() = p_branch)
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('hq_admin','branch_admin') from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.my_guest_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.guests where user_id = auth.uid()
$$;

-- Create a profile for every new auth user. Role/branch can be passed in
-- user metadata by the seed script or an admin; public sign-ups are guests.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'guest');
  v_branch uuid := nullif(new.raw_user_meta_data->>'branch_id','')::uuid;
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

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- Day lock: nothing posts to a closed business day
-- ---------------------------------------------------------------
-- New postings roll forward to the first open business day; existing rows on a
-- closed day cannot be changed.
create or replace function public.assert_day_open() returns trigger
language plpgsql as $$
declare v_last_closed date;
begin
  select max(a.business_date) into v_last_closed
  from public.night_audits a
  where a.branch_id = new.branch_id and a.status = 'closed';

  if v_last_closed is null or new.business_date > v_last_closed then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.business_date := v_last_closed + 1;   -- roll to the next open day
    return new;
  end if;

  raise exception 'Business day % is closed for this branch and cannot be changed.', old.business_date
    using errcode = 'check_violation';
end $$;

create trigger folio_items_day_open before insert or update on public.folio_items
  for each row execute function public.assert_day_open();
create trigger payments_day_open before insert or update on public.payments
  for each row execute function public.assert_day_open();

-- ---------------------------------------------------------------
-- Business functions
-- ---------------------------------------------------------------

-- Public availability by room type for a branch and date range.
create or replace function public.available_room_types(
  p_branch uuid, p_check_in date, p_check_out date
) returns table (
  room_type_id uuid, name text, description text, base_rate_kobo bigint,
  max_guests int, photo_url text, total_rooms int, available_rooms int
)
language sql stable security definer set search_path = public as $$
  select rt.id, rt.name, rt.description, rt.base_rate_kobo, rt.max_guests, rt.photo_url,
    count(distinct r.id)::int,
    greatest(0, count(distinct r.id) - coalesce((
      select count(*) from public.reservations res
      where res.room_type_id = rt.id
        and res.status in ('pending_payment','confirmed','checked_in')
        and (res.status <> 'pending_payment' or res.created_at > now() - interval '30 minutes')
        and daterange(res.check_in, res.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
    ), 0))::int
  from public.room_types rt
  left join public.rooms r on r.room_type_id = rt.id and r.status <> 'out_of_order'
  where rt.branch_id = p_branch and p_check_out > p_check_in
  group by rt.id
  order by rt.sort_order, rt.base_rate_kobo
$$;

-- Online booking: creates/links the guest and a pending reservation.
-- Returns the reservation id, total and confirmation code for the payment step.
create or replace function public.create_online_booking(
  p_branch uuid, p_room_type uuid, p_check_in date, p_check_out date,
  p_adults int, p_children int,
  p_full_name text, p_email text, p_phone text
) returns table (reservation_id uuid, total_kobo bigint, confirmation_code text)
language plpgsql security definer set search_path = public as $$
declare
  v_rate bigint; v_nights int; v_guest uuid; v_res public.reservations;
  v_available int;
begin
  if p_check_out <= p_check_in then raise exception 'Check-out must be after check-in.'; end if;
  select base_rate_kobo into v_rate from public.room_types where id = p_room_type and branch_id = p_branch;
  if v_rate is null then raise exception 'Room type not found.'; end if;

  select available_rooms into v_available
  from public.available_room_types(p_branch, p_check_in, p_check_out) where room_type_id = p_room_type;
  if coalesce(v_available,0) < 1 then raise exception 'No rooms of this type are available for those dates.'; end if;

  insert into public.guests (full_name, email, phone, user_id)
  values (p_full_name, nullif(p_email,''), nullif(p_phone,''), auth.uid())
  on conflict (lower(email)) where email is not null
  do update set full_name = excluded.full_name, phone = coalesce(excluded.phone, guests.phone),
                user_id = coalesce(guests.user_id, excluded.user_id)
  returning id into v_guest;

  v_nights := p_check_out - p_check_in;
  insert into public.reservations
    (branch_id, room_type_id, guest_id, check_in, check_out, adults, children,
     status, source, nightly_rate_kobo, total_kobo, created_by)
  values (p_branch, p_room_type, v_guest, p_check_in, p_check_out, p_adults, p_children,
     'pending_payment', 'online', v_rate, v_rate * v_nights, auth.uid())
  returning * into v_res;

  return query select v_res.id, v_res.total_kobo, v_res.confirmation_code;
end $$;

-- Called by the Paystack webhook (service role) after verifying the charge.
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

  -- one room-night line per night, dated to the night it covers
  for d in select generate_series(v_res.check_in, v_res.check_out - 1, '1 day')::date loop
    insert into public.folio_items (folio_id, branch_id, kind, description, qty, unit_kobo, amount_kobo, business_date)
    values (v_folio, v_res.branch_id, 'room', 'Room night ' || to_char(d, 'DD Mon'), 1, v_res.nightly_rate_kobo, v_res.nightly_rate_kobo, greatest(d, current_date));
  end loop;

  insert into public.payments (folio_id, branch_id, method, amount_kobo, status, reference)
  values (v_folio, v_res.branch_id, 'paystack', p_amount_kobo, 'succeeded', p_reference);
end $$;

-- Walk-in / phone booking by staff: confirmed immediately, folio opened, payment taken at desk.
create or replace function public.create_desk_booking(
  p_branch uuid, p_room_type uuid, p_check_in date, p_check_out date,
  p_adults int, p_full_name text, p_email text, p_phone text, p_source public.reservation_source
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_rate bigint; v_nights int; v_guest uuid; v_res_id uuid; v_folio uuid; d date;
begin
  if not public.can_access_branch(p_branch) then raise exception 'Not allowed for this branch.'; end if;
  select base_rate_kobo into v_rate from public.room_types where id = p_room_type and branch_id = p_branch;
  if v_rate is null then raise exception 'Room type not found.'; end if;

  insert into public.guests (full_name, email, phone) values (p_full_name, nullif(p_email,''), nullif(p_phone,''))
  on conflict (lower(email)) where email is not null
  do update set full_name = excluded.full_name, phone = coalesce(excluded.phone, guests.phone)
  returning id into v_guest;

  v_nights := p_check_out - p_check_in;
  insert into public.reservations
    (branch_id, room_type_id, guest_id, check_in, check_out, adults, status, source, nightly_rate_kobo, total_kobo, created_by)
  values (p_branch, p_room_type, v_guest, p_check_in, p_check_out, p_adults, 'confirmed', p_source, v_rate, v_rate * v_nights, auth.uid())
  returning id into v_res_id;

  insert into public.folios (branch_id, reservation_id) values (p_branch, v_res_id) returning id into v_folio;
  for d in select generate_series(p_check_in, p_check_out - 1, '1 day')::date loop
    insert into public.folio_items (folio_id, branch_id, kind, description, qty, unit_kobo, amount_kobo, business_date, posted_by)
    values (v_folio, p_branch, 'room', 'Room night ' || to_char(d, 'DD Mon'), 1, v_rate, v_rate, greatest(d, current_date), auth.uid());
  end loop;
  return v_res_id;
end $$;

-- Check-in: assign a room, capture ID, flip statuses. Exclusion constraint guards the room.
create or replace function public.check_in(
  p_reservation uuid, p_room uuid, p_id_type text, p_id_number text, p_id_photo_path text
) returns void
language plpgsql security definer set search_path = public as $$
declare v_res public.reservations; v_room public.rooms;
begin
  select * into v_res from public.reservations where id = p_reservation for update;
  if v_res.id is null or not public.can_access_branch(v_res.branch_id) then raise exception 'Reservation not found.'; end if;
  if v_res.status <> 'confirmed' then raise exception 'Only confirmed reservations can be checked in (this one is %).', v_res.status; end if;
  select * into v_room from public.rooms where id = p_room and branch_id = v_res.branch_id for update;
  if v_room.id is null then raise exception 'Room not found at this branch.'; end if;
  if v_room.room_type_id <> v_res.room_type_id then raise exception 'Room % is not a % room.', v_room.number, (select name from public.room_types where id = v_res.room_type_id); end if;
  if v_room.status <> 'vacant_clean' then raise exception 'Room % is %, not ready.', v_room.number, replace(v_room.status::text,'_',' '); end if;

  update public.guests set id_type = p_id_type, id_number = p_id_number where id = v_res.guest_id;
  update public.reservations
     set room_id = p_room, status = 'checked_in', checked_in_at = now(), id_photo_path = p_id_photo_path
   where id = p_reservation;
  update public.rooms set status = 'occupied' where id = p_room;
end $$;

-- Charge something to a room. Staff only.
create or replace function public.post_charge(
  p_reservation uuid, p_kind public.folio_item_kind, p_description text, p_qty numeric, p_unit_kobo bigint
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_folio public.folios; v_id uuid;
begin
  select f.* into v_folio from public.folios f where f.reservation_id = p_reservation;
  if v_folio.id is null or not public.can_access_branch(v_folio.branch_id) then raise exception 'Folio not found.'; end if;
  if v_folio.status = 'closed' then raise exception 'This folio is closed.'; end if;
  insert into public.folio_items (folio_id, branch_id, kind, description, qty, unit_kobo, amount_kobo, posted_by)
  values (v_folio.id, v_folio.branch_id, p_kind, p_description, p_qty, p_unit_kobo, round(p_qty * p_unit_kobo), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- Record a payment against a folio. Staff only (Paystack payments come via the webhook).
create or replace function public.record_payment(
  p_reservation uuid, p_method public.payment_method, p_amount_kobo bigint, p_reference text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_folio public.folios; v_id uuid;
begin
  select f.* into v_folio from public.folios f where f.reservation_id = p_reservation;
  if v_folio.id is null or not public.can_access_branch(v_folio.branch_id) then raise exception 'Folio not found.'; end if;
  if v_folio.status = 'closed' then raise exception 'This folio is closed.'; end if;
  insert into public.payments (folio_id, branch_id, method, amount_kobo, reference, received_by)
  values (v_folio.id, v_folio.branch_id, p_method, p_amount_kobo, nullif(p_reference,''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.folio_balance_kobo(p_folio uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(amount_kobo) from public.folio_items where folio_id = p_folio),0)
       - coalesce((select sum(amount_kobo) from public.payments where folio_id = p_folio and status = 'succeeded'),0)
$$;

-- Check-out (desk or express from the guest app). Requires a settled folio.
create or replace function public.check_out(p_reservation uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_res public.reservations; v_folio public.folios; v_bal bigint;
begin
  select * into v_res from public.reservations where id = p_reservation for update;
  if v_res.id is null then raise exception 'Reservation not found.'; end if;
  if not (public.can_access_branch(v_res.branch_id) or v_res.guest_id = public.my_guest_id()) then
    raise exception 'Not allowed.';
  end if;
  if v_res.status <> 'checked_in' then raise exception 'Guest is not checked in.'; end if;
  select * into v_folio from public.folios where reservation_id = p_reservation;
  v_bal := public.folio_balance_kobo(v_folio.id);
  if v_bal > 0 then raise exception 'Outstanding balance of ₦% must be settled first.', to_char(v_bal/100.0, 'FM999,999,990.00'); end if;

  update public.reservations set status = 'checked_out', checked_out_at = now() where id = p_reservation;
  update public.folios set status = 'closed', closed_at = now() where id = v_folio.id;
  update public.rooms set status = 'vacant_dirty' where id = v_res.room_id;
end $$;

-- Maintenance: put a room out of order / back in service when a blocking ticket opens/closes.
create or replace function public.sync_room_from_ticket() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.room_id is null then return new; end if;
  if new.blocks_room and new.status <> 'closed' then
    update public.rooms set status = 'out_of_order' where id = new.room_id and status <> 'occupied';
  elsif new.status = 'closed' and (tg_op = 'INSERT' or old.status <> 'closed') then
    update public.rooms set status = 'vacant_dirty' where id = new.room_id and status = 'out_of_order';
  end if;
  return new;
end $$;
create trigger maintenance_tickets_sync_room after insert or update on public.maintenance_tickets
  for each row execute function public.sync_room_from_ticket();

-- Procurement decision: managers only, HQ for any branch.
create or replace function public.decide_purchase_request(p_request uuid, p_approve boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_pr public.purchase_requests;
begin
  select * into v_pr from public.purchase_requests where id = p_request for update;
  if v_pr.id is null or not public.can_access_branch(v_pr.branch_id) then raise exception 'Request not found.'; end if;
  if not public.is_manager() then raise exception 'Only a branch manager or HQ can decide a request.'; end if;
  if v_pr.status <> 'submitted' then raise exception 'Request is %, not awaiting decision.', v_pr.status; end if;
  update public.purchase_requests
     set status = case when p_approve then 'approved' else 'rejected' end::public.pr_status,
         decided_by = auth.uid(), decided_at = now(), decision_note = p_note
   where id = p_request;
end $$;

-- Keep purchase_requests.total_kobo in step with its items.
create or replace function public.recalc_pr_total() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_req uuid := coalesce(new.request_id, old.request_id);
begin
  update public.purchase_requests
     set total_kobo = coalesce((select sum(round(qty*unit_kobo)) from public.purchase_request_items where request_id = v_req),0)
   where id = v_req;
  return null;
end $$;
create trigger pr_items_total after insert or update or delete on public.purchase_request_items
  for each row execute function public.recalc_pr_total();

-- Night audit: check the day, write the summary, lock it.
create or replace function public.close_business_day(p_branch uuid, p_date date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_summary jsonb; v_rooms int; v_occupied int; v_unsettled int;
begin
  if not public.can_access_branch(p_branch) or not public.is_manager() and public.app_role() <> 'front_desk' then
    raise exception 'Not allowed.';
  end if;
  if exists (select 1 from public.night_audits where branch_id = p_branch and business_date = p_date and status = 'closed') then
    raise exception 'Business day % is already closed.', p_date;
  end if;
  -- discrepancies: checked-out guests with an open balance
  select count(*) into v_unsettled
  from public.reservations r join public.folios f on f.reservation_id = r.id
  where r.branch_id = p_branch and r.status = 'checked_out' and public.folio_balance_kobo(f.id) <> 0;
  if v_unsettled > 0 then
    raise exception '% checked-out folio(s) still carry a balance. Settle them before closing the day.', v_unsettled;
  end if;

  select count(*) into v_rooms from public.rooms where branch_id = p_branch and status <> 'out_of_order';
  select count(*) into v_occupied from public.reservations
   where branch_id = p_branch and status in ('checked_in','checked_out')
     and daterange(check_in, check_out, '[)') @> p_date;

  v_summary := jsonb_build_object(
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
    'rooms_out_of_order', (select count(*) from public.rooms where branch_id = p_branch and status = 'out_of_order')
  );

  insert into public.night_audits (branch_id, business_date, status, summary, closed_by)
  values (p_branch, p_date, 'closed', v_summary, auth.uid());
  return v_summary;
end $$;

-- HQ / branch report over a date range. Runs as the caller, so RLS scopes it.
create or replace function public.branch_report(p_from date, p_to date)
returns table (
  branch_id uuid, branch_name text, rooms int, room_nights_available int, room_nights_sold int,
  occupancy_pct numeric, room_revenue_kobo bigint, other_revenue_kobo bigint, payments_kobo bigint
)
language sql stable security invoker set search_path = public as $$
  with b as (
    select br.id, br.name, (select count(*) from public.rooms r where r.branch_id = br.id)::int as rooms
    from public.branches br
  ), nights as (
    select r.branch_id, sum(
      greatest(0, least(r.check_out, p_to + 1) - greatest(r.check_in, p_from))
    )::int as sold
    from public.reservations r
    where r.status in ('confirmed','checked_in','checked_out')
      and daterange(r.check_in, r.check_out, '[)') && daterange(p_from, p_to + 1, '[)')
    group by r.branch_id
  ), rev as (
    select branch_id,
      sum(amount_kobo) filter (where kind = 'room') as room_rev,
      sum(amount_kobo) filter (where kind <> 'room') as other_rev
    from public.folio_items where business_date between p_from and p_to group by branch_id
  ), pay as (
    select branch_id, sum(amount_kobo) as paid from public.payments
    where business_date between p_from and p_to and status = 'succeeded' group by branch_id
  )
  select b.id, b.name, b.rooms,
    (b.rooms * (p_to - p_from + 1))::int,
    coalesce(n.sold,0),
    case when b.rooms = 0 then 0 else round(100.0 * coalesce(n.sold,0) / (b.rooms * (p_to - p_from + 1)), 1) end,
    coalesce(rev.room_rev,0), coalesce(rev.other_rev,0), coalesce(pay.paid,0)
  from b left join nights n on n.branch_id = b.id
         left join rev on rev.branch_id = b.id
         left join pay on pay.branch_id = b.id
  order by b.name
$$;

-- Demo reset for the seed script (service role only — no grants below).
create or replace function public.reset_demo_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  truncate public.night_audits, public.purchase_request_items, public.purchase_requests,
           public.maintenance_tickets, public.service_requests, public.payments, public.folio_items,
           public.folios, public.reservations, public.guests, public.rooms, public.room_types,
           public.branches restart identity cascade;
end $$;

-- ---------------------------------------------------------------
-- Grants (explicit, so the schema does not depend on dashboard defaults)
-- ---------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.branches, public.room_types to anon;
grant execute on function
  public.app_role(), public.app_branch_id(), public.is_hq(), public.is_staff(),
  public.can_access_branch(uuid), public.is_manager(), public.my_guest_id()
  to anon, authenticated;

revoke all on function public.reset_demo_data() from public, anon, authenticated;
revoke all on function public.confirm_online_payment(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.available_room_types(uuid, date, date) to anon, authenticated;
grant execute on function public.create_online_booking(uuid, uuid, date, date, int, int, text, text, text) to anon, authenticated;
grant execute on function
  public.create_desk_booking(uuid, uuid, date, date, int, text, text, text, public.reservation_source),
  public.check_in(uuid, uuid, text, text, text),
  public.post_charge(uuid, public.folio_item_kind, text, numeric, bigint),
  public.record_payment(uuid, public.payment_method, bigint, text),
  public.folio_balance_kobo(uuid),
  public.check_out(uuid),
  public.decide_purchase_request(uuid, boolean, text),
  public.close_business_day(uuid, date),
  public.branch_report(date, date)
  to authenticated;

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.branches               enable row level security;
alter table public.profiles               enable row level security;
alter table public.room_types             enable row level security;
alter table public.rooms                  enable row level security;
alter table public.guests                 enable row level security;
alter table public.reservations           enable row level security;
alter table public.folios                 enable row level security;
alter table public.folio_items            enable row level security;
alter table public.payments               enable row level security;
alter table public.service_requests       enable row level security;
alter table public.maintenance_tickets    enable row level security;
alter table public.purchase_requests      enable row level security;
alter table public.purchase_request_items enable row level security;
alter table public.night_audits           enable row level security;

-- Public catalogue (website)
create policy branches_public_read on public.branches for select using (true);
create policy room_types_public_read on public.room_types for select using (true);
create policy branches_hq_write on public.branches for all
  using (public.is_hq()) with check (public.is_hq());
create policy room_types_manager_write on public.room_types for all
  using (public.is_manager() and public.can_access_branch(branch_id))
  with check (public.is_manager() and public.can_access_branch(branch_id));

-- Profiles: self, plus staff directory within scope
create policy profiles_self on public.profiles for select using (id = auth.uid());
create policy profiles_staff_read on public.profiles for select
  using (public.is_staff() and (public.is_hq() or branch_id = public.app_branch_id()));
create policy profiles_self_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = public.app_role() and branch_id is not distinct from public.app_branch_id());
create policy profiles_manager_write on public.profiles for all
  using (public.is_manager() and (public.is_hq() or branch_id = public.app_branch_id()))
  with check (public.is_manager() and (public.is_hq() or branch_id = public.app_branch_id()));

-- Rooms: staff of the branch; managers edit
create policy rooms_staff_read on public.rooms for select using (public.can_access_branch(branch_id));
create policy rooms_staff_update on public.rooms for update
  using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy rooms_manager_write on public.rooms for insert
  with check (public.is_manager() and public.can_access_branch(branch_id));
create policy rooms_manager_delete on public.rooms for delete
  using (public.is_manager() and public.can_access_branch(branch_id));

-- Guests: staff see guests with a reservation at their branch; a guest sees themselves
create policy guests_self on public.guests for select using (user_id = auth.uid());
create policy guests_self_update on public.guests for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy guests_staff on public.guests for all
  using (public.is_hq() or exists (
    select 1 from public.reservations r where r.guest_id = guests.id and public.can_access_branch(r.branch_id)))
  with check (public.is_staff());

-- Reservations
create policy reservations_staff on public.reservations for all
  using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy reservations_guest_read on public.reservations for select
  using (guest_id = public.my_guest_id());

-- Folios / items / payments: staff full within branch; guest read own
create policy folios_staff on public.folios for all
  using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy folios_guest_read on public.folios for select
  using (exists (select 1 from public.reservations r where r.id = folios.reservation_id and r.guest_id = public.my_guest_id()));

create policy folio_items_staff on public.folio_items for all
  using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy folio_items_guest_read on public.folio_items for select
  using (exists (select 1 from public.folios f join public.reservations r on r.id = f.reservation_id
                 where f.id = folio_items.folio_id and r.guest_id = public.my_guest_id()));

create policy payments_staff on public.payments for all
  using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy payments_guest_read on public.payments for select
  using (exists (select 1 from public.folios f join public.reservations r on r.id = f.reservation_id
                 where f.id = payments.folio_id and r.guest_id = public.my_guest_id()));

-- Service requests: guest creates/reads own; staff of branch handle
create policy service_requests_staff on public.service_requests for all
  using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy service_requests_guest_read on public.service_requests for select
  using (exists (select 1 from public.reservations r where r.id = service_requests.reservation_id and r.guest_id = public.my_guest_id()));
create policy service_requests_guest_insert on public.service_requests for insert
  with check (exists (select 1 from public.reservations r where r.id = reservation_id
                      and r.guest_id = public.my_guest_id() and r.status = 'checked_in' and r.branch_id = branch_id));

-- Maintenance, procurement, audits: branch-scoped staff
create policy maintenance_staff on public.maintenance_tickets for all
  using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy purchase_requests_staff on public.purchase_requests for all
  using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy purchase_request_items_staff on public.purchase_request_items for all
  using (public.can_access_branch(branch_id)) with check (public.can_access_branch(branch_id));
create policy night_audits_staff_read on public.night_audits for select
  using (public.can_access_branch(branch_id));
-- night_audits are written only by close_business_day()

-- ---------------------------------------------------------------
-- Storage buckets and policies
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('guest-ids', 'guest-ids', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('media', 'media', true, 20971520, array['image/jpeg','image/png','image/webp','video/mp4'])
on conflict (id) do nothing;

-- guest-ids: path is <branch_id>/<reservation_id>.<ext>; staff of that branch only
create policy guest_ids_staff_read on storage.objects for select
  using (bucket_id = 'guest-ids' and public.can_access_branch(((storage.foldername(name))[1])::uuid));
create policy guest_ids_staff_write on storage.objects for insert
  with check (bucket_id = 'guest-ids' and public.can_access_branch(((storage.foldername(name))[1])::uuid));
create policy guest_ids_staff_update on storage.objects for update
  using (bucket_id = 'guest-ids' and public.can_access_branch(((storage.foldername(name))[1])::uuid));

-- media: anyone reads, staff write
create policy media_public_read on storage.objects for select using (bucket_id = 'media');
create policy media_staff_write on storage.objects for insert with check (bucket_id = 'media' and public.is_staff());
create policy media_staff_update on storage.objects for update using (bucket_id = 'media' and public.is_staff());
create policy media_staff_delete on storage.objects for delete using (bucket_id = 'media' and public.is_staff());

-- ---------------------------------------------------------------
-- Realtime (guest live bill, front-desk room board)
-- ---------------------------------------------------------------
alter publication supabase_realtime add table public.folio_items, public.payments, public.rooms, public.service_requests;
