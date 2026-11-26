import { signOut } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";

export default async function StayLayout({ children }: LayoutProps<"/stay">) {
  await requireRole(["guest"]);
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <header className="flex h-12 items-center justify-between border-b px-4">
        <span className="font-semibold">Lumaana</span>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
