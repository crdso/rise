"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, CheckCheck, AlertTriangle, Clock, CalendarDays, HandCoins, GraduationCap } from "lucide-react";
import { useReminderStore } from "@/lib/store/reminderStore";
import { useDebtStore } from "@/lib/store/debtStore";
import { useCalendarStore } from "@/lib/store/calendarStore";
import { useNotificationStore } from "@/lib/store/notificationStore";
import { buildNotifications, type RiseNotification } from "@/lib/notifications";
import { formatDateKey, saoPauloDateKey, saoPauloTodayKey } from "@/lib/timezone";

const KIND_ICON = {
  reminder: Clock,
  debt: HandCoins,
  installment: HandCoins,
  event: CalendarDays,
  school: GraduationCap,
} as const;

function whenLabel(n: RiseNotification) {
  if (n.at === null) return "";
  const iso = new Date(n.at).toISOString();
  const key = saoPauloDateKey(iso);
  const today = saoPauloTodayKey();
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(n.at));
  if (key === today) return time;
  return formatDateKey(key, { day: "2-digit", month: "short" });
}

/**
 * Central de notificações.
 *
 * A lista é derivada dos dados reais a cada render — nada é fabricado e nada
 * fica guardado. O que persiste é apenas o que já foi lido ou dispensado.
 * O contador só aparece quando existe algo de fato não lido.
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);
  const router = useRouter();

  const { reminders } = useReminderStore();
  const { debts, payments, installments } = useDebtStore();
  const { events } = useCalendarStore();
  const { prefs, read, dismissed, markRead, markAllRead, dismiss } = useNotificationStore();

  // "atrasado" e "próximas 24h" mudam com o tempo, não com os dados
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const list = useMemo(
    () => buildNotifications({ reminders, debts, payments, installments, events, prefs, dismissed }),
    [reminders, debts, payments, installments, events, prefs, dismissed]
  );

  const unread = useMemo(() => list.filter((n) => !read.includes(n.id)), [list, read]);

  const openItem = (n: RiseNotification) => {
    markRead(n.id);
    setOpen(false);
    router.push(n.href);
  };

  const Body = (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-semibold">Notificações</p>
          {unread.length > 0 && (
            <span className="text-[11px] text-[var(--muted-foreground)]">{unread.length} não lidas</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread.length > 0 && (
            <button
              onClick={() => markAllRead(list.map((n) => n.id))}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-soft)]"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="h-7 w-7 rounded-full bg-[var(--card-soft)] grid place-items-center hover:bg-[var(--muted)]"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-[13.5px] font-medium">Nada precisa da sua atenção</p>
          <p className="mt-1 text-[12.5px] text-[var(--muted-foreground)]">
            Vencimentos, atrasos e compromissos próximos aparecem aqui.
          </p>
        </div>
      ) : (
        <ul className="max-h-[62dvh] lg:max-h-[420px] overflow-auto divide-y divide-[var(--border)]">
          {list.map((n) => {
            const Icon = KIND_ICON[n.kind];
            const isRead = read.includes(n.id);
            return (
              <li key={n.id} className={`relative ${isRead ? "opacity-60" : ""}`}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className="flex w-full items-start gap-3 px-4 py-3 pr-10 text-left hover:bg-[var(--card-soft)] transition-colors"
                >
                  <span
                    className={`mt-0.5 h-8 w-8 shrink-0 grid place-items-center rounded-xl border ${
                      n.severity === "critical"
                        ? "border-[var(--negative)]/30 bg-[var(--negative)]/10 text-[var(--negative)]"
                        : n.severity === "warning"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                          : "border-[var(--border)] bg-[var(--card-soft)] text-[var(--muted-foreground)]"
                    }`}
                  >
                    {n.severity === "critical" ? <AlertTriangle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-tight truncate">{n.title}</span>
                    <span className="mt-0.5 block text-[12px] text-[var(--muted-foreground)]">
                      {n.desc}
                      {whenLabel(n) ? ` · ${whenLabel(n)}` : ""}
                    </span>
                  </span>

                  {!isRead && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden />}
                </button>

                <button
                  type="button"
                  onClick={() => dismiss(n.id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 grid place-items-center rounded-full text-[var(--faint)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  aria-label={`Dispensar ${n.title}`}
                  title="Dispensar"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={unread.length ? `Notificações: ${unread.length} não lidas` : "Notificações"}
        className="relative h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--card)] grid place-items-center hover:border-[var(--border-strong)] transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[var(--negative)] text-[var(--negative-foreground)] text-[10px] font-bold grid place-items-center tnum">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* desktop popover */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 hidden lg:block"
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="hidden lg:block fixed z-50 right-6 top-[64px] w-[400px] rounded-2xl border border-[var(--border)] bg-[var(--elevated)] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            >
              {Body}
            </motion.div>

            {/* mobile sheet */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 lg:hidden rounded-t-[22px] border-t border-[var(--border)] bg-[var(--elevated)] overflow-hidden pb-[var(--sab)]"
            >
              <div className="mx-auto h-1 w-9 rounded-full bg-[var(--border-strong)] my-3" />
              {Body}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
