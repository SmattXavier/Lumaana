import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { formatDateTime } from "@/lib/dates";
import { getStay } from "@/lib/guest";
import { REQUEST_STATUS, REQUEST_TYPE } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { H1, NoStay, Panel } from "../ui";
import { RequestForm } from "./request-form";

export default async function RequestsPage() {
  const { stay } = await getStay();
  if (!stay) return <NoStay />;
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("service_requests")
    .select("id, type, note, status, created_at")
    .eq("reservation_id", stay.id)
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-5">
      <RealtimeRefresh channel={`requests-${stay.id}`} watch={[{ table: "service_requests", filter: `reservation_id=eq.${stay.id}` }]} />
      <H1>Requests</H1>
      {stay.status === "checked_in" ? (
        <RequestForm />
      ) : (
        <p className="text-sm text-black/60">You can send requests to the front desk once you&apos;re checked in.</p>
      )}
      {(requests ?? []).length > 0 && (
        <section className="grid gap-2">
          <h2 className="text-xs tracking-[0.2em] text-black/40 uppercase">Your requests</h2>
          {requests!.map((r) => (
            <Panel key={r.id} className="flex items-start justify-between gap-3 p-3 text-sm">
              <div>
                <div className="font-medium">{REQUEST_TYPE[r.type]}</div>
                {r.note && <div className="text-black/60">{r.note}</div>}
                <div className="text-xs text-black/40">{formatDateTime(r.created_at)}</div>
              </div>
              <span className="rounded-full bg-[#f4ecd9] px-2 py-0.5 text-xs text-[#8a6a2a]">{REQUEST_STATUS[r.status]}</span>
            </Panel>
          ))}
        </section>
      )}
    </div>
  );
}
