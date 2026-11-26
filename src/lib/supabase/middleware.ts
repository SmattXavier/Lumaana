import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { areaFor, canEnter, HOME_FOR_ROLE } from "@/lib/roles";

/**
 * Refreshes the Supabase session cookie and routes by role:
 * - no session on a protected area → /login?next=…
 * - signed in on /login, or in an area their role can't use → their home area
 * This is an optimistic check for routing only; RLS is what protects data.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    }
  );

  // Must run before anything else so an expired token gets refreshed.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  const { pathname } = request.nextUrl;
  const area = areaFor(pathname);
  const isLogin = pathname === "/login";

  if (!area && !isLogin) return response;

  const redirectTo = (path: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = next ? `?next=${encodeURIComponent(next)}` : "";
    const redirect = NextResponse.redirect(url);
    // Keep any refreshed auth cookies on the redirect.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!userId) {
    return isLogin ? response : redirectTo("/login", pathname + request.nextUrl.search);
  }

  // The one profile read per request; RLS lets a user read their own row.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    // Signed in but no profile row: treat as signed out.
    return isLogin ? response : redirectTo("/login");
  }

  if (isLogin || !canEnter(profile.role, pathname)) {
    return redirectTo(HOME_FOR_ROLE[profile.role]);
  }

  return response;
}
