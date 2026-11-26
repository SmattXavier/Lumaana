import Link from "next/link";
import { notFound } from "next/navigation";
import { UsersIcon } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { formatKobo } from "@/lib/money";
import { readStaySearch } from "@/lib/stay-search";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Atmosphere, Eyebrow } from "../../luxe";
import { SearchForm } from "../../search-form";

export async function generateMetadata({ params }: PageProps<"/hotels/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("branches").select("name, city").eq("slug", slug).maybeSingle();
  return { title: data ? `${data.name} — book direct` : "Lumaana" };
}

export default async function HotelPage({ params, searchParams }: PageProps<"/hotels/[slug]">) {
  const { slug } = await params;
  const search = readStaySearch(await searchParams);
  const supabase = await createClient();
  const { data: branch } = await supabase.from("branches").select("id, name, city, address, phone, hero_image").eq("slug", slug).maybeSingle();
  if (!branch) notFound();

  const { data: types, error } = await supabase.rpc("available_room_types", {
    p_branch: branch.id, p_check_in: search.checkIn, p_check_out: search.checkOut,
  });
  if (error) throw new Error(error.message);

  return (
    <>
      <section className="relative overflow-hidden">
        {branch.hero_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branch.hero_image} alt="" className="absolute inset-0 size-full object-cover opacity-50" />
        ) : (
          <Atmosphere seed={slug.length} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-10 sm:px-6 md:pt-20">
          <Eyebrow>{branch.city}</Eyebrow>
          <h1 className="mt-3 font-[family-name:var(--font-luxe-serif)] text-5xl md:text-6xl">{branch.name}</h1>
          <p className="mt-3 text-[#e9e2d3]/65">
            {branch.address}
            {branch.phone ? ` · ${branch.phone}` : ""}
          </p>
          <div className="mt-8">
            <SearchForm fixedSlug={slug} checkIn={search.checkIn} checkOut={search.checkOut} min={search.today} adults={Math.min(search.adults, 4)} />
          </div>
        </div>
      </section>

      <section id="rooms" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-12 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-[family-name:var(--font-luxe-serif)] text-3xl">Rooms & suites</h2>
          <p className="text-sm text-[#e9e2d3]/60">
            {formatDate(search.checkIn)} → {formatDate(search.checkOut)} · {search.nights} night{search.nights === 1 ? "" : "s"} · {search.adults}{" "}
            guest{search.adults === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {(types ?? []).map((t, i) => {
            const fits = search.adults <= t.max_guests;
            const open = t.available_rooms > 0 && fits;
            const q = new URLSearchParams({ hotel: slug, type: t.room_type_id, in: search.checkIn, out: search.checkOut, adults: String(search.adults) });
            return (
              <article
                key={t.room_type_id}
                className={cn("grid overflow-hidden rounded-2xl border border-white/10 md:grid-cols-[280px_1fr_auto]", !open && "opacity-60")}
              >
                <div className="relative min-h-40">
                  {t.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.photo_url} alt={t.name} className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <Atmosphere seed={i + 1} />
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-[family-name:var(--font-luxe-serif)] text-2xl">{t.name}</h3>
                  <p className="mt-1 text-sm text-[#e9e2d3]/65">{t.description}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-[#e9e2d3]/50">
                    <UsersIcon className="size-3.5" /> Up to {t.max_guests} guests
                    <span className="mx-1">·</span>
                    {t.available_rooms > 0 ? (
                      <span className={t.available_rooms <= 2 ? "text-[#d8b36a]" : ""}>
                        {t.available_rooms <= 2 ? `Only ${t.available_rooms} left` : `${t.available_rooms} available`}
                      </span>
                    ) : (
                      "Sold out for these dates"
                    )}
                  </p>
                </div>
                <div className="flex flex-row items-center justify-between gap-4 border-t border-white/10 p-5 md:flex-col md:items-end md:justify-center md:border-t-0 md:border-l">
                  <div className="md:text-right">
                    <div className="text-2xl tabular-nums">{formatKobo(t.base_rate_kobo)}</div>
                    <div className="text-xs text-[#e9e2d3]/50">
                      per night · {formatKobo(t.base_rate_kobo * search.nights)} total
                    </div>
                  </div>
                  {open ? (
                    <Link
                      href={`/book?${q}`}
                      className="inline-flex h-11 items-center rounded-lg bg-[#d8b36a] px-6 text-sm font-medium text-[#0d1117] hover:bg-[#e3c283]"
                    >
                      Reserve
                    </Link>
                  ) : (
                    <span className="text-sm text-[#e9e2d3]/50">{fits ? "Unavailable" : `Max ${t.max_guests} guests`}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
