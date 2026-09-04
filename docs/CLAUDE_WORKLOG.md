# RISE — worklog do agente

Arquivo operacional de continuidade. Se a sessão for interrompida, a próxima
lê `CLAUDE.md`, `AGENTS.md` e este arquivo, e retoma pelo `CURRENT` / `NEXT`.

---

## STATUS

`READY_FOR_BUILD` — lote de revisão de produto (visual + funcional) concluído
e revisado. `.claude-done` criado.

Significado, conforme o protocolo em `CLAUDE.md`: as alterações terminaram e o
lote está pronto para **validação automática**. Não significa que o build já
tenha sido executado — quem roda `npm run build` é o watcher local, e o
`git add/commit/push` só acontece se o build passar.

---

## DONE

### Lote anterior (preflight + Fase 3.4) — preservado, não refazer
- migration `010_finance_rls_and_rpc_cleanup.sql` (RLS de finanças SELECT-own, drop do overload de `create_account_with_audit`, nova `create_category_with_audit`)
- migration `011_reminders.sql` (colunas, RLS, RPCs auditadas, `next_reminder_due`)
- módulo Lembretes completo: types, validators, store, service, APIs, `ReminderDialog`, página
- `lib/timezone.ts` com helpers de dia civil SP; removidos os 8 hacks de dupla conversão
- `eventPatchSchema`; calendário com save assíncrono real
- validators de finanças: defaults só nos schemas de criação
- `debtStore.upsertPayment` deduplicado por id

### Bloco 1 — Sistema de temas dark-only  ✅
- `globals.css` reescrito. Tema claro **removido** (`frost` deletado). Sem
  `prefers-color-scheme`, sem `color-scheme: light`. 8 presets dark:
  onyx, blurple, ocean, forest, emerald, amethyst, crimson, chroma.
- Cada tema define o conjunto completo: background / sidebar / card / card-soft /
  elevated / border / foreground / muted / faint / accent / accent-strong /
  accent-soft / selection / glow / ambient 1-3 / chart 1-5 / positive-negative-warning.
- `lib/themes.ts`: registro + `buildCustomTheme()`. O tema **Personalizado** é dark
  por construção — a luminosidade da base é fixa, o usuário controla só matiz/acento,
  então é impossível virar claro.
- `theme-provider.tsx`: presets + personalizado + preview ao vivo + reduced motion +
  densidade, tudo persistido em localStorage.
- `ThemeSwitcher`: mini-preview que reproduz a estrutura real do app (sidebar +
  card + acento + ambiente), popover no desktop e bottom sheet no mobile.
- Utilitários CSS novos: `.rise-rotating-border` (conic-gradient + mask, com
  `@property`), `.rise-spotlight`, `.tnum`, `.no-scrollbar`, bloco de
  `prefers-reduced-motion` e `[data-motion="reduced"]`.
- Marca: `RiseMark` / `RiseBadge` / `RiseLogo` — o triângulo ascendente do favicon.
  Badge "Privado" removido da sidebar. Removido o bloco falso "3º ano · 72%".
- `next.config.ts`: `devIndicators: false` (opção oficial da v16 — confirmada na
  documentação; nada de esconder DOM do Next com CSS).
- PWA: ícones 192/512/apple-touch/maskable gerados a partir do símbolo,
  `public/manifest.json` reescrito, metadata + `colorScheme: "dark"` no layout raiz.

### Bloco 2 — Login premium  ✅
- `SpotlightSurface`: luz radial que segue o cursor via CSS custom properties +
  um único rAF, sem setState (mover o mouse não re-renderiza React). Desativada
  em `pointer: coarse` e com movimento reduzido.
- `LoginSuccess`: quatro pontos orbitando convergem, cor migra para verde e
  forma o check (~900ms). Com movimento reduzido, mostra o estado final direto.
- Página de login reescrita: composição assimétrica no desktop (marca em escala
  como elemento gráfico), empilhada no mobile; borda giratória **só** no CTA
  principal; erro tratado com mensagem humana; link morto "Esqueci minha senha"
  removido (recuperação é feita pelo painel do Supabase, documentado no SETUP).

### Bloco 3 — Dashboard real e reordenável  ✅
- **Todo dado financeiro falso foi removido.** `demoFinance`, `demoAgendaToday`,
  `demoSchool`, `demoAccounts`, `demoDebts`, `demoEvents` não existem mais.
  Sem lançamentos, o painel mostra R$ 0,00 e estados vazios.
- `lib/fixtures.ts` virou `seedDemoData()`: só roda por ação explícita
  ("Carregar dados de demonstração"), só em modo Demo, e cria tudo pelos
  services reais.
- `lib/finance/analytics.ts`: fonte única de cálculo (mês civil SP, categorias,
  série diária, maior gasto, média, comparação mês a mês, saldo por conta).
- Gráficos próprios em SVG (não há Recharts instalado): `Sparkline` com
  crosshair + tooltip, `CategoryBars` com rótulo direto, `DeltaChip` com
  ícone + texto (cor nunca é o único portador de significado).
- Paleta categórica `--chart-1..5` por tema, **validada** pelo validador do
  skill dataviz nos 6 checks (banda de luminosidade, croma, separação para
  daltonismo, piso de visão normal, contraste) contra a superfície de cada tema.
- "Editar painel": reordenar arrastando (Reorder do framer-motion), ocultar,
  alternar largura e restaurar padrão. Layout persistido por dispositivo.

### Bloco 4 — Calendário redesenhado  ✅
- Mês: dias vizinhos reais e atenuados (sem buracos), hoje e selecionado
  distintos, chips com barra de categoria (título mantém contraste total),
  "+N" abre o dia em vez de criar evento, criação por duplo clique.
- Semana: 24h roláveis, faixa de dia inteiro separada, **linha de agora**,
  eventos posicionados por minuto com divisão de faixas quando há sobreposição
  — nenhum evento fora do horário comercial se perde.
- Dia: timeline própria com a mesma lógica. Agenda: só hoje em diante,
  agrupada por data, com selo "Hoje".
- Mobile: grade compacta com pontinhos + lista do dia selecionado embaixo;
  "Semana" fica só no desktop; bottom sheet com safe-area.
- `EventDialog` recebe `initialTime`, então clicar numa faixa de hora já abre
  o formulário naquele horário.

### Bloco 5 — Logos de instituições  ✅
- `registry.ts` reescrito: 23 instituições (Inter, Nubank, Mercado Pago, BB,
  Itaú, Bradesco, Santander, Caixa, C6, PicPay, PagBank, Neon, Will, Next, BTG,
  XP, Sicoob, Sicredi, Pan, Safra, Original, Wise, Nomad) com domínio, cor e
  aliases. Casamento por **palavra inteira** — o antigo casava substring e
  "Conta" podia virar outra marca.
- `BrandLogo`: cache de módulo + dedupe de requisições em voo; cascata
  Brandfetch → Logo.dev (`theme=dark`) → monograma com a cor da marca.
  Nunca imagem quebrada, nunca ícone genérico para banco conhecido.
- `AccountPicker` novo: `<select>` não aceita imagem em `<option>`, então a
  escolha de conta virou faixa de chips com logo + nome — usada em
  TransactionDialog e PaymentDialog.
- `AccountTile` com rótulo de tipo em português e saldo negativo destacado.

### Bloco 6 — Configurações reestruturadas  ✅
- migration `012_settings.sql`: o CHECK antigo de `user_settings.theme` (nomes
  `midnight`/`frost`) rejeitaria os temas novos — foi substituído. Colunas novas:
  `custom_theme jsonb`, `ambient_intensity`, `reduced_motion`, `dashboard jsonb`.
- RPC `save_user_settings(p_patch jsonb)` — **sem auditoria por decisão
  explícita**, documentada no cabeçalho da migration: sliders de aparência
  gerariam centenas de linhas em `audit_logs` por sessão.
- Página `/configuracoes` reorganizada em seções reais (Conta, Aparência,
  Painel, Notificações, Integrações, Dados, Auditoria) em vez de lista plana.
- `CustomThemeEditor`: matiz + acento com preview ao vivo. A base escura é
  estrutural, o usuário não consegue produzir um tema claro.
- `/api/settings/integrations` responde apenas **booleanos** (`has(...)`) —
  nunca o valor da chave. Nenhum secret chega ao browser.

### Bloco 7 — Auditoria com UI real  ✅
- `lib/audit/presentation.ts`: mapa de ícones Lucide por entidade, refinado
  pelo verbo; `auditTone`; `auditChanges` (diff legível com `HIDDEN_FIELDS`);
  `formatAuditValue` (BRL e datas formatadas em SP); `auditSummary`.
- Página `/configuracoes/auditoria`: filtros por entidade/ação/período,
  paginação, diff expansível. Campos sensíveis nunca são exibidos.
- `audit_logs` continua imutável para o cliente (só `SELECT`).

### Bloco 8 — Notification Center  ✅
- `lib/notifications.ts`: as notificações são **derivadas a cada render** dos
  dados reais (lembretes atrasados/hoje, atividades escolares, dívidas
  vencendo, eventos do dia), com ids estáveis (`reminder-overdue-<id>`).
- `notificationStore` persiste **apenas** o estado de lido/dispensado. Não há
  fila falsa nem contador inventado — zero notificações mostra zero.
- Sino no `HeaderBar` com contagem real e agrupamento por urgência.

### Bloco 9 — Importantes  ✅
- migration `013_important_items.sql`: tabela + RLS + RPCs auditadas
  (`create/update/toggle_pin/archive_important_with_audit`).
- A auditoria guarda **só** título, tag e estado de fixado — **nunca o
  conteúdo**. Está escrito no cabeçalho da migration.
- O cabeçalho traz também o aviso de que **não é gerenciador de senhas**:
  o conteúdo é texto simples no banco, sem criptografia ponta a ponta. O mesmo
  aviso aparece na UI e no `SETUP.md`.
- Página `/importantes`: fixados no topo, busca, tags, arquivamento.
  Link na Sidebar só foi adicionado **depois** que a rota passou a existir
  (`typedRoutes: true` quebra o build com href inexistente).

### Bloco 10 — Escola de verdade  ✅
- migration `014_school.sql`: o CHECK de status vira
  `not_started | in_progress | done | archived` — o `overdue` **persistido**
  foi removido, porque "atrasada" é função do relógio, não do dado. Colunas
  `completed_at` e `notes`; RLS nas três tabelas; `ensure_school_workspace`;
  `create/update_school_task_with_audit` (resolve matéria por nome, como as
  categorias de transação).
- `archive_school_workspaces_if_due` reescrita com CTE: a versão anterior
  gravava a mesma linha de auditoria duas vezes.
- Página `/escola` com abas (Atrasadas / Hoje / Próximas / Sem data /
  Concluídas / Arquivadas), contadores contados dos dados e ações de fluxo
  (começar, concluir, reabrir, arquivar).
- `PATCH /api/escola/[id]` relê a linha com `subject:school_subjects(name)` —
  o retorno da RPC não tem o join, e patches sem `subject` apagavam a matéria.

### Bloco 11 — Resumos mensais  ✅
- `/resumos` deixou de ser placeholder (1 KB) e passou a calcular tudo de
  `lib/finance/analytics.ts` + stores: saiu no mês, entrou, sobrou, média por
  dia, série diária, categorias, maior gasto, dia de maior gasto, conta mais
  usada, dívidas pagas / recebidas, eventos, lembretes e atividades concluídos.
- Navegação por mês com bloqueio de meses futuros.
- `pctChange` devolve `null` quando não há base de comparação — a UI mostra
  "—", nunca um "+100%" inventado.
- Estado vazio honesto quando o mês não tem nada registrado.

### Limpeza final e consistência  ✅
- **Contrato único de diálogo** aplicado aos 7 diálogos (Transaction, Debt,
  Account, Payment, Reminder, Event, Important, SchoolTask, QuickAdd):
  guarda contra duplo submit, `onSave` **deve** rejeitar em caso de falha,
  o diálogo só fecha no sucesso, o erro fica visível no formulário. Todos os
  pais fazem `throw e` depois do toast de erro.
- Cores literais trocadas por tokens: `text-red-600` → `text-[var(--negative)]`,
  `text-emerald-600` → `text-[var(--positive)]`; superfícies de diálogo em
  `--elevated`; overlays em `bg-black/50`; raios de canto padronizados.
- Nenhum emoji usado como iconografia de produto — só ícones Lucide.
- `SETUP.md` escrito (11 seções, do modo Demo ao deploy no Netlify).

---

## CURRENT

Nada em andamento. Lote fechado.

---

## NEXT (próxima sessão — nada disto é bloqueante)

1. Aplicar as migrations 010→014 no Supabase (ordem numérica) — ver `SETUP.md`.
2. `git rm` dos dois itens listados abaixo (não consigo apagar arquivo pela ponte).
3. Tornar o repositório **privado** e rotacionar chaves que já tenham ido ao Git.
4. Depois do primeiro build verde: revisar responsividade real em dispositivo.
5. Twilio/WhatsApp continua **não implementado** — as variáveis existem no
   `.env.example` mas não há código consumindo. Está dito no `SETUP.md`.

---

## FILES IMPORTANTES

- `src/app/globals.css` — todos os tokens de tema
- `src/lib/themes.ts` — registro de temas + `buildCustomTheme`
- `src/components/theme-provider.tsx` — estado de aparência
- `src/lib/timezone.ts` — **único** lugar com lógica de dia civil SP
- `src/lib/finance/analytics.ts` — **único** lugar com cálculo financeiro
- `src/lib/notifications.ts` — notificações derivadas, nunca persistidas
- `src/lib/store/*` — Zustand, `demoStorage` desliga persistência em modo Supabase
- `src/lib/services/*` — decidem Demo vs API
- `src/app/api/**` — validam com Zod e chamam RPC

## MIGRATIONS CRIADAS NESTE CICLO

- `010_finance_rls_and_rpc_cleanup.sql`
- `011_reminders.sql`
- `012_settings.sql`
- `013_important_items.sql`
- `014_school.sql`

Nenhuma migration antiga (001–009) foi editada.

## VERIFICAÇÃO FEITA (sem shell no notebook)

- parse com esbuild de **todos** os 129 arquivos `.ts`/`.tsx` de `src/` — ok
- resolução programática de imports/exports (`@/` e relativos) — ok
- varredura de imports não utilizados — nenhum
- testes de lógica isolados de `timezone.ts` sob vários valores de `TZ`
- varredura de secrets em `src/ supabase/ public/ *.ts *.json *.md docs/` —
  nenhum valor literal; só nomes de variável de ambiente
- `.env.example` sem valores; `.gitignore` cobre `.env*` com `!.env.example`
- sem `console.log`, sem `TODO`, sem `localhost:3000` (a porta do projeto é 5173)

## RISCOS / PENDÊNCIAS

- `npm run build`, `tsc --noEmit` e `next lint` **não foram executados** —
  não há shell no notebook. Quem roda o build é o watcher local, e o commit só
  acontece se ele passar. Se falhar, o erro mais provável é tipagem estrita em
  arquivo novo.
- As migrations 012–014 **precisam ser aplicadas** antes de usar Configurações
  (persistência no servidor), Importantes e Escola em modo Supabase. Em modo
  Demo tudo funciona sem banco.
- Importantes guarda texto simples. **Não é gerenciador de senhas** e não há
  criptografia ponta a ponta — documentado na migration, na UI e no `SETUP.md`.
- Twilio/WhatsApp: variáveis existem, implementação não.
- Repositório já esteve público: trocar para privado e rotacionar chaves.

## A REMOVER COM `git rm` (não consigo apagar arquivo pela ponte)

- `src/components/rise/Agenda.tsx` — substituído pelos widgets do painel.
  Confirmado sem nenhum import no projeto: é código morto.
- `.preflight/` — pasta de verificação manual, redundante agora que o watcher
  roda o build.
