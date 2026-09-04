"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";

export default function ConfigPage() {
  const { theme, setTheme, themes } = useTheme();
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>

      <Card>
        <CardHeader><CardTitle>Aparência</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)] mb-3">Tema · transição suave · salvo local + DB</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(themes) as Array<keyof typeof themes>).map((id) => (
              <button key={id} onClick={() => setTheme(id as never)} className={`rounded-xl border p-3 text-left ${theme === id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--card-soft)]"}`}>
                <span className="block h-8 rounded-full mb-2" style={{ background: themes[id].accent }} />
                <span className="text-xs font-semibold">{themes[id].label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Segurança</CardTitle></CardHeader>
        <CardContent className="text-sm text-[var(--muted-foreground)]">Login privado por e-mail/senha. Sem cadastro público. “Esqueci minha senha” previsto. Sessão via Supabase Auth.</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Integrações</CardTitle></CardHeader>
        <CardContent className="text-sm text-[var(--muted-foreground)]">Twilio WhatsApp Sandbox (desacoplado via MessagingProvider) — mock nesta etapa. Webhook em /api/webhooks/twilio (próxima etapa).</CardContent>
      </Card>

      <a href="/configuracoes/auditoria" className="inline-flex text-sm text-[var(--accent)] hover:underline">Ver auditoria →</a>
    </div>
  );
}
