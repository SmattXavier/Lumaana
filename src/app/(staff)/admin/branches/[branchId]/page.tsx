import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RatesCard, RoomsCard, RoomTypesCard } from "./branch-manager";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BranchPage({ params }: PageProps<"/admin/branches/[branchId]">) {
  const { branchId } = await params;
  const profile = await requireRole(["hq_admin", "branch_admin"]);

  // branches and room_types are public-read for the booking site, so RLS
  // alone wouldn't hide another branch's catalogue from a branch admin.
  if (!UUID.test(branchId)) notFound();
  if (profile.role !== "hq_admin" && profile.branch_id !== branchId) notFound();

  const supabase = await createClient();
  const [branch, types, rooms] = await Promise.all([
    supabase.from("branches").select("id, name, city").eq("id", branchId).maybeSingle(),
    supabase
      .from("room_types")
      .select("id, name, description, base_rate_kobo, max_guests, photo_url, sort_order")
      .eq("branch_id", branchId)
      .order("sort_order")
      .order("name"),
    supabase
      .from("rooms")
      .select("id, number, floor, status, room_type_id")
      .eq("branch_id", branchId)
      .order("number"),
  ]);
  for (const r of [branch, types, rooms]) if (r.error) throw new Error(r.error.message);
  if (!branch.data) notFound();

  return (
    <div className="grid gap-4">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" /> Branches
        </Link>
        <h1 className="text-xl font-semibold">{branch.data.name}</h1>
        <p className="text-sm text-muted-foreground">{branch.data.city}</p>
      </div>
      <RoomTypesCard branchId={branchId} types={types.data!} rooms={rooms.data!} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <RatesCard branchId={branchId} types={types.data!} />
        <RoomsCard branchId={branchId} types={types.data!} rooms={rooms.data!} />
      </div>
    </div>
  );
}
