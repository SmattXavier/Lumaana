"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays } from "@/lib/dates";
import { GoldButton, LuxeLabel, luxeInput } from "./luxe";

export function SearchForm({
  branches, checkIn, checkOut, min, adults = 2, fixedSlug,
}: {
  branches?: { slug: string; name: string }[];
  checkIn: string;
  checkOut: string;
  min: string;
  adults?: number;
  fixedSlug?: string;
}) {
  const router = useRouter();
  const [inDate, setIn] = useState(checkIn);
  const [outDate, setOut] = useState(checkOut);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const slug = fixedSlug ?? String(f.get("slug"));
        const q = new URLSearchParams({ in: inDate, out: outDate, adults: String(f.get("adults") ?? "2") });
        router.push(`/hotels/${slug}?${q}#rooms`);
      }}
      className="grid gap-4 rounded-2xl border border-white/10 bg-[#0d1117]/70 p-4 backdrop-blur sm:grid-cols-2 sm:p-5 lg:grid-cols-[1.3fr_1fr_1fr_0.6fr_auto] lg:items-end"
    >
      {!fixedSlug && branches && (
        <div className="grid gap-1.5">
          <LuxeLabel htmlFor="s-slug">Hotel</LuxeLabel>
          <select id="s-slug" name="slug" className={luxeInput} defaultValue={branches[0]?.slug}>
            {branches.map((b) => (
              <option key={b.slug} value={b.slug} className="bg-[#0d1117]">
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid gap-1.5">
        <LuxeLabel htmlFor="s-in">Check-in</LuxeLabel>
        <input
          id="s-in"
          type="date"
          className={luxeInput}
          value={inDate}
          min={min}
          required
          onChange={(e) => {
            setIn(e.target.value);
            if (e.target.value && outDate <= e.target.value) setOut(addDays(e.target.value, 1));
          }}
        />
      </div>
      <div className="grid gap-1.5">
        <LuxeLabel htmlFor="s-out">Check-out</LuxeLabel>
        <input
          id="s-out"
          type="date"
          className={luxeInput}
          value={outDate}
          min={inDate ? addDays(inDate, 1) : min}
          required
          onChange={(e) => setOut(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <LuxeLabel htmlFor="s-adults">Guests</LuxeLabel>
        <select id="s-adults" name="adults" className={luxeInput} defaultValue={String(adults)}>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n} className="bg-[#0d1117]">
              {n}
            </option>
          ))}
        </select>
      </div>
      <GoldButton type="submit" className={fixedSlug ? "" : "sm:col-span-2 lg:col-span-1"}>
        Check availability
      </GoldButton>
    </form>
  );
}
