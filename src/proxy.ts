import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { redirectWithSessionCookies, refreshSession } from "@/lib/supabase/proxy";

const LOGIN_PATH = "/login";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isLogin = pathname === LOGIN_PATH;

  if (!isSupabaseConfigured()) {
    const hasDemoSession = request.cookies.get("rise_demo")?.value === "1";
    if (!isApi && isLogin && hasDemoSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (!isApi && !isLogin && !hasDemoSession) {
      return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    }
    return NextResponse.next();
  }

  const { response, userId, sessionHeaders } = await refreshSession(request);

  // Route Handlers return their own 401 responses, but still receive refreshed cookies.
  if (isApi) return response;

  if (isLogin && userId) {
    return redirectWithSessionCookies(new URL("/", request.url), response, sessionHeaders);
  }
  if (!isLogin && !userId) {
    return redirectWithSessionCookies(new URL(LOGIN_PATH, request.url), response, sessionHeaders);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
