import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL, type Role } from "@/lib/roles";
import { StaffNav, type NavItem } from "./staff-nav";

type Props = {
  area: string;
  href: string;
  profile: { full_name: string; email: string | null; role: Role };
  nav?: NavItem[];
  children?: React.ReactNode;
};

export function StaffHeader({ area, href, profile, nav, children }: Props) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-4 px-4">
        <Link href={href} className="shrink-0 font-semibold">
          Lumaana <span className="font-normal text-muted-foreground">· {area}</span>
        </Link>
        {nav && <StaffNav items={nav} />}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {children}
          <span className="hidden text-muted-foreground lg:inline">
            {profile.full_name || profile.email} · {ROLE_LABEL[profile.role]}
          </span>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
