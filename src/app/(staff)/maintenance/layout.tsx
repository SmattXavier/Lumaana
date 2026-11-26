import { StaffHeader } from "@/components/app/staff-header";
import { requireRole } from "@/lib/auth";

export default async function MaintenanceLayout({ children }: LayoutProps<"/maintenance">) {
  const profile = await requireRole(["hq_admin", "branch_admin", "maintenance"]);
  return (
    <>
      <StaffHeader area="Maintenance" href="/maintenance" profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
    </>
  );
}
