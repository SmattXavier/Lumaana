import { StaffHeader } from "@/components/app/staff-header";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireRole(["hq_admin", "branch_admin"]);
  return (
    <>
      <StaffHeader area={profile.role === "hq_admin" ? "HQ admin" : "Branch admin"} href="/admin" profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
    </>
  );
}
