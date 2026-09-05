"use client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const KEY = "rise_demo_session";
const COOKIE = "rise_demo";

export function isDemoMode() {
  return !isSupabaseConfigured();
}

export function getDemoSession(): { email: string } | null {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return null;
    return JSON.parse(v);
  } catch { return null; }
}

export function setDemoSession(email: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ email, at: Date.now() }));
    // mirror to cookie for server readability (not httpOnly, just for demo)
    document.cookie = `${COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}`;
  } catch {}
}

export function clearDemoSession() {
  try {
    localStorage.removeItem(KEY);
    document.cookie = `${COOKIE}=; path=/; max-age=0`;
  } catch {}
}

export function hasDemoSessionCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes(`${COOKIE}=1`);
}
