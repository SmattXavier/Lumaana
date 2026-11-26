import { cn } from "@/lib/utils";

export const luxeInput =
  "h-11 w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 text-base text-[#e9e2d3] outline-none placeholder:text-[#e9e2d3]/35 focus:border-[#d8b36a]/70 [color-scheme:dark]";

export function LuxeLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[11px] tracking-[0.18em] text-[#e9e2d3]/55 uppercase">
      {children}
    </label>
  );
}

export function GoldButton({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#d8b36a] px-6 text-sm font-medium text-[#0d1117] transition hover:bg-[#e3c283] active:translate-y-px disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] tracking-[0.3em] text-[#d8b36a] uppercase">{children}</div>;
}

/** Placeholder art until concept images land in the media bucket: layered gold light on night. */
export function Atmosphere({ seed = 0, className }: { seed?: number; className?: string }) {
  const spots = [
    ["20% 30%", "75% 70%"],
    ["70% 20%", "25% 80%"],
    ["50% 60%", "85% 15%"],
  ][seed % 3];
  return (
    <div
      aria-hidden
      className={cn("absolute inset-0", className)}
      style={{
        background: `radial-gradient(60% 50% at ${spots[0]}, rgba(216,179,106,0.28), transparent 70%),
          radial-gradient(50% 45% at ${spots[1]}, rgba(120,140,170,0.18), transparent 70%),
          linear-gradient(160deg, #161b24 0%, #0d1117 60%)`,
      }}
    />
  );
}
