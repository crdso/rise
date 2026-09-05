import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "./config";

type SessionRefresh = {
  response: NextResponse;
  userId: string | null;
  sessionHeaders: Record<string, string>;
};

/**
 * Refreshes the Supabase Auth cookie before rendering. The verified claims are
 * the only auth signal used by the request proxy; never trust getSession here.
 */
export async function refreshSession(request: NextRequest): Promise<SessionRefresh> {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();
  let response = NextResponse.next({ request });
  let sessionHeaders: Record<string, string> = {};

  if (!url || !publishableKey) return { response, userId: null, sessionHeaders };

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        sessionHeaders = headers;
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  try {
    const { data } = await supabase.auth.getClaims();
    return { response, userId: typeof data?.claims?.sub === "string" ? data.claims.sub : null, sessionHeaders };
  } catch {
    return { response, userId: null, sessionHeaders };
  }
}

export function redirectWithSessionCookies(url: URL, response: NextResponse, sessionHeaders: Record<string, string>) {
  const redirect = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  Object.entries(sessionHeaders).forEach(([key, value]) => redirect.headers.set(key, value));
  return redirect;
}
