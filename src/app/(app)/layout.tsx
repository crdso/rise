"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/rise/Sidebar";
import { BottomNav } from "@/components/rise/BottomNav";
import { HeaderBar } from "@/components/rise/HeaderBar";
import { QuickAdd } from "@/components/rise/QuickAdd";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { useFinanceStore } from "@/lib/store/financeStore";
import { useDebtStore } from "@/lib/store/debtStore";
import { useCalendarStore } from "@/lib/store/calendarStore";
import { financeService } from "@/lib/services/finance";
import { debtService } from "@/lib/services/debtService";
import { calendarService } from "@/lib/services/calendarService";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [quick, setQuick] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
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

  // Auth gate - inicia uma vez
  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;
    (async () => {
      if (demoMode) {
        const has = (() => {
          try { return !!localStorage.getItem("rise_demo_session"); } catch { return false; }
        })();
        if (!has) router.replace("/login");
        else if (!cancelled) setReady(true);
        return;
      }
      const supabase = createClient();
      if (!supabase) { router.replace("/login"); return; }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (!cancelled) setReady(true);
        router.replace("/login");
        return;
      }
      // Supabase mode: sync inicial uma vez por sessão
      try {
        useFinanceStore.getState().clearForSupabase();
        useDebtStore.getState().clearForSupabase();
        useCalendarStore.getState().clearForSupabase();
        await Promise.all([financeService.refreshFromServer(), debtService.refreshFromServer(), calendarService.refreshFromServer()]);
      } catch (e) {
        console.error("finance/debt/calendar sync failed", e);
      }
      if (!cancelled) setReady(true);
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          useFinanceStore.getState().clearForSupabase();
          useDebtStore.getState().clearForSupabase();
          useCalendarStore.getState().clearForSupabase();
        }
      });
      subscription = sub.subscription;
    })();
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    // skeleton durante verificação, evita flash de conteúdo sem auth
    return (
      <div className="min-h-[100dvh] bg-[var(--background)] flex items-center justify-center">
        <div className="h-5 w-5 rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)] animate-spin" aria-label="Carregando" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex bg-[var(--background)] text-[var(--foreground)]">
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
            <div className="grid grid-cols-2 gap-2 text-sm">
              <a href="/lembretes" className="rounded-xl bg-[var(--card-soft)] p-3 border border-[var(--border)]">Lembretes</a>
              <a href="/escola" className="rounded-xl bg-[var(--card-soft)] p-3 border border-[var(--border)]">Escola</a>
              <a href="/resumos" className="rounded-xl bg-[var(--card-soft)] p-3 border border-[var(--border)]">Resumos</a>
              <a href="/configuracoes" className="rounded-xl bg-[var(--card-soft)] p-3 border border-[var(--border)]">Configurações</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
