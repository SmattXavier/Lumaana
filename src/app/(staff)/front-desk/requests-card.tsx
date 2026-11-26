import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import { REQUEST_TYPE } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { updateRequest } from "./actions";

export async function RequestsCard({ branchId }: { branchId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("service_requests")
    .select("id, type, note, status, created_at, reservations(id, guests(full_name), rooms(number))")
    .eq("branch_id", branchId)
    .in("status", ["open", "in_progress"])
    .order("created_at");
  const requests = data ?? [];
  if (requests.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Guest requests</CardTitle>
        <CardDescription>Sent from the guest app. Live.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {requests.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 text-sm">
            <div>
              <span className="font-medium">
                Room {r.reservations?.rooms?.number ?? "—"} · {REQUEST_TYPE[r.type]}
              </span>
              <span className="text-muted-foreground"> · {r.reservations?.guests?.full_name} · {formatDateTime(r.created_at)}</span>
              {r.note && <div className="text-muted-foreground">“{r.note}”</div>}
            </div>
            <form action={updateRequest} className="flex gap-1">
              <input type="hidden" name="id" value={r.id} />
              {r.status === "open" && (
                <Button size="sm" variant="outline" name="status" value="in_progress">
                  On it
                </Button>
              )}
              <Button size="sm" name="status" value="done">
                Done
              </Button>
            </form>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
