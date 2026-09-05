"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getDemoSession, setDemoSession } from "@/lib/auth/demo";
import { RiseMark, RiseLogo } from "@/components/rise/RiseMark";
import { SpotlightSurface } from "@/components/rise/SpotlightSurface";
import { LoginSuccess } from "@/components/rise/LoginSuccess";
import { usePrefersReducedMotion } from "@/components/theme-provider";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const demoMode = !isSupabaseConfigured();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    let active = true;

    if (demoMode) {
      const session = getDemoSession();
      if (session) {
        // Restores the demo cookie used by the request proxy for older sessions.
        setDemoSession(session.email);
        router.replace("/");
      } else {
        setCheckingAuth(false);
      }
      return () => { active = false; };
    }

    const supabase = createClient();
    if (!supabase) {
      setCheckingAuth(false);
      return () => { active = false; };
    }

    const timeout = setTimeout(() => {
      if (active) setCheckingAuth(false);
    }, 6_000);

    void supabase.auth.getClaims().then(({ data, error: claimsError }) => {
      if (!active) return;
      clearTimeout(timeout);
      if (!claimsError && data?.claims?.sub) router.replace("/");
      else setCheckingAuth(false);
    }).catch(() => {
      if (active) {
        clearTimeout(timeout);
        setCheckingAuth(false);
      }
    });

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [demoMode, router]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || success) return;
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 500));
        setDemoSession(email.trim());
      } else {
        const supabase = createClient();
        if (!supabase) throw new Error("Supabase não configurado.");
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
      }
      setSuccess(true);
      // tempo da animação de conclusão antes de trocar de tela
      setTimeout(() => router.replace("/"), reduced ? 320 : 1000);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "Falha ao entrar";
      const msg = /invalid login credentials/i.test(raw)
        ? "E-mail ou senha incorretos."
        : raw.replace("@supabase/ssr:", "").trim();
      setError(msg);
      setLoading(false);
    }
  };

  const drift = reduced
    ? {}
    : { animate: { x: [0, 24, 0], y: [0, -18, 0] }, transition: { duration: 22, repeat: Infinity, ease: "easeInOut" as const } };
  const drift2 = reduced
    ? {}
    : { animate: { x: [0, -28, 0], y: [0, 16, 0] }, transition: { duration: 27, repeat: Infinity, ease: "easeInOut" as const } };

  if (checkingAuth) {
    return <div className="min-h-[100dvh] bg-[var(--background)]" aria-label="Verificando acesso" />;
  }

  return (
    <div className="rise-auth-shell relative min-h-[100dvh] bg-[var(--background)] overflow-hidden">
      {/* fundo profundo + movimento ambiental muito lento */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <motion.div
          {...drift}
          className="absolute -top-[28%] -left-[10%] h-[780px] w-[780px] rounded-full blur-[130px] opacity-[0.5]"
          style={{ background: "radial-gradient(circle, var(--ambient-1), transparent 68%)" }}
        />
        <motion.div
          {...drift2}
          className="absolute top-[12%] -right-[12%] h-[620px] w-[620px] rounded-full blur-[120px] opacity-[0.4]"
          style={{ background: "radial-gradient(circle, var(--ambient-2), transparent 68%)" }}
        />
        <div
          className="absolute -bottom-[30%] left-[25%] h-[620px] w-[620px] rounded-full blur-[110px] opacity-[0.28]"
          style={{ background: "radial-gradient(circle, var(--ambient-3), transparent 68%)" }}
        />
        {/* vinheta para o formulário não competir com o fundo */}
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 40%, rgba(0,0,0,0.42) 100%)" }}
        />
      </div>

      {/* luz que segue o cursor — só desktop com ponteiro fino */}
      <SpotlightSurface size={620} />

      <div className="relative z-10 min-h-[100dvh] grid lg:grid-cols-[1.12fr_0.88fr]">
        {/* ------- painel de marca (desktop) ------- */}
        <div className="hidden lg:flex flex-col justify-between p-12 pr-8">
          <RiseLogo size={32} />

          <div className="relative max-w-[460px]">
            {/* marca em escala, como elemento gráfico */}
            <div className="absolute -top-[190px] -left-[40px] text-[var(--accent)] opacity-[0.07] pointer-events-none" aria-hidden>
              <RiseMark size={340} />
            </div>
            <h1 className="relative text-[52px] font-semibold tracking-[-0.03em] leading-[0.94]">
              Tudo o que você
              <br />
              precisa acompanhar.
            </h1>
            <p className="relative mt-5 text-[15px] leading-relaxed text-[var(--muted-foreground)] max-w-[380px]">
              Finanças, calendário, lembretes e escola em um só lugar — com histórico e auditoria de tudo que acontece.
            </p>
          </div>

          <p className="text-xs text-[var(--faint)]">Acesso privado · sem cadastro público</p>
        </div>

        {/* ------- formulário ------- */}
        <div className="flex items-center justify-center p-5 sm:p-8 lg:p-10">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[400px]"
          >
            {/* marca no mobile */}
            <div className="lg:hidden mb-8 flex flex-col items-center text-center">
              <RiseLogo size={34} />
              <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.02em] leading-tight">
                Tudo o que você precisa acompanhar.
              </h1>
            </div>

            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)]/85 backdrop-blur-xl p-6 sm:p-7 shadow-[0_28px_70px_rgba(0,0,0,0.5)]">
              <div className="flex items-start justify-between gap-3 mb-6">
                <h2 className="text-[19px] font-semibold tracking-tight leading-none">Entrar</h2>
                {demoMode && (
                  <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-1 text-[10px] font-medium tracking-wide text-[var(--muted-foreground)]">
                    Demonstração
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <LoginSuccess />
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handle} className="space-y-4" exit={{ opacity: 0, y: -8 }}>
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div
                            role="alert"
                            className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs text-red-300"
                          >
                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>{error}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-[11px] font-medium tracking-[0.08em] text-[var(--faint)] uppercase">
                        E-mail
                      </label>
                      <Input
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@exemplo.com"
                        type="email"
                        required
                        autoComplete="email"
                        inputMode="email"
                        disabled={loading}
                        className="h-11 rounded-xl bg-[var(--card-soft)]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="password" className="text-[11px] font-medium tracking-[0.08em] text-[var(--faint)] uppercase">
                        Senha
                      </label>
                      <div className="relative">
                        <Input
                          id="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          type={show ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          disabled={loading}
                          className="pr-11 h-11 rounded-xl bg-[var(--card-soft)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShow((v) => !v)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center rounded-lg text-[var(--faint)] hover:text-[var(--foreground)] transition-colors"
                          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* CTA principal — único lugar do app com a borda giratória */}
                    <div className="rise-rotating-border rounded-full mt-1">
                      <Button type="submit" disabled={loading} aria-busy={loading} className="w-full h-11 rounded-full relative z-[2]">
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Entrando…
                          </>
                        ) : (
                          <>
                            Entrar <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>

                    <p className="text-[11px] text-center text-[var(--faint)] pt-1">
                      {demoMode
                        ? "Sem Supabase configurado: qualquer e-mail abre o modo demonstração."
                        : "Acesso privado. Não há cadastro público."}
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            <p className="lg:hidden mt-6 text-center text-[11px] text-[var(--faint)]">Acesso privado</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
