import { StaffHeader } from "@/components/app/staff-header";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireRole(["hq_admin", "branch_admin"]);
  const nav = [
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin", label: "Branches", exact: true },
    { href: "/front-desk", label: "Front desk" },
  ];
  return (
    <>
      <StaffHeader area={profile.role === "hq_admin" ? "HQ admin" : "Branch admin"} href="/admin" profile={profile} nav={nav} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
    </>
  );
}
