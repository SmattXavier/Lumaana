import { StaffHeader } from "@/components/app/staff-header";
import { requireRole } from "@/lib/auth";

export default async function FrontDeskLayout({ children }: LayoutProps<"/front-desk">) {
  const profile = await requireRole(["hq_admin", "branch_admin", "front_desk"]);
  return (
    <>
      <StaffHeader area="Front desk" href="/front-desk" profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
    </>
  );
}
