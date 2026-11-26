"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canEnter, HOME_FOR_ROLE } from "@/lib/roles";

export type LoginState = { error?: string; email?: string };

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Enter your email and password.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message, email };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "This account has no profile. Contact your administrator.", email };
  }

  // Only follow same-site paths the role is allowed into.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : null;
  redirect(safeNext && canEnter(profile.role, safeNext) && safeNext !== "/login"
    ? safeNext
    : HOME_FOR_ROLE[profile.role]);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
