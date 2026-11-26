import { StaffHeader } from "@/components/app/staff-header";
import { requireRole } from "@/lib/auth";

export default async function ProcurementLayout({ children }: LayoutProps<"/procurement">) {
  const profile = await requireRole(["hq_admin", "branch_admin", "procurement"]);
  return (
    <>
      <StaffHeader area="Procurement" href="/procurement" profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
    </>
  );
}
