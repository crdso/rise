"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Shield, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { setDemoSession } from "@/lib/auth/demo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const demoMode = !isSupabaseConfigured();

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Informe e-mail e senha.");
      return;
    }

    setLoading(true);
    try {
      if (demoMode) {
        // DEMO MODE: sem supabase, aceita qualquer não-vazio
        await new Promise((r) => setTimeout(r, 700));
        setDemoSession(email.trim());
        setSuccess(true);
        setTimeout(() => router.push("/"), 600);
        return;
      }

      const supabase = createClient();
      if (!supabase) throw new Error("Supabase não configurado.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.push("/"), 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao entrar";
      // nunca expor stack do supabase
      setError(msg.replace("@supabase/ssr:","").trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex">
      {/* Left - Brand / ambient */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-[var(--background)]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--ambient-1)] via-transparent to-[var(--ambient-2)]" />
          <div className="absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-[var(--ambient-1)] blur-[80px] opacity-60" />
          <div className="absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full bg-[var(--ambient-2)] blur-[90px] opacity-40" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full max-w-[560px] mx-auto">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[var(--foreground)] text-[var(--background)] grid place-items-center font-bold tracking-tight">R</div>
              <span className="font-semibold tracking-tight text-[17px]">RISE</span>
              <span className="text-[11px] tracking-[0.16em] uppercase text-[var(--faint)] ml-2">Painel pessoal</span>
            </div>
            <h1 className="mt-16 text-[42px] font-bold tracking-tight leading-[0.95] max-w-[18ch]">Sua vida,<br />organizada.</h1>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted-foreground)] max-w-[38ch]">Finanças, calendário, escola e rotina — em um único lugar. Premium, privado e feito para uso diário.</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {["Finanças", "Calendário", "Escola", "Assistente IA"].map((k) => (
                <span key={k} className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">{k}</span>
              ))}
            </div>
          </div>
          <p className="text-xs text-[var(--faint)]">© 2026 RISE · Privado</p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[var(--background-soft)] lg:bg-[var(--card)]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-9 w-9 rounded-xl bg-[var(--foreground)] text-[var(--background)] grid place-items-center font-bold">R</div>
            <span className="font-semibold">RISE</span>
          </div>

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-7 sm:p-8 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
            <div className="mb-6">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[22px] font-semibold tracking-tight">Bem-vindo de volta</h2>
                {demoMode && <span className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">Modo demonstração</span>}
              </div>
              <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">Entre com seu e-mail e senha. Acesso privado.</p>
            </div>

            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 text-center"
                >
                  <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500 text-white grid place-items-center shadow-[0_10px_24px_rgba(16,185,129,0.35)]">
                    <Check className="h-7 w-7" />
                  </div>
                  <p className="mt-4 font-medium">Bem-vindo de volta.</p>
                  <p className="text-sm text-[var(--muted-foreground)]">Entrando no RISE…</p>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handle} className="space-y-4" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }}>
                  {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</div>}
                  <div className="space-y-2">
                    <label className="text-xs font-medium tracking-wide text-[var(--muted-foreground)]">E-mail</label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@rise.app" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium tracking-wide text-[var(--muted-foreground)]">Senha</label>
                      <Link href="#" className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Esqueci minha senha</Link>
                    </div>
                    <div className="relative">
                      <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type={show ? "text" : "password"} required autoComplete="current-password" className="pr-10" />
                      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--faint)] hover:text-[var(--foreground)]">
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading} className="w-full mt-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {loading ? "Entrando..." : "Entrar"}
                    {!loading && <ArrowRight className="h-4 w-4" />}
                  </Button>

                  <div className="flex items-center gap-3 py-1 text-[11px] text-[var(--faint)]">
                    <span className="h-px flex-1 bg-[var(--border)]" />
                    <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" /> Acesso privado · sem cadastro público</span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-4 text-center text-xs text-[var(--faint)]">Ao continuar você concorda com o uso privado do RISE.</p>
        </motion.div>
      </div>
    </div>
  );
}
