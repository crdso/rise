"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Star, GraduationCap, FileClock, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/rise/Sidebar";
import { BottomNav } from "@/components/rise/BottomNav";
import { HeaderBar } from "@/components/rise/HeaderBar";
import { QuickAdd } from "@/components/rise/QuickAdd";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { useFinanceStore } from "@/lib/store/financeStore";
import { useDebtStore } from "@/lib/store/debtStore";
import { useCalendarStore } from "@/lib/store/calendarStore";
import { useReminderStore } from "@/lib/store/reminderStore";
import { useImportantStore } from "@/lib/store/importantStore";
import { useSchoolStore } from "@/lib/store/schoolStore";
import { financeService } from "@/lib/services/finance";
import { debtService } from "@/lib/services/debtService";
import { calendarService } from "@/lib/services/calendarService";
import { reminderService } from "@/lib/services/reminderService";
import { importantService } from "@/lib/services/importantService";
import { schoolService } from "@/lib/services/schoolService";

const INITIAL_SYNC_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

const MORE_LINKS: Array<{ href: "/lembretes" | "/importantes" | "/escola" | "/resumos" | "/configuracoes"; label: string; icon: typeof Bell }> = [
  { href: "/lembretes", label: "Lembretes", icon: Bell },
  { href: "/importantes", label: "Importantes", icon: Star },
  { href: "/escola", label: "Escola", icon: GraduationCap },
  { href: "/resumos", label: "Resumos", icon: FileClock },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

function clearSupabaseStores() {
  useFinanceStore.getState().clearForSupabase();
  useDebtStore.getState().clearForSupabase();
  useCalendarStore.getState().clearForSupabase();
  useReminderStore.getState().clearForSupabase();
  useImportantStore.getState().clearForSupabase();
  useSchoolStore.getState().clearForSupabase();
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [quick, setQuick] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const router = useRouter();
  const demoMode = !isSupabaseConfigured();

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuick(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Proxy owns route authorization. This effect only keeps client stores in sync.
  useEffect(() => {
    if (demoMode) return;

    const supabase = createClient();
    if (!supabase) return;

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          clearSupabaseStores();
          router.replace("/login");
        }
    });

    clearSupabaseStores();

    const modules = [
      ["finance", () => financeService.refreshFromServer()],
      ["debts", () => debtService.refreshFromServer()],
      ["calendar", () => calendarService.refreshFromServer()],
      ["reminders", () => reminderService.refreshFromServer()],
      ["important", () => importantService.refreshFromServer()],
      ["school", () => schoolService.refreshFromServer()],
    ] as const;

    void Promise.allSettled(
      modules.map(([name, refresh]) => withTimeout(refresh(), `${name} initial sync`, INITIAL_SYNC_TIMEOUT_MS))
    ).then((results) => {
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.error(`initial ${modules[index][0]} sync failed`, result.reason);
        }
      });
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [demoMode, router]);

  return (
    <div className="rise-app-shell min-h-[100dvh] flex bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar onQuickAdd={() => setQuick(true)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderBar onCommand={() => setQuick(true)} />
        <main className="flex-1 mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 pb-[calc(88px+var(--sab))] lg:pb-8">{children}</main>
      </div>
      <BottomNav onQuickAdd={() => setQuick(true)} onMore={() => setMoreOpen((v) => !v)} />
      <QuickAdd open={quick} onClose={() => setQuick(false)} />
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setMoreOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="absolute bottom-[76px] inset-x-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-xl">
            <div className="grid grid-cols-2 gap-2">
              {MORE_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl bg-[var(--card-soft)] p-3 border border-[var(--border)] text-[13px] font-medium active:bg-[var(--muted)]"
                >
                  <l.icon className="h-4 w-4 text-[var(--muted-foreground)]" />
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
