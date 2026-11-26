import Link from "next/link";
import { cn } from "@/lib/utils";

export function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="font-[family-name:var(--font-luxe-serif)] text-3xl leading-tight">{children}</h1>;
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-2xl border border-black/10 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]", className)}>{children}</section>;
}

export function GoldButton({
  className, ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d1117] text-sm font-medium text-[#e9e2d3] transition active:translate-y-px disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function NoStay() {
  return (
    <div className="grid gap-4">
      <H1>No stay to show</H1>
      <p className="text-sm text-black/60">
        When you book a Lumaana hotel with this email address, your stay, live bill and express checkout appear here.
      </p>
      <Link href="/" className="text-sm font-medium text-[#8a6a2a] underline underline-offset-4">
        Book a room
      </Link>
    </div>
  );
}
