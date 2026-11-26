import { signOut } from "@/app/login/actions";
import { serif, sans } from "@/app/fonts";
import { requireRole } from "@/lib/auth";
import { StayNav } from "./stay-nav";

export default async function StayLayout({ children }: LayoutProps<"/stay">) {
  await requireRole(["guest"]);
  return (
    <div className={`${serif.variable} ${sans.variable} flex flex-1 justify-center bg-[#f4f1ea] font-[family-name:var(--font-luxe-sans)] text-[#1b1f26]`}>
      <div className="flex min-h-dvh w-full max-w-md flex-col bg-[#fbfaf7] shadow-sm">
        <header className="flex h-14 items-center justify-between bg-[#0d1117] px-4 text-[#e9e2d3]">
          <span className="font-[family-name:var(--font-luxe-serif)] text-xl tracking-wide">
            Lumaana <span className="text-[#d8b36a]">·</span>
          </span>
          <form action={signOut}>
            <button type="submit" className="text-xs text-[#e9e2d3]/70 hover:text-[#e9e2d3]">
              Sign out
            </button>
          </form>
        </header>
        <main className="flex-1 px-4 pt-5 pb-24">{children}</main>
        <StayNav />
      </div>
    </div>
  );
}
