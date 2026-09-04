"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Palette,
  LayoutGrid,
  Wallet,
  GraduationCap,
  Bell,
  Bot,
  Plug,
  Shield,
  Database,
  ScrollText,
  Check,
  RotateCcw,
  Eye,
  EyeOff,
  Download,
  LogOut,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ThemePreview } from "@/components/rise/ThemeSwitcher";
import { CustomThemeEditor } from "@/components/rise/settings/CustomThemeEditor";
import {
  SettingsSection,
  SettingsPanel,
  SettingsRow,
  SettingsLinkRow,
  Switch,
  SegmentedControl,
  StatusPill,
} from "@/components/rise/settings/SettingsUI";
import { useDashboardStore, resolveOrder, WIDGET_META, type WidgetId } from "@/lib/store/dashboardStore";
import { useNotificationStore } from "@/lib/store/notificationStore";
import { useFinanceStore } from "@/lib/store/financeStore";
import { useDebtStore } from "@/lib/store/debtStore";
import { useCalendarStore } from "@/lib/store/calendarStore";
import { useReminderStore } from "@/lib/store/reminderStore";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { clearDemoSession } from "@/lib/auth/demo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

type SectionId =
  | "aparencia"
  | "painel"
  | "financas"
  | "escola"
  | "lembretes"
  | "notificacoes"
  | "assistente"
  | "integracoes"
  | "seguranca"
  | "dados"
  | "auditoria";

const SECTIONS: Array<{ id: SectionId; label: string; icon: typeof Palette }> = [
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "painel", label: "Painel", icon: LayoutGrid },
  { id: "financas", label: "Finanças", icon: Wallet },
  { id: "escola", label: "Escola", icon: GraduationCap },
  { id: "lembretes", label: "Lembretes", icon: Bell },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "assistente", label: "Assistente", icon: Bot },
  { id: "integracoes", label: "Integrações", icon: Plug },
  { id: "seguranca", label: "Segurança", icon: Shield },
  { id: "dados", label: "Dados", icon: Database },
  { id: "auditoria", label: "Auditoria", icon: ScrollText },
];

type Integrations = {
  supabase: boolean;
  supabaseServiceRole: boolean;
  brandfetch: boolean;
  logodev: boolean;
  openai: boolean;
  gemini: boolean;
  twilio: boolean;
};

export default function ConfiguracoesPage() {
  const [section, setSection] = useState<SectionId>("aparencia");
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const { push } = useToast();
  const router = useRouter();

  const { theme, setTheme, themes, order: themeOrder, reducedMotion, setReducedMotion, density, setDensity } = useTheme();
  const dash = useDashboardStore();
  const notif = useNotificationStore();
  const finance = useFinanceStore();
  const debtStore = useDebtStore();
  const calendar = useCalendarStore();
  const reminders = useReminderStore();

  const isDemo = !isSupabaseConfigured();
  const widgetOrder = useMemo(() => resolveOrder(dash.order), [dash.order]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/integrations")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.data) setIntegrations(j.data as Integrations);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      mode: isDemo ? "demo" : "supabase",
      accounts: finance.accounts,
      categories: finance.categories,
      transactions: finance.transactions,
      debts: debtStore.debts,
      payments: debtStore.payments,
      installments: debtStore.installments,
      events: calendar.events,
      reminders: reminders.reminders,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rise-dados-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    push({ title: "Arquivo gerado" });
  };

  const signOut = async () => {
    if (isDemo) {
      clearDemoSession();
    } else {
      const supabase = createClient();
      await supabase?.auth.signOut();
    }
    router.replace("/login");
  };

  return (
    <div className="space-y-5">
      <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Configurações</h1>

      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-8">
        {/* trilha de seções: vertical no desktop, rolável no mobile */}
        <nav className="lg:sticky lg:top-[72px] lg:self-start">
          <div className="-mx-4 px-4 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar">
            <div className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
              {SECTIONS.map((s) => {
                const active = section === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSection(s.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
                      active
                        ? "bg-[var(--card)] text-[var(--foreground)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card-soft)]"
                    }`}
                  >
                    <s.icon className={`h-4 w-4 ${active ? "text-[var(--accent)]" : "opacity-70"}`} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="mt-5 lg:mt-0 space-y-6 max-w-[680px]">
          {/* ---------------- APARÊNCIA ---------------- */}
          {section === "aparencia" && (
            <>
              <SettingsSection title="Tema" description="O RISE é dark-only. Não existe modo claro.">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {themeOrder.map((id) => {
                    const active = theme === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setTheme(id)}
                        aria-pressed={active}
                        className={`rounded-xl border p-2 text-left transition-all ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]"
                        }`}
                      >
                        <ThemePreview preview={themes[id].preview} height={54} />
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <p className="text-[12px] font-semibold truncate">{themes[id].label}</p>
                          {active && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SettingsSection>

              <SettingsSection title="Tema personalizado" description="Suas cores sobre a base escura do RISE.">
                <CustomThemeEditor />
              </SettingsSection>

              <SettingsSection title="Interface">
                <SettingsPanel>
                  <SettingsRow
                    label="Animações reduzidas"
                    hint="Desliga a borda giratória, o spotlight e encurta as transições."
                    control={<Switch checked={reducedMotion} onChange={setReducedMotion} label="Animações reduzidas" />}
                  />
                  <SettingsRow
                    label="Densidade"
                    hint="Compacta encurta os arredondamentos e aproxima os elementos."
                    control={
                      <SegmentedControl
                        label="Densidade"
                        value={density}
                        onChange={setDensity}
                        options={[
                          { value: "comfortable", label: "Confortável" },
                          { value: "compact", label: "Compacta" },
                        ]}
                      />
                    }
                  />
                </SettingsPanel>
              </SettingsSection>
            </>
          )}

          {/* ---------------- PAINEL ---------------- */}
          {section === "painel" && (
            <SettingsSection
              title="Blocos do painel"
              description="Escolha o que aparece na tela inicial. A ordem é ajustada arrastando em Editar painel."
            >
              <SettingsPanel>
                {widgetOrder.map((id: WidgetId) => {
                  const hidden = dash.hidden.includes(id);
                  return (
                    <SettingsRow
                      key={id}
                      label={WIDGET_META[id].title}
                      hint={WIDGET_META[id].desc}
                      icon={hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      control={
                        <Switch
                          checked={!hidden}
                          onChange={() => dash.toggleHidden(id)}
                          label={`Mostrar ${WIDGET_META[id].title}`}
                        />
                      }
                    />
                  );
                })}
              </SettingsPanel>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={dash.reset}>
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar layout padrão
              </Button>
            </SettingsSection>
          )}

          {/* ---------------- FINANÇAS ---------------- */}
          {section === "financas" && (
            <SettingsSection title="Finanças" description="Moeda fixa em real brasileiro (BRL).">
              <SettingsPanel>
                <SettingsRow
                  label="Contas ativas"
                  hint={`${finance.accounts.filter((a) => a.is_active).length} de ${finance.accounts.length} cadastradas`}
                />
                <SettingsRow label="Categorias" hint={`${finance.categories.length} em uso`} />
                <SettingsRow label="Lançamentos" hint={`${finance.transactions.length} registrados`} />
                <SettingsLinkRow href="/financas/contas" label="Gerenciar contas" hint="Adicionar, editar e desativar" />
                <SettingsLinkRow href="/financas/dividas" label="Dívidas e recebíveis" hint="Parcelamentos e pagamentos" />
              </SettingsPanel>
            </SettingsSection>
          )}

          {/* ---------------- ESCOLA ---------------- */}
          {section === "escola" && (
            <SettingsSection title="Escola" description="Ensino Médio — 3º ano, 2026.">
              <SettingsPanel>
                <SettingsRow
                  label="Arquivamento automático"
                  hint="Em 15/12/2026 o workspace do 3º ano é arquivado. Nada é apagado: o histórico continua acessível."
                />
                <SettingsLinkRow href="/escola" label="Abrir Escola" hint="Atividades, provas e entregas" />
              </SettingsPanel>
            </SettingsSection>
          )}

          {/* ---------------- LEMBRETES ---------------- */}
          {section === "lembretes" && (
            <SettingsSection title="Lembretes">
              <SettingsPanel>
                <SettingsRow
                  label="Atrasados"
                  hint="Calculados na hora pela passagem do tempo — não dependem de nenhuma rotina agendada."
                />
                <SettingsRow
                  label="Recorrência"
                  hint="Ao concluir uma ocorrência, ela vira histórico e a próxima é agendada automaticamente."
                />
                <SettingsRow label="Total" hint={`${reminders.reminders.length} lembretes registrados`} />
                <SettingsLinkRow href="/lembretes" label="Abrir Lembretes" />
              </SettingsPanel>
            </SettingsSection>
          )}

          {/* ---------------- NOTIFICAÇÕES ---------------- */}
          {section === "notificacoes" && (
            <SettingsSection
              title="Notificações"
              description="O que aparece no sino. Tudo é derivado dos seus dados — nada é inventado."
            >
              <SettingsPanel>
                <SettingsRow
                  label="Lembretes"
                  hint="Atrasados, de hoje e prioridade alta"
                  control={
                    <Switch
                      checked={notif.prefs.reminders}
                      onChange={(v) => notif.setPref("reminders", v)}
                      label="Notificar lembretes"
                    />
                  }
                />
                <SettingsRow
                  label="Dívidas e parcelas"
                  hint="Vencidas e a vencer nos próximos 3 dias"
                  control={
                    <Switch checked={notif.prefs.debts} onChange={(v) => notif.setPref("debts", v)} label="Notificar dívidas" />
                  }
                />
                <SettingsRow
                  label="Eventos"
                  hint="Nas próximas 24 horas"
                  control={
                    <Switch checked={notif.prefs.events} onChange={(v) => notif.setPref("events", v)} label="Notificar eventos" />
                  }
                />
                <SettingsRow
                  label="Escola"
                  hint="Atividades e provas próximas"
                  control={
                    <Switch checked={notif.prefs.school} onChange={(v) => notif.setPref("school", v)} label="Notificar escola" />
                  }
                />
                <SettingsRow
                  label="Histórico de leitura"
                  hint="Esquece o que já foi lido e dispensado."
                  control={
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={notif.clearHistory}>
                      Limpar
                    </Button>
                  }
                />
              </SettingsPanel>
              <p className="text-[12px] text-[var(--muted-foreground)]">
                Notificações push do navegador ainda não estão implementadas — o sino funciona só com o app aberto.
              </p>
            </SettingsSection>
          )}

          {/* ---------------- ASSISTENTE ---------------- */}
          {section === "assistente" && (
            <SettingsSection title="Assistente" description="Interpretação de texto no Adicionar rápido.">
              <SettingsPanel>
                <SettingsRow
                  label="Provedor de IA"
                  hint={
                    integrations?.openai || integrations?.gemini
                      ? "Chave configurada no servidor."
                      : "Nenhuma chave configurada. O interpretador roda em modo local de demonstração."
                  }
                  control={
                    <StatusPill
                      ok={!!(integrations?.openai || integrations?.gemini)}
                      okLabel="Configurado"
                      offLabel="Não configurado"
                    />
                  }
                />
                <SettingsRow
                  label="Onde a chave fica"
                  hint="Sempre no servidor. Nenhuma chave de IA é exposta ao navegador."
                />
              </SettingsPanel>
            </SettingsSection>
          )}

          {/* ---------------- INTEGRAÇÕES ---------------- */}
          {section === "integracoes" && (
            <SettingsSection title="Integrações" description="Status de configuração. Nenhum valor de chave é exibido.">
              <SettingsPanel>
                <SettingsRow
                  label="Supabase"
                  hint="Banco, autenticação e RPCs"
                  control={<StatusPill ok={!!integrations?.supabase} okLabel="Conectado" offLabel="Modo demonstração" />}
                />
                <SettingsRow
                  label="Service role"
                  hint="Necessária apenas em rotinas administrativas do servidor"
                  control={<StatusPill ok={!!integrations?.supabaseServiceRole} okLabel="Configurada" offLabel="Ausente" />}
                />
                <SettingsRow
                  label="Brandfetch"
                  hint="Primeiro provedor de logos (chave no servidor)"
                  control={<StatusPill ok={!!integrations?.brandfetch} okLabel="Configurado" offLabel="Não configurado" />}
                />
                <SettingsRow
                  label="Logo.dev"
                  hint="Segundo provedor de logos (token público)"
                  control={<StatusPill ok={!!integrations?.logodev} okLabel="Configurado" offLabel="Não configurado" />}
                />
                <SettingsRow
                  label="Twilio / WhatsApp"
                  hint="Integração ainda não implementada nesta versão"
                  control={<StatusPill ok={!!integrations?.twilio} okLabel="Credenciais presentes" offLabel="Não configurado" />}
                />
              </SettingsPanel>
            </SettingsSection>
          )}

          {/* ---------------- SEGURANÇA ---------------- */}
          {section === "seguranca" && (
            <SettingsSection title="Segurança">
              <SettingsPanel>
                <SettingsRow
                  label="Modo de acesso"
                  hint={
                    isDemo
                      ? "Demonstração: os dados ficam apenas neste navegador."
                      : "Supabase Auth com e-mail e senha. Não há cadastro público."
                  }
                  control={<StatusPill ok={!isDemo} okLabel="Autenticado" offLabel="Demonstração" />}
                />
                <SettingsRow
                  label="Isolamento dos dados"
                  hint="RLS por usuário no banco: leitura só das próprias linhas, e escrita apenas por funções auditadas que resolvem o usuário no servidor."
                />
                <SettingsRow
                  label="Encerrar sessão"
                  control={
                    <Button size="sm" variant="ghost" className="rounded-full text-[var(--negative)]" onClick={signOut}>
                      <LogOut className="h-3.5 w-3.5" /> Sair
                    </Button>
                  }
                />
              </SettingsPanel>
            </SettingsSection>
          )}

          {/* ---------------- DADOS ---------------- */}
          {section === "dados" && (
            <SettingsSection title="Dados">
              <SettingsPanel>
                <SettingsRow
                  label="Exportar"
                  hint="Baixa um JSON com contas, lançamentos, dívidas, eventos e lembretes carregados."
                  control={
                    <Button size="sm" variant="soft" className="rounded-full" onClick={exportData}>
                      <Download className="h-3.5 w-3.5" /> Exportar
                    </Button>
                  }
                />
                <SettingsRow
                  label="Onde os dados vivem"
                  hint={
                    isDemo
                      ? "Modo demonstração: tudo em localStorage, neste navegador. Nada sai do dispositivo."
                      : "Modo Supabase: o servidor é a fonte da verdade e o cache local é limpo a cada sessão."
                  }
                />
              </SettingsPanel>
            </SettingsSection>
          )}

          {/* ---------------- AUDITORIA ---------------- */}
          {section === "auditoria" && (
            <SettingsSection title="Segurança e dados">
              <SettingsPanel>
                <SettingsLinkRow
                  href="/configuracoes/auditoria"
                  label="Registro de auditoria"
                  hint="Tudo que foi criado, editado ou excluído, com origem e horário."
                  icon={<ScrollText className="h-4 w-4" />}
                />
              </SettingsPanel>
              <p className="text-[12px] text-[var(--muted-foreground)]">
                O registro é imutável: só as funções do servidor escrevem nele, e a interface não oferece edição nem
                exclusão.
              </p>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
}
