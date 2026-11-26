/**
 * Resets and reseeds the Lumaana demo chain.
 *   npm run seed
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Safe to re-run before every client checkpoint.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = "Lumaana2026!";
const NGN = (naira: number) => Math.round(naira * 100); // kobo

const branches = [
  { slug: "abuja", name: "Lumaana Abuja", city: "Abuja", address: "Central Business District, Abuja", phone: "+234 800 000 0001" },
  { slug: "lagos", name: "Lumaana Lagos", city: "Lagos", address: "Victoria Island, Lagos", phone: "+234 800 000 0002" },
  { slug: "port-harcourt", name: "Lumaana Port Harcourt", city: "Port Harcourt", address: "GRA Phase 2, Port Harcourt", phone: "+234 800 000 0003" },
];

const roomTypes = [
  { name: "Standard", description: "Queen bed, work desk, city view.", base: 45000, max_guests: 2, sort_order: 1 },
  { name: "Deluxe", description: "King bed, lounge corner, breakfast included.", base: 70000, max_guests: 2, sort_order: 2 },
  { name: "Suite", description: "Separate living room, dining for four, late checkout.", base: 120000, max_guests: 4, sort_order: 3 },
];

type StaffSeed = { email: string; full_name: string; role: string; branch?: string };

const staff: StaffSeed[] = [
  { email: "hq@lumaana.demo", full_name: "Adaeze Okonkwo (HQ)", role: "hq_admin" },
  { email: "manager.abuja@lumaana.demo", full_name: "Tunde Bakare", role: "branch_admin", branch: "abuja" },
  { email: "frontdesk.abuja@lumaana.demo", full_name: "Ngozi Eze", role: "front_desk", branch: "abuja" },
  { email: "procurement.abuja@lumaana.demo", full_name: "Ibrahim Musa", role: "procurement", branch: "abuja" },
  { email: "maintenance.abuja@lumaana.demo", full_name: "Chidi Nwosu", role: "maintenance", branch: "abuja" },
  { email: "manager.lagos@lumaana.demo", full_name: "Funke Adeyemi", role: "branch_admin", branch: "lagos" },
  { email: "frontdesk.lagos@lumaana.demo", full_name: "Emeka Obi", role: "front_desk", branch: "lagos" },
  { email: "manager.ph@lumaana.demo", full_name: "Blessing Amadi", role: "branch_admin", branch: "port-harcourt" },
  { email: "frontdesk.ph@lumaana.demo", full_name: "Samuel Dike", role: "front_desk", branch: "port-harcourt" },
];

const guests = [
  { email: "guest@lumaana.demo", full_name: "Kemi Alabi", phone: "+234 803 000 0001" },
  { email: "guest2@lumaana.demo", full_name: "David Mensah", phone: "+234 803 000 0002" },
];

const fail = (step: string, error: unknown): never => {
  console.error(`✗ ${step}`, error);
  process.exit(1);
};

async function deleteDemoUsers() {
  const emails = new Set([...staff, ...guests].map((u) => u.email));
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail("list users", error);
    for (const u of data.users) {
      if (u.email && emails.has(u.email)) {
        const { error: delErr } = await db.auth.admin.deleteUser(u.id);
        if (delErr) fail(`delete ${u.email}`, delErr);
      }
    }
    if (data.users.length < 200) break;
    page++;
  }
}

async function main() {
  console.log("→ resetting data");
  {
    const { error } = await db.rpc("reset_demo_data");
    if (error) fail("reset_demo_data", error);
  }
  await deleteDemoUsers();

  console.log("→ branches, room types, rooms");
  const branchId: Record<string, string> = {};
  const roomTypeId: Record<string, Record<string, string>> = {};
  const roomIds: Record<string, string[]> = {};
  for (const b of branches) {
    const { data, error } = await db.from("branches").insert(b).select("id").single();
    if (error) fail(`branch ${b.slug}`, error);
    branchId[b.slug] = data.id;
    roomTypeId[b.slug] = {};
    roomIds[b.slug] = [];

    for (const rt of roomTypes) {
      const { data: rtRow, error: rtErr } = await db
        .from("room_types")
        .insert({ branch_id: data.id, name: rt.name, description: rt.description, base_rate_kobo: NGN(rt.base), max_guests: rt.max_guests, sort_order: rt.sort_order })
        .select("id").single();
      if (rtErr) fail(`room type ${b.slug}/${rt.name}`, rtErr);
      roomTypeId[b.slug][rt.name] = rtRow.id;
    }

    // 4 Standard, 4 Deluxe, 2 Suite per branch: 101–104, 201–204, 301–302
    const plan: Array<[string, string[]]> = [
      ["Standard", ["101", "102", "103", "104"]],
      ["Deluxe", ["201", "202", "203", "204"]],
      ["Suite", ["301", "302"]],
    ];
    for (const [type, numbers] of plan) {
      const rows = numbers.map((n) => ({ branch_id: data.id, room_type_id: roomTypeId[b.slug][type], number: n, floor: n[0] }));
      const { data: inserted, error: rErr } = await db.from("rooms").insert(rows).select("id");
      if (rErr) fail(`rooms ${b.slug}/${type}`, rErr);
      roomIds[b.slug].push(...inserted.map((r) => r.id));
    }
  }

  console.log("→ staff and guest accounts");
  const userId: Record<string, string> = {};
  for (const s of staff) {
    const { data, error } = await db.auth.admin.createUser({
      email: s.email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: s.full_name },
      // role/branch live in app metadata: only the service role can set it
      app_metadata: { role: s.role, branch_id: s.branch ? branchId[s.branch] : null },
    });
    if (error) fail(`create ${s.email}`, error);
    userId[s.email] = data.user.id;
  }
  for (const g of guests) {
    const { data, error } = await db.auth.admin.createUser({
      email: g.email, password: PASSWORD, email_confirm: true,
      user_metadata: { full_name: g.full_name, phone: g.phone },
      app_metadata: { role: "guest" },
    });
    if (error) fail(`create ${g.email}`, error);
    userId[g.email] = data.user.id;
  }

  console.log("→ reservations: one in-house guest with charges, a few upcoming");
  // "today" in hotel time (WAT), as midnight UTC so the date arithmetic below stays exact
  const today = new Date(`${new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date())}T00:00:00Z`);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

  // Act as the Abuja front desk for desk bookings so created_by / posted_by are realistic
  const desk = createClient(url!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? key!, { auth: { persistSession: false } });
  const { error: signInErr } = await desk.auth.signInWithPassword({ email: "frontdesk.abuja@lumaana.demo", password: PASSWORD });
  if (signInErr) fail("sign in as front desk", signInErr);
  const hq = createClient(url!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? key!, { auth: { persistSession: false } });
  const { error: hqErr } = await hq.auth.signInWithPassword({ email: "hq@lumaana.demo", password: PASSWORD });
  if (hqErr) fail("sign in as HQ", hqErr);

  // In-house: Kemi Alabi in Deluxe 201, checked in yesterday, leaving in 2 days, with food + laundry on the bill
  const { data: inHouseId, error: e1 } = await desk.rpc("create_desk_booking", {
    p_branch: branchId.abuja, p_room_type: roomTypeId.abuja.Deluxe,
    p_check_in: iso(addDays(today, -1)), p_check_out: iso(addDays(today, 2)),
    p_adults: 1, p_full_name: "Kemi Alabi", p_email: "guest@lumaana.demo", p_phone: "+234 803 000 0001", p_source: "online",
  });
  if (e1) fail("in-house booking", e1);
  const room201 = await db.from("rooms").select("id").eq("branch_id", branchId.abuja).eq("number", "201").single();
  const { error: e2 } = await desk.rpc("check_in", {
    p_reservation: inHouseId, p_room: room201.data!.id, p_id_type: "NIN", p_id_number: "1234 5678 901", p_id_photo_path: null,
  });
  if (e2) fail("check in", e2);
  for (const c of [
    { kind: "food", description: "Breakfast — continental", qty: 1, unit: 8500 },
    { kind: "food", description: "Jollof rice & grilled chicken (room service)", qty: 2, unit: 12000 },
    { kind: "laundry", description: "Laundry — 3 shirts, 1 trouser", qty: 1, unit: 6500 },
  ]) {
    const { error } = await desk.rpc("post_charge", { p_reservation: inHouseId, p_kind: c.kind, p_description: c.description, p_qty: c.qty, p_unit_kobo: NGN(c.unit) });
    if (error) fail(`charge ${c.description}`, error);
  }
  // Room nights were prepaid online
  const { error: e3 } = await desk.rpc("record_payment", { p_reservation: inHouseId, p_method: "paystack", p_amount_kobo: NGN(70000 * 3), p_reference: "DEMO-PREPAID-001" });
  if (e3) fail("prepayment", e3);

  // Upcoming arrivals across branches
  const upcoming = [
    { branch: "abuja", type: "Standard", name: "David Mensah", email: "guest2@lumaana.demo", from: 1, nights: 2 },
    { branch: "abuja", type: "Suite", name: "Halima Yusuf", email: "halima@example.com", from: 2, nights: 3 },
    { branch: "lagos", type: "Deluxe", name: "Olu Fashola", email: "olu@example.com", from: 0, nights: 1 },
    { branch: "port-harcourt", type: "Standard", name: "Grace Okoro", email: "grace@example.com", from: 3, nights: 2 },
  ];
  for (const u of upcoming) {
    const { error } = await hq.rpc("create_desk_booking", {
      p_branch: branchId[u.branch], p_room_type: roomTypeId[u.branch][u.type],
      p_check_in: iso(addDays(today, u.from)), p_check_out: iso(addDays(today, u.from + u.nights)),
      p_adults: 2, p_full_name: u.name, p_email: u.email, p_phone: "", p_source: "phone",
    });
    if (error) fail(`upcoming ${u.name}`, error);
  }

  console.log("→ maintenance ticket and procurement request");
  const room104 = await db.from("rooms").select("id").eq("branch_id", branchId.abuja).eq("number", "104").single();
  const { error: e4 } = await db.from("maintenance_tickets").insert({
    branch_id: branchId.abuja, room_id: room104.data!.id, title: "AC not cooling", description: "Guest reported warm air; compressor noise.",
    priority: "high", status: "assigned", blocks_room: true,
    assigned_to: userId["maintenance.abuja@lumaana.demo"], created_by: userId["frontdesk.abuja@lumaana.demo"],
  });
  if (e4) fail("ticket", e4);

  const { data: pr, error: e5 } = await db.from("purchase_requests").insert({
    branch_id: branchId.abuja, title: "Housekeeping consumables — November", status: "submitted",
    requested_by: userId["procurement.abuja@lumaana.demo"], notes: "Stock below reorder level.",
  }).select("id").single();
  if (e5) fail("purchase request", e5);
  const { error: e6 } = await db.from("purchase_request_items").insert([
    { request_id: pr.id, branch_id: branchId.abuja, description: "Bath towels (white, 70×140)", qty: 60, unit_kobo: NGN(4500) },
    { request_id: pr.id, branch_id: branchId.abuja, description: "Toiletry sets", qty: 300, unit_kobo: NGN(1200) },
    { request_id: pr.id, branch_id: branchId.abuja, description: "Laundry detergent 20 kg", qty: 6, unit_kobo: NGN(28000) },
  ]);
  if (e6) fail("purchase request items", e6);

  console.log("\n✓ Seeded. Logins (password for all: Lumaana2026!)");
  console.table([...staff.map((s) => ({ role: s.role, branch: s.branch ?? "all", email: s.email })), ...guests.map((g) => ({ role: "guest", branch: "—", email: g.email }))]);
  console.log("In-house guest: Kemi Alabi, Abuja room 201 (guest@lumaana.demo) — bill has room nights prepaid plus food and laundry outstanding.");
}

main().catch((e) => fail("seed", e));
