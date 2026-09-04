"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Loader2, Check } from "lucide-react";
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
    if (!email.trim() || !password.trim()) { setError("Informe e-mail e senha."); return; }
    setLoading(true);
    try {
      if (demoMode) {
        await new Promise((r) => setTimeout(r, 650));
        setDemoSession(email.trim());
        setSuccess(true);
        setTimeout(() => router.push("/"), 550);
        return;
      }
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase não configurado.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.push("/"), 550);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao entrar";
      setError(msg.replace("@supabase/ssr:","").trim());
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] relative overflow-hidden flex">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[var(--background)]" />
        <div className="absolute -top-[30%] left-[10%] h-[820px] w-[820px] rounded-full blur-[120px] opacity-[0.45]" style={{ background: "radial-gradient(circle, var(--ambient-1), transparent 70%)" }} />
        <div className="absolute top-[18%] right-[8%] h-[560px] w-[560px] rounded-full blur-[110px] opacity-[0.35]" style={{ background: "radial-gradient(circle, var(--ambient-2), transparent 70%)" }} />
        <div className="absolute bottom-[-20%] left-[30%] h-[600px] w-[600px] rounded-full blur-[100px] opacity-[0.2]" style={{ background: "radial-gradient(circle, var(--ambient-3), transparent 70%)" }} />
        {/* sutil composição 4 elementos estáticos - preparação Etapa 6 */}
        <div className="hidden lg:block absolute top-1/2 left-[18%] -translate-y-1/2">
          <div className="relative h-[420px] w-[420px]">
            {[0,1,2,3].map((i) => (
              <div key={i} className="absolute h-[7px] w-[7px] rounded-full bg-[var(--accent)] opacity-20" style={{
                left: `${50 + 42 * Math.cos((i*90+15)*Math.PI/180)}%`,
                top: `${50 + 42 * Math.sin((i*90+15)*Math.PI/180)}%`,
                boxShadow: "0 0 14px var(--glow)",
              }} />
            ))}
            <div className="absolute inset-[34%] rounded-full border border-[var(--border)] opacity-[0.35]" />
            <div className="absolute inset-[44%] rounded-full border border-[var(--border)] opacity-[0.25]" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 grid lg:grid-cols-[1.05fr_0.95fr] min-h-[100dvh]">
        {/* Left - brand minimal */}
        <div className="hidden lg:flex flex-col justify-between p-10 pl-12 pr-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white text-black grid place-items-center font-bold text-sm">R</div>
            <span className="text-[13px] font-semibold tracking-[0.14em] uppercase text-white/85">RISE</span>
          </div>
          <div className="max-w-[420px]">
            <p className="text-[11px] tracking-[0.16em] uppercase text-white/45 font-medium">Bem-vindo</p>
            <h1 className="mt-3 text-[44px] font-semibold tracking-tight leading-[0.92] text-white">Entre<br />no RISE.</h1>
          </div>
          <p className="text-xs text-white/30">© 2026 · acesso privado</p>
        </div>

        {/* Right - form */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }} className="w-full max-w-[380px]">
            <div className="lg:hidden flex items-center gap-2.5 mb-8">
              <div className="h-8 w-8 rounded-lg bg-[var(--foreground)] text-[var(--background)] grid place-items-center font-bold text-sm">R</div>
              <span className="text-sm font-semibold">RISE</span>
            </div>

            <div className="rounded-[22px] bg-[var(--card)] border border-[var(--border)] p-6 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.22)]">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-[18px] font-semibold tracking-tight leading-none">Entrar</h2>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1.5">Acesso privado · sem cadastro público</p>
                </div>
                {demoMode && <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-2.5 py-1 text-[10px] font-medium tracking-wide text-[var(--muted-foreground)]">Modo demonstração</span>}
              </div>

              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div key="s" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="py-10 text-center">
                    <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500 text-white grid place-items-center"><Check className="h-6 w-6" /></div>
                    <p className="mt-3 text-sm font-medium">Bem-vindo de volta.</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Entrando…</p>
                  </motion.div>
                ) : (
                  <motion.form key="f" onSubmit={handle} className="space-y-3.5" exit={{ opacity: 0, y: -6 }}>
                    {error && <div className="rounded-xl border border-red-500/15 bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</div>}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium tracking-wide text-[var(--faint)] uppercase">E-mail</label>
                      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@rise.app" type="email" required autoComplete="email" className="h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium tracking-wide text-[var(--faint)] uppercase">Senha</label>
                        <Link href="#" className="text-[11px] text-[var(--faint)] hover:text-[var(--foreground)]">Esqueci minha senha</Link>
                      </div>
                      <div className="relative">
                        <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type={show ? "text" : "password"} required autoComplete="current-password" className="pr-10 h-10 rounded-xl" />
                        <button type="button" onClick={() => setShow(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--faint)]"><Eye className={show ? "hidden" : "block"} />{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-10 rounded-full mt-1">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {loading ? "Entrando..." : "Entrar"}
                      {!loading && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
