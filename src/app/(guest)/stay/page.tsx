import Link from "next/link";
import { ChevronRightIcon, ConciergeBellIcon, LogOutIcon, ReceiptTextIcon } from "lucide-react";
import { formatDate, lagosToday, nightsBetween } from "@/lib/dates";
import { getBill, getStay } from "@/lib/guest";
import { RESERVATION_STATUS } from "@/lib/labels";
import { formatKobo } from "@/lib/money";
import { H1, NoStay, Panel } from "./ui";

export default async function StayPage() {
  const { profile, stay, others } = await getStay();
  if (!stay) return <NoStay />;
  const bill = stay.folios ? await getBill(stay.folios.id) : null;
  const first = (stay.guests?.full_name || profile.full_name).split(" ")[0];
  const inHouse = stay.status === "checked_in";
  const today = lagosToday();
  const nights = nightsBetween(stay.check_in, stay.check_out);

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm text-black/50">{inHouse ? "Welcome back" : stay.status === "confirmed" ? "See you soon" : "Thank you for staying"}, {first}</p>
        <H1>{stay.branches?.name}</H1>
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="bg-[#0d1117] px-4 py-5 text-[#e9e2d3]">
          <div className="text-xs tracking-[0.2em] text-[#d8b36a] uppercase">{RESERVATION_STATUS[stay.status]}</div>
          <div className="mt-1 flex items-end justify-between">
            <div>
              <div className="font-[family-name:var(--font-luxe-serif)] text-4xl">
                {stay.rooms?.number ? `Room ${stay.rooms.number}` : stay.room_types?.name}
              </div>
              <div className="text-sm text-[#e9e2d3]/70">
                {stay.rooms?.number ? `${stay.room_types?.name} · floor ${stay.rooms.floor}` : "Room assigned at check-in"}
              </div>
            </div>
            <div className="text-right font-mono text-xs text-[#e9e2d3]/60">{stay.confirmation_code}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-black/10 text-center text-sm">
          <Cell label="Check-in" value={formatDate(stay.check_in)} />
          <Cell label="Check-out" value={formatDate(stay.check_out)} />
          <Cell label="Nights" value={String(nights)} />
        </div>
      </Panel>

      {inHouse && stay.check_out <= today && (
        <Panel className="border-[#d8b36a]/60 bg-[#fdf8ec] text-sm">
          You&apos;re due to check out today. Skip the queue with express checkout.
        </Panel>
      )}

      <div className="grid gap-2">
        <Tile href="/stay/bill" icon={<ReceiptTextIcon />} title="Live bill" detail={bill ? `Balance ${formatKobo(bill.balance)}` : "Opens when your booking is confirmed"} />
        <Tile href="/stay/requests" icon={<ConciergeBellIcon />} title="Requests" detail="Housekeeping, laundry, room service" />
        <Tile href="/stay/checkout" icon={<LogOutIcon />} title="Express checkout" detail={inHouse ? "Pay and leave — no queue" : "Available once you're checked in"} />
      </div>

      <Panel className="text-sm">
        <div className="font-medium">{stay.branches?.name}</div>
        <div className="text-black/60">{stay.branches?.address}</div>
        {stay.branches?.phone && (
          <a href={`tel:${stay.branches.phone.replace(/\s/g, "")}`} className="mt-1 inline-block text-[#8a6a2a]">
            Front desk · {stay.branches.phone}
          </a>
        )}
      </Panel>

      {others.length > 0 && (
        <div className="grid gap-2">
          <h2 className="text-xs tracking-[0.2em] text-black/40 uppercase">Other stays</h2>
          {others.map((o) => (
            <div key={o.id} className="flex justify-between rounded-xl border border-black/10 bg-white px-3 py-2 text-sm">
              <span>{o.branches?.name}</span>
              <span className="text-black/50">
                {formatDate(o.check_in)} · {RESERVATION_STATUS[o.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-3">
      <div className="text-[11px] text-black/45 uppercase">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Tile({ href, icon, title, detail }: { href: string; icon: React.ReactNode; title: string; detail: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 active:bg-black/[0.02]">
      <span className="flex size-10 items-center justify-center rounded-full bg-[#f4ecd9] text-[#8a6a2a] [&_svg]:size-5">{icon}</span>
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        <span className="block text-sm text-black/55">{detail}</span>
      </span>
      <ChevronRightIcon className="size-4 text-black/30" />
    </Link>
  );
}
