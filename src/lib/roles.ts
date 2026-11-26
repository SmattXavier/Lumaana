import type { Enums } from "@/lib/database.types";

export type Role = Enums<"user_role">;

/** Where each role lands after sign-in. */
export const HOME_FOR_ROLE: Record<Role, string> = {
  guest: "/stay",
  hq_admin: "/admin/reports",
  branch_admin: "/admin",
  front_desk: "/front-desk",
  procurement: "/procurement",
  maintenance: "/maintenance",
};

/** Protected areas and the roles allowed in each. Managers can reach every staff area. */
export const AREA_ROLES: Record<string, Role[]> = {
  "/stay": ["guest"],
  "/admin": ["hq_admin", "branch_admin"],
  "/front-desk": ["hq_admin", "branch_admin", "front_desk"],
  "/procurement": ["hq_admin", "branch_admin", "procurement"],
  "/maintenance": ["hq_admin", "branch_admin", "maintenance"],
};

export const ROLE_LABEL: Record<Role, string> = {
  guest: "Guest",
  hq_admin: "HQ admin",
  branch_admin: "Branch admin",
  front_desk: "Front desk",
  procurement: "Procurement",
  maintenance: "Maintenance",
};

/** The protected area a path belongs to, or null for public paths. */
export function areaFor(pathname: string): string | null {
  return (
    Object.keys(AREA_ROLES).find(
      (area) => pathname === area || pathname.startsWith(`${area}/`)
    ) ?? null
  );
}

export function canEnter(role: Role, pathname: string): boolean {
  const area = areaFor(pathname);
  return area === null || AREA_ROLES[area].includes(role);
}
