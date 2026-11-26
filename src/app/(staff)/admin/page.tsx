import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminBranchesPage() {
  const profile = await requireRole(["hq_admin", "branch_admin"]);
  const supabase = await createClient();

  let query = supabase
    .from("branches")
    .select("id, name, city, address, phone, room_types(count), rooms(count)")
    .order("name");
  // branches is publicly readable (the booking site lists them), so RLS
  // doesn't narrow it for branch admins — scope to their own branch here.
  if (profile.role !== "hq_admin") query = query.eq("id", profile.branch_id!);

  const { data: branches, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branches</CardTitle>
        <CardDescription>
          {profile.role === "hq_admin"
            ? "All branches in the chain. Open one to manage its room types, rates and rooms."
            : "Your branch. Open it to manage room types, rates and rooms."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Branch</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="hidden md:table-cell">Address</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="text-right">Room types</TableHead>
              <TableHead className="text-right">Rooms</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {branches.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/branches/${b.id}`} className="underline-offset-4 hover:underline">
                    {b.name}
                  </Link>
                </TableCell>
                <TableCell>{b.city}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{b.address}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{b.phone}</TableCell>
                <TableCell className="text-right tabular-nums">{b.room_types[0]?.count ?? 0}</TableCell>
                <TableCell className="text-right tabular-nums">{b.rooms[0]?.count ?? 0}</TableCell>
              </TableRow>
            ))}
            {branches.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No branches.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
