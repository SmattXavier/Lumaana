import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { formatKobo } from "@/lib/money";
import { readStaySearch } from "@/lib/stay-search";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "../luxe";
import { BookForm } from "./book-form";

export const metadata = { title: "Your details — Lumaana" };

export default async function BookPage({ searchParams }: PageProps<"/book">) {
  const sp = await searchParams;
  const search = readStaySearch(sp);
  const slug = typeof sp.hotel === "string" ? sp.hotel : "";
  const typeId = typeof sp.type === "string" ? sp.type : "";
  const supabase = await createClient();

  const { data: branch } = await supabase.from("branches").select("id, name, city").eq("slug", slug).maybeSingle();
  if (!branch) notFound();
  const { data: types } = await supabase.rpc("available_room_types", {
    p_branch: branch.id, p_check_in: search.checkIn, p_check_out: search.checkOut,
  });
  const type = types?.find((t) => t.room_type_id === typeId);
  if (!type) notFound();
  const back = `/hotels/${slug}?${new URLSearchParams({ in: search.checkIn, out: search.checkOut, adults: String(search.adults) })}#rooms`;

  // A signed-in guest books under their own account, so the stay shows in their guest app.
  const profile = await getProfile();
  let prefill: { full_name?: string; email?: string; phone?: string } = {};
  if (profile?.role === "guest") {
    const { data: g } = await supabase.from("guests").select("full_name, email, phone").eq("user_id", profile.id).maybeSingle();
    prefill = { full_name: g?.full_name ?? profile.full_name, email: g?.email ?? profile.email ?? "", phone: g?.phone ?? "" };
  }

  const total = type.base_rate_kobo * search.nights;
  const unavailable = type.available_rooms < 1 || search.adults > type.max_guests;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1fr_380px]">
      <div>
        <Link href={back} className="flex items-center gap-1 text-sm text-[#e9e2d3]/60 hover:text-[#e9e2d3]">
          <ChevronLeftIcon className="size-4" /> Back to rooms
        </Link>
        <h1 className="mt-6 font-[family-name:var(--font-luxe-serif)] text-4xl">Your details</h1>
        <p className="mt-2 text-sm text-[#e9e2d3]/60">
          {profile?.role === "guest"
            ? "You're signed in — this stay will appear in your guest app."
            : <>We&apos;ll send your confirmation here. Already stayed with us? <Link href={`/login?next=${encodeURIComponent(`/book?${new URLSearchParams(sp as Record<string, string>)}`)}`} className="text-[#d8b36a] underline-offset-4 hover:underline">Sign in</Link> to link this booking to your guest app.</>}
        </p>
        {unavailable ? (
          <p className="mt-8 rounded-xl border border-[#d8b36a]/40 p-4 text-sm">
            Sorry — this room is no longer available for those dates. <Link href={back} className="text-[#d8b36a] underline">Choose another</Link>.
          </p>
        ) : (
          <BookForm
            hidden={{ branch_id: branch.id, room_type_id: type.room_type_id, check_in: search.checkIn, check_out: search.checkOut, adults: String(search.adults) }}
            prefill={prefill}
            totalLabel={formatKobo(total)}
          />
        )}
      </div>

      <aside className="h-fit rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <Eyebrow>Your stay</Eyebrow>
        <div className="mt-3 font-[family-name:var(--font-luxe-serif)] text-2xl">{branch.name}</div>
        <div className="text-sm text-[#e9e2d3]/60">{type.name}</div>
        <dl className="mt-5 grid gap-2 text-sm">
          <Line label="Check-in" value={formatDate(search.checkIn, { weekday: true })} />
          <Line label="Check-out" value={formatDate(search.checkOut, { weekday: true })} />
          <Line label="Guests" value={String(search.adults)} />
          <Line label={`${formatKobo(type.base_rate_kobo)} × ${search.nights} night${search.nights === 1 ? "" : "s"}`} value={formatKobo(total)} />
        </dl>
        <div className="mt-4 flex items-baseline justify-between border-t border-white/10 pt-4">
          <span>Total</span>
          <span className="text-2xl tabular-nums text-[#d8b36a]">{formatKobo(total)}</span>
        </div>
        <p className="mt-3 text-xs text-[#e9e2d3]/45">We hold your room for 30 minutes while you pay.</p>
      </aside>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#e9e2d3]/55">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
