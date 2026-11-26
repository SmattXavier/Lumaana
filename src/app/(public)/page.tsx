import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { addDays, lagosToday } from "@/lib/dates";
import { formatKobo } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { Atmosphere, Eyebrow } from "./luxe";
import { SearchForm } from "./search-form";

export default async function Home() {
  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, slug, name, city, address, hero_image, room_types(base_rate_kobo)")
    .order("name");
  const today = lagosToday();
  const list = branches ?? [];

  return (
    <>
      <section className="relative overflow-hidden">
        <Atmosphere />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pt-16 pb-20 sm:px-6 md:pt-24 md:pb-28">
          <div className="max-w-2xl">
            <Eyebrow>Abuja · Lagos · Port Harcourt</Eyebrow>
            <h1 className="mt-4 font-[family-name:var(--font-luxe-serif)] text-5xl leading-[1.05] sm:text-6xl md:text-7xl">
              Quiet luxury,
              <br />
              <span className="text-[#d8b36a]">after dark.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-[#e9e2d3]/70 sm:text-lg">
              Three Lumaana hotels, one standard of care. Book direct for the best rate, then run your stay from your phone —
              live bill, requests and express checkout.
            </p>
          </div>
          <SearchForm
            branches={list.map((b) => ({ slug: b.slug, name: b.name }))}
            checkIn={today}
            checkOut={addDays(today, 1)}
            min={today}
          />
        </div>
      </section>

      <section id="hotels" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-6">
        <Eyebrow>Our hotels</Eyebrow>
        <h2 className="mt-3 font-[family-name:var(--font-luxe-serif)] text-4xl">Choose your city</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {list.map((b, i) => {
            const from = Math.min(...b.room_types.map((t) => t.base_rate_kobo));
            return (
              <Link
                key={b.id}
                href={`/hotels/${b.slug}`}
                className="group relative flex min-h-80 flex-col justify-end overflow-hidden rounded-2xl border border-white/10 p-6 transition hover:border-[#d8b36a]/50"
              >
                {b.hero_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.hero_image} alt="" className="absolute inset-0 size-full object-cover opacity-70 transition group-hover:scale-105" />
                ) : (
                  <Atmosphere seed={i} className="transition duration-700 group-hover:scale-110" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/40 to-transparent" />
                <div className="relative">
                  <div className="text-xs tracking-[0.25em] text-[#d8b36a] uppercase">{b.city}</div>
                  <div className="mt-1 font-[family-name:var(--font-luxe-serif)] text-3xl">{b.name}</div>
                  <div className="mt-1 text-sm text-[#e9e2d3]/60">{b.address}</div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span>{Number.isFinite(from) ? <>From {formatKobo(from)} / night</> : "Coming soon"}</span>
                    <ArrowRightIcon className="size-4 text-[#d8b36a] transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-3">
          {[
            ["Book direct", "Secure online payment and instant confirmation — no calls, no waiting."],
            ["Your stay, in your pocket", "See every charge as it lands, ask for housekeeping, order room service."],
            ["Leave on your schedule", "Express checkout from your phone. Settle up and go."],
          ].map(([title, body]) => (
            <div key={title}>
              <div className="h-px w-10 bg-[#d8b36a]" />
              <h3 className="mt-4 font-[family-name:var(--font-luxe-serif)] text-2xl">{title}</h3>
              <p className="mt-2 text-sm text-[#e9e2d3]/60">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
