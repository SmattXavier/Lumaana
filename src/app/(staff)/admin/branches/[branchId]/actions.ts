"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireRole } from "@/lib/auth";
import { parseNairaToKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

// Catalogue edits (room types, rates, rooms) are plain CRUD, not state
// transitions, so they write the tables directly. RLS limits writes to
// managers of the branch (HQ: any branch).

export type ActionResult = { ok?: string; error?: string };

const NO_ACCESS = "Not found, or you don't have access to this branch.";

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function int(fd: FormData, key: string, min: number, max: number) {
  const raw = str(fd, key);
  if (!/^-?\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
}

// Constraint errors aren't written for users the way the SQL functions' are.
function dbError(error: PostgrestError, messages: { unique?: string; inUse?: string } = {}) {
  if (error.code === "23505" && messages.unique) return { error: messages.unique };
  if (error.code === "23503" && messages.inUse) return { error: messages.inUse };
  return { error: error.message };
}

function done(branchId: string, ok: string): ActionResult {
  revalidatePath(`/admin/branches/${branchId}`);
  revalidatePath("/admin");
  return { ok };
}

function roomTypeFields(fd: FormData) {
  const name = str(fd, "name");
  const max_guests = int(fd, "max_guests", 1, 20);
  const sort_order = int(fd, "sort_order", 0, 999);
  if (!name) return { error: "Name is required." };
  if (max_guests === null) return { error: "Max guests must be a whole number from 1 to 20." };
  if (sort_order === null) return { error: "Sort order must be a whole number from 0 to 999." };
  return {
    values: {
      name,
      description: str(fd, "description") || null,
      photo_url: str(fd, "photo_url") || null,
      max_guests,
      sort_order,
    },
  };
}

function rateField(fd: FormData) {
  const kobo = parseNairaToKobo(str(fd, "rate"));
  return kobo === null ? { error: "Enter the nightly rate in naira, e.g. 45000 or 45,000.50." } : { kobo };
}

// ---------------------------------------------------------------- room types

export async function createRoomType(fd: FormData): Promise<ActionResult> {
  await requireRole(["hq_admin", "branch_admin"]);
  const branchId = str(fd, "branch_id");
  const fields = roomTypeFields(fd);
  if (fields.error) return { error: fields.error };
  const rate = rateField(fd);
  if (rate.error) return { error: rate.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("room_types")
    .insert({ ...fields.values!, branch_id: branchId, base_rate_kobo: rate.kobo! });
  if (error) return dbError(error, { unique: "This branch already has a room type with that name." });
  return done(branchId, `Added ${fields.values!.name}.`);
}

export async function updateRoomType(fd: FormData): Promise<ActionResult> {
  await requireRole(["hq_admin", "branch_admin"]);
  const branchId = str(fd, "branch_id");
  const fields = roomTypeFields(fd);
  if (fields.error) return { error: fields.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_types")
    .update(fields.values!)
    .eq("id", str(fd, "id"))
    .eq("branch_id", branchId)
    .select("id");
  if (error) return dbError(error, { unique: "This branch already has a room type with that name." });
  if (!data.length) return { error: NO_ACCESS };
  return done(branchId, `Saved ${fields.values!.name}.`);
}

export async function deleteRoomType(fd: FormData): Promise<ActionResult> {
  await requireRole(["hq_admin", "branch_admin"]);
  const branchId = str(fd, "branch_id");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_types")
    .delete()
    .eq("id", str(fd, "id"))
    .eq("branch_id", branchId)
    .select("name");
  if (error)
    return dbError(error, {
      inUse: "This room type still has rooms or reservations. Move or remove those first.",
    });
  if (!data.length) return { error: NO_ACCESS };
  return done(branchId, `Deleted ${data[0].name}.`);
}

// ---------------------------------------------------------------- rates

export async function updateRate(fd: FormData): Promise<ActionResult> {
  await requireRole(["hq_admin", "branch_admin"]);
  const branchId = str(fd, "branch_id");
  const rate = rateField(fd);
  if (rate.error) return { error: rate.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_types")
    .update({ base_rate_kobo: rate.kobo! })
    .eq("id", str(fd, "id"))
    .eq("branch_id", branchId)
    .select("name");
  if (error) return dbError(error);
  if (!data.length) return { error: NO_ACCESS };
  return done(branchId, `Updated the ${data[0].name} rate.`);
}

// ---------------------------------------------------------------- rooms

async function roomFields(fd: FormData, branchId: string) {
  const number = str(fd, "number");
  const room_type_id = str(fd, "room_type_id");
  if (!number) return { error: "Room number is required." };
  if (!room_type_id) return { error: "Choose a room type." };

  // No FK ties a room's type to the same branch, so check it here.
  const supabase = await createClient();
  const { data: type } = await supabase
    .from("room_types")
    .select("id")
    .eq("id", room_type_id)
    .eq("branch_id", branchId)
    .maybeSingle();
  if (!type) return { error: "That room type doesn't belong to this branch." };

  return { values: { number, room_type_id, floor: str(fd, "floor") || null } };
}

export async function createRoom(fd: FormData): Promise<ActionResult> {
  await requireRole(["hq_admin", "branch_admin"]);
  const branchId = str(fd, "branch_id");
  const fields = await roomFields(fd, branchId);
  if (fields.error) return { error: fields.error };

  const supabase = await createClient();
  const { error } = await supabase.from("rooms").insert({ ...fields.values!, branch_id: branchId });
  if (error) return dbError(error, { unique: `Room ${fields.values!.number} already exists in this branch.` });
  return done(branchId, `Added room ${fields.values!.number}.`);
}

export async function updateRoom(fd: FormData): Promise<ActionResult> {
  await requireRole(["hq_admin", "branch_admin"]);
  const branchId = str(fd, "branch_id");
  const fields = await roomFields(fd, branchId);
  if (fields.error) return { error: fields.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .update(fields.values!)
    .eq("id", str(fd, "id"))
    .eq("branch_id", branchId)
    .select("id");
  if (error) return dbError(error, { unique: `Room ${fields.values!.number} already exists in this branch.` });
  if (!data.length) return { error: NO_ACCESS };
  return done(branchId, `Saved room ${fields.values!.number}.`);
}

export async function deleteRoom(fd: FormData): Promise<ActionResult> {
  await requireRole(["hq_admin", "branch_admin"]);
  const branchId = str(fd, "branch_id");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rooms")
    .delete()
    .eq("id", str(fd, "id"))
    .eq("branch_id", branchId)
    .select("number");
  if (error)
    return dbError(error, {
      inUse: "This room has reservations or maintenance tickets, so it can't be deleted.",
    });
  if (!data.length) return { error: NO_ACCESS };
  return done(branchId, `Deleted room ${data[0].number}.`);
}
