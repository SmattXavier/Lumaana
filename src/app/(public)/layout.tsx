import Link from "next/link";
import { serif, sans } from "@/app/fonts";

// "Night Luxe": near-black ground, warm ivory text, gold accent.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${serif.variable} ${sans.variable} flex flex-1 flex-col bg-[#0d1117] font-[family-name:var(--font-luxe-sans)] text-[#e9e2d3] selection:bg-[#d8b36a]/30`}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="font-[family-name:var(--font-luxe-serif)] text-2xl tracking-wide">
          Lumaana<span className="text-[#d8b36a]">.</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-[#e9e2d3]/70">
          <Link href="/#hotels" className="hover:text-[#e9e2d3]">
            Hotels
          </Link>
          <Link href="/login?next=/stay" className="rounded-full border border-[#d8b36a]/50 px-3 py-1.5 text-[#d8b36a] hover:bg-[#d8b36a]/10">
            My stay
          </Link>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-[#e9e2d3]/45 sm:px-6">
          <span>© 2026 Lumaana Hotels · Abuja · Lagos · Port Harcourt</span>
          <Link href="/login" className="hover:text-[#e9e2d3]/80">
            Staff sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
