-- Keep check_in / post_charge / record_payment / check_out / close_business_day
-- as the only paths that change reservation, room and folio state.
--
-- 20261126160531 added pay_balance_test() and set_room_clean(), which wrote
-- payments and room status directly. Nothing calls them; they are disabled
-- here (execute revoked) rather than dropped, and guest payments go through
-- record_payment instead.

revoke all on function public.pay_balance_test(uuid) from public, anon, authenticated;
revoke all on function public.set_room_clean(uuid, boolean) from public, anon, authenticated;

-- Guests pay their own outstanding balance from the guest app through the
-- same record_payment path staff use. PROTOTYPE: the card charge is simulated
-- (reference TEST-…); a guest can only pay by card, only while checked in,
-- and never more than the balance.
create or replace function public.record_payment(
  p_reservation uuid, p_method public.payment_method, p_amount_kobo bigint, p_reference text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_folio public.folios; v_res public.reservations; v_id uuid; v_staff boolean;
begin
  select f.* into v_folio from public.folios f where f.reservation_id = p_reservation;
  select r.* into v_res from public.reservations r where r.id = p_reservation;
  v_staff := v_folio.id is not null and public.can_access_branch(v_folio.branch_id);
  if v_folio.id is null or not (v_staff or v_res.guest_id = public.my_guest_id()) then
    raise exception 'Folio not found.';
  end if;
  if v_folio.status = 'closed' then raise exception 'This folio is closed.'; end if;
  if p_amount_kobo is null or p_amount_kobo <= 0 then raise exception 'Enter an amount greater than zero.'; end if;
  if not v_staff then
    if p_method <> 'paystack' then raise exception 'Guests can only pay by card.'; end if;
    if v_res.status <> 'checked_in' then raise exception 'You can pay once you are checked in.'; end if;
    if p_amount_kobo > public.folio_balance_kobo(v_folio.id) then
      raise exception 'That is more than your outstanding balance.';
    end if;
  end if;
  insert into public.payments (folio_id, branch_id, method, amount_kobo, reference, received_by)
  values (v_folio.id, v_folio.branch_id, p_method, p_amount_kobo, nullif(p_reference,''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;
