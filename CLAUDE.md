# Lumaana — hotel-chain management platform (prototype)

Prototype for a Nigerian hotel chain, due for demo **Thursday 26 Nov 2026**. One Next.js app, one Supabase project, five role-based interfaces. The client judges it by this demo script, in this order:

1. Guest books a room online and pays (Paystack test mode) → confirmation email
2. Front desk checks the guest in, capturing an ID photo
3. Front desk charges food and laundry to the room
4. Guest sees the live bill in the guest app (mobile web)
5. Guest does express checkout
6. Front desk/manager runs night audit; the day locks
7. HQ sees occupancy and revenue per branch and consolidated

Everything built should make one of those steps work or look good. Anything else waits.

## Stack

- Next.js 15 (App Router, `src/` dir, TypeScript strict), Tailwind, shadcn/ui
- Supabase: Postgres, Auth (email/password), Storage, Edge Functions
- `@supabase/ssr` for server/client clients; service role only in `scripts/` and Edge Functions
- Deployed on Vercel from `main`; every push goes live at the client's link
- Supabase CLI via `npx supabase …` (dev dependency, not global)

## Commands

```bash
npm run dev                                   # local app
npx supabase migration new <name>             # new migration file
npx supabase db push                          # apply migrations to the linked project
npx supabase gen types typescript --linked > src/lib/database.types.ts
npm run seed                                  # scripts/seed.ts — resets and reseeds demo data
npx supabase functions deploy <name>          # Edge Functions
```

## Non-negotiables

- **Schema changes only through migrations** in `supabase/migrations/`. Never edit tables in the dashboard. Regenerate `database.types.ts` after every push.
- **Every business table carries `branch_id`** and has RLS enabled. Access is scoped by `can_access_branch(branch_id)`: HQ roles see all branches, branch roles see their own. Do not write a policy that bypasses this. Do not use the service role key in the app.
- **Money is `bigint` kobo** with a `currency` column (NGN only in the prototype). Never floats. Format with `formatKobo()` in `src/lib/money.ts`.
- **State transitions go through SQL functions**, not ad-hoc updates from the client: `create_online_booking`, `confirm_online_payment`, `check_in`, `check_out`, `close_business_day`, `decide_purchase_request`. Add new transitions the same way.
- **One folio per reservation.** Charges are `folio_items`; money in is `payments`. Balance = items − payments, computed, never stored.
- **A closed business day is locked.** The DB trigger rejects items/payments dated on or before the last closed audit for that branch. Don't work around it.
- **Rooms and dates:** reservations use half-open ranges `[check_in, check_out)`; the exclusion constraint prevents double booking per room. Availability per room type comes from `available_room_types()`.
- **Roles** (`profiles.role`): `hq_admin`, `branch_admin`, `front_desk`, `procurement`, `maintenance`, `guest`. Staff have a `branch_id` except `hq_admin`. Guests link to a `guests` row via `user_id`.

## App structure

```
src/app/(public)/            homepage, /hotels/[slug], /book, /book/confirm
src/app/(guest)/stay/        guest app: stay, bill, requests, checkout (mobile-first)
src/app/(staff)/admin/       HQ + branch admin: branches, rooms, rates, staff, reports
src/app/(staff)/front-desk/  calendar, reservations, check-in/out, folio
src/app/(staff)/procurement/ requests, approvals
src/app/(staff)/maintenance/ tickets
src/lib/supabase/            server.ts, client.ts, middleware.ts
src/lib/database.types.ts    generated — do not hand-edit
supabase/migrations/         schema (source of truth)
supabase/functions/          paystack-webhook, send-confirmation
scripts/seed.ts              demo data
```

Middleware reads the profile role once and routes: guests → `/stay`, staff → their area; unauthorized → `/login`. A branch user hitting another branch's data gets an empty result from RLS, not an error — the UI should never need to filter by branch itself.

## Conventions

- Server Components fetch; Client Components only where interaction needs it.
- Forms: Server Actions calling the SQL functions above; show the DB error message verbatim in a toast (they are written to be user-readable).
- Dates: store `date` for stay dates, `timestamptz` for events. `business_date` on items/payments defaults to today.
- Realtime only where the demo needs it: the guest's live bill (`folio_items` for their folio) and the front-desk room board.
- Images: generated concept art lives in the `media` bucket; ID photos in `guest-ids` (private, path `<branch_id>/<reservation_id>.jpg`).
- No new dependencies without a reason that fits in one line in the commit message.

## Design

Homepage follows the "Night Luxe" direction: near-black ground `#0d1117`, text `#e9e2d3`, gold accent `#d8b36a`, DM Serif Display headings, DM Sans body. Staff screens are plain shadcn defaults — dense, fast, no decoration. Guest app is a phone-width layout that also works on desktop.

## Out of scope for the prototype

USD, inventory, expense approvals, CRM/reviews, staff rostering, HR/payroll, walk-in POS, SMS/WhatsApp, smart keys, native apps, OTA sync. If asked, note it in `docs/deferred.md` and move on.

## Demo accounts

Seeded by `npm run seed`; all passwords `Lumaana2026!`. See `scripts/seed.ts` for the list. Reseed before every client checkpoint.
