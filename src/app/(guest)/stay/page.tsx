import { getProfile } from "@/lib/auth";

export default async function StayPage() {
  const profile = await getProfile();
  return (
    <div className="grid gap-1">
      <h1 className="text-lg font-semibold">Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}</h1>
      <p className="text-sm text-muted-foreground">Your stay, live bill and express checkout land here.</p>
    </div>
  );
}
