import { StaffHeader } from "@/components/app/staff-header";
import { getDeskBranch } from "@/lib/desk";
import { BranchSwitcher } from "./branch-switcher";

export default async function FrontDeskLayout({ children }: LayoutProps<"/front-desk">) {
  const { profile, branch, branches } = await getDeskBranch();
  const nav = [
    { href: "/front-desk", label: "Today", exact: true },
    { href: "/front-desk/reservations", label: "Reservations" },
    { href: "/front-desk/audit", label: "Night audit" },
    ...(profile.role !== "front_desk" ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  return (
    <>
      <StaffHeader area="Front desk" href="/front-desk" profile={profile} nav={nav}>
        {branches ? (
          <BranchSwitcher branches={branches} current={branch.id} />
        ) : (
          <span className="hidden font-medium sm:inline">{branch.name}</span>
        )}
      </StaffHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">{children}</main>
    </>
  );
}
