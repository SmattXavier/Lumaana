"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BedDoubleIcon, ConciergeBellIcon, LogOutIcon, ReceiptTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/stay", label: "Stay", icon: BedDoubleIcon },
  { href: "/stay/bill", label: "Bill", icon: ReceiptTextIcon },
  { href: "/stay/requests", label: "Requests", icon: ConciergeBellIcon },
  { href: "/stay/checkout", label: "Checkout", icon: LogOutIcon },
];

export function StayNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-md grid-cols-4 border-t border-black/10 bg-[#fbfaf7]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === "/stay" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-black/50", active && "text-[#0d1117]")}
          >
            <Icon className={cn("size-5", active && "text-[#b8913f]")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
