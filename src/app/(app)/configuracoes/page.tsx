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

const SECTION_GROUPS: Array<{ label: string; items: Array<{ id: SectionId; label: string; icon: typeof Palette }> }> = [
  { label: "Personalização", items: [{ id: "aparencia", label: "Aparência", icon: Palette }, { id: "painel", label: "Painel", icon: LayoutGrid }] },
  { label: "Organização", items: [{ id: "financas", label: "Finanças", icon: Wallet }, { id: "escola", label: "Escola", icon: GraduationCap }, { id: "lembretes", label: "Lembretes", icon: Bell }, { id: "notificacoes", label: "Notificações", icon: Bell }] },
  { label: "Inteligência e conexões", items: [{ id: "assistente", label: "Assistente", icon: Bot }, { id: "integracoes", label: "Integrações", icon: Plug }] },
  { label: "Privacidade e segurança", items: [{ id: "seguranca", label: "Segurança", icon: Shield }, { id: "dados", label: "Dados", icon: Database }] },
  { label: "Atividade", items: [{ id: "auditoria", label: "Auditoria", icon: ScrollText }] },
];

type Integrations = {
  supabase: boolean;
  supabaseSecretKey: boolean;
  brandfetch: boolean;
  logodev: boolean;
  openai: boolean;
  gemini: boolean;
  twilio: boolean;
};
type AssistantMetrics = { provider: string; model: string; today: number; month: number; successRate: number | null; averageLatency: number | null; lastUsedAt: string | null };

export default function ConfiguracoesPage() {
  const [section, setSection] = useState<SectionId>("aparencia");
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [assistantMetrics, setAssistantMetrics] = useState<AssistantMetrics | null>(null);
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

  useEffect(() => {
    fetch("/api/settings/assistant").then((r) => (r.ok ? r.json() : null)).then((j) => j?.data && setAssistantMetrics(j.data as AssistantMetrics)).catch(() => {});
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
      if (!supabase) {
        push({ title: "Não foi possível encerrar a sessão" });
        return;
      }
      const { error } = await supabase.auth.signOut();
      if (error) {
        push({ title: "Não foi possível encerrar a sessão" });
        return;
      }
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
            <div className="flex lg:flex-col gap-4 lg:gap-3 min-w-max lg:min-w-0">
              {SECTION_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--faint)]">{group.label}</p>
                  {group.items.map((s) => {
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
              ))}
            </div>
          </div>
        </nav>

        <div className="mt-5 lg:mt-0 space-y-6 max-w-[680px]">
          {/* ---------------- APARÊNCIA ---------------- */}
          {section === "aparencia" && (
            <>
              <SettingsSection title="Tema" description="Escolha o visual do RISE.">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {themeOrder.map((id) => {
                    const active = theme === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setTheme(id)}
                        aria-pressed={active}
                          className={`relative rounded-xl border p-2 text-left transition-all ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]"
                        }`}
                      >
                        <ThemePreview preview={themes[id].preview} height={70} />
                        {active && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm"><Check className="h-3 w-3" /></span>}
                        <div className="mt-2 flex items-center justify-between gap-1">
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold truncate">{themes[id].label}</p>
                            <p className="mt-0.5 text-[10.5px] leading-tight text-[var(--muted-foreground)] truncate">{themes[id].desc}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SettingsSection>

              <SettingsSection title="Tema personalizado" description="Crie seu gradiente.">
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
                  hint="Aparecem quando passam do vencimento."
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
              description="Escolha o que aparece no sino."
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
            <SettingsSection title="Assistente" description="Resumo do uso no Adicionar rápido.">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Modelo ativo", assistantMetrics?.model ?? "Carregando"], ["Provedor", assistantMetrics?.provider ?? ""],
                  ["Uso hoje", `${assistantMetrics?.today ?? 0} interpretações`], ["Uso este mês", `${assistantMetrics?.month ?? 0} interpretações`],
                  ["Taxa de sucesso", assistantMetrics?.successRate == null ? "Sem dados" : `${assistantMetrics.successRate}%`], ["Tempo médio", assistantMetrics?.averageLatency == null ? "Sem dados" : `${(assistantMetrics.averageLatency / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`],
                ].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3"><p className="text-[10.5px] uppercase tracking-[0.07em] text-[var(--faint)]">{label}</p><p className="mt-1 text-[13px] font-semibold truncate">{value}</p></div>)}
              </div>
              <p className="text-[12px] text-[var(--muted-foreground)]">{assistantMetrics?.lastUsedAt ? `Última utilização: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(assistantMetrics.lastUsedAt))}` : "Ainda não houve interpretações."}</p>
            </SettingsSection>
          )}

          {/* ---------------- INTEGRAÇÕES ---------------- */}
          {section === "integracoes" && (
            <SettingsSection title="Integrações" description="Serviços conectados ao RISE.">
              <SettingsPanel>
                <SettingsRow
                  label="Supabase"
                  hint="Banco, autenticação e RPCs"
                  control={<StatusPill ok={!!integrations?.supabase} okLabel="Conectado" offLabel="Modo demonstração" />}
                />
                <SettingsRow
                  label="Recursos avançados"
                  hint="Auditoria e automações"
                  control={<StatusPill ok={!!integrations?.supabaseSecretKey} okLabel="Configurada" offLabel="Ausente" />}
                />
                <SettingsRow
                  label="Brandfetch"
                  hint="Logos de instituições"
                  control={<StatusPill ok={!!integrations?.brandfetch} okLabel="Configurado" offLabel="Não configurado" />}
                />
                <SettingsRow
                  label="Logo.dev"
                  hint="Logos de instituições"
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
                      ? "Explore o RISE sem entrar."
                      : "Acesso por e-mail e senha."
                  }
                  control={<StatusPill ok={!isDemo} okLabel="Autenticado" offLabel="Demonstração" />}
                />
                <SettingsRow
                  label="Sua conta"
                  hint="Seus dados ficam disponíveis apenas para sua sessão."
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
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  );
}
