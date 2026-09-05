# RISE — guia de configuração

Guia do começo ao fim para colocar o RISE no ar. Siga na ordem; cada etapa
funciona sozinha, então dá para parar no meio e continuar depois.

**Nenhum token real aparece neste arquivo.** Onde houver `SEU_VALOR_AQUI`,
substitua no seu `.env.local` — que nunca vai para o Git.

---

## Índice

1. [Antes de começar](#1-antes-de-começar)
2. [Rodar localmente sem nada configurado](#2-rodar-localmente-sem-nada-configurado)
3. [Supabase](#3-supabase)
4. [Logos das instituições](#4-logos-das-instituições)
5. [Assistente de IA (opcional)](#5-assistente-de-ia-opcional)
6. [WhatsApp / Twilio (ainda não implementado)](#6-whatsapp--twilio-ainda-não-implementado)
7. [Deploy na Netlify](#7-deploy-na-netlify)
8. [GitHub e segurança](#8-github-e-segurança)
9. [PWA](#9-pwa)
10. [Quais variáveis são segredo](#10-quais-variáveis-são-segredo)
11. [Checklist final](#11-checklist-final)

---

## 1. Antes de começar

Você precisa de: **Node.js 20 ou superior**, **npm** e uma conta no **Supabase**
(o plano gratuito basta). Para publicar, também uma conta na **Netlify**.

```bash
cd C:\Users\gebt\Downloads\Ezequias\rise
npm install
```

O projeto é **Next.js 16 com App Router**. Não migre para Vite: autenticação,
rotas de API, RPCs e auditoria dependem do servidor do Next.

---

## 2. Rodar localmente sem nada configurado

O RISE funciona sem Supabase. Sem as variáveis do banco ele entra em **modo
demonstração**: tudo fica no `localStorage` do navegador e nada sai do
dispositivo.

```bash
npm run dev
# http://localhost:5173
```

No login, qualquer e-mail e senha entram. O painel começa **vazio** — sem
nenhum valor inventado. Se quiser ver a interface com dados, use o botão
**"Carregar dados de demonstração"** na tela inicial. Isso nunca acontece
sozinho, e não funciona quando o Supabase está configurado.

---

## 3. Supabase

### 3.1 Criar o projeto

1. Acesse <https://supabase.com> → **New project**.
2. Escolha a região mais próxima (South America / São Paulo).
3. Guarde a senha do banco que ele pedir — ela **não** vai para o `.env`.

### 3.2 Pegar as chaves

Em **Project Settings → API**:

| Onde aparece | Vai para | É segredo? |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Não |
| Publishable key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Não (é pública por design; quem protege é a RLS) |
| Secret key | `SUPABASE_SECRET_KEY` | **SIM — nunca no navegador** |

Crie `.env.local` na raiz do projeto:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SEU_VALOR_AQUI
SUPABASE_SECRET_KEY=SEU_VALOR_AQUI
NEXT_PUBLIC_APP_URL=http://localhost:5173
```

> A chave secreta ignora a RLS. Ela só é lida por código de servidor
> (`src/lib/supabase/admin.ts`). Se ela aparecer em qualquer variável começando
> com `NEXT_PUBLIC_`, está errado.

> Em projetos legados, o RISE aceita temporariamente
> `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` como fallback.
> Em novos projetos, use somente as chaves publishable e secret acima.

### 3.3 Aplicar as migrations

No painel do Supabase, **SQL Editor**, cole e execute **na ordem**, uma de cada vez:

```
supabase/migrations/001_initial.sql
supabase/migrations/002_fix_audit_and_timezone.sql
supabase/migrations/003_finance_atomic_operations.sql
supabase/migrations/004_finance_security_and_sync.sql
supabase/migrations/005_debts_and_payments.sql
supabase/migrations/006_brands.sql
supabase/migrations/007_debt_integrity.sql
supabase/migrations/008_debt_final_hardening.sql
supabase/migrations/009_calendar.sql
supabase/migrations/010_finance_rls_and_rpc_cleanup.sql
supabase/migrations/011_reminders.sql
supabase/migrations/012_settings.sql
supabase/migrations/013_important_items.sql
supabase/migrations/014_school.sql
```

A ordem importa: a 010 endurece a RLS de finanças e depende das RPCs criadas
antes dela; a 012 corrige o `CHECK` de tema (os nomes antigos não existem mais);
a 014 depende das tabelas de escola da 001.

Se preferir a CLI:

```bash
npx supabase link --project-ref SEU_REF
npx supabase db push
```

### 3.4 Criar o seu usuário

Não existe cadastro público — é proposital, o RISE é de uso pessoal.

1. **Authentication → Users → Add user → Create new user**.
2. Informe e-mail e senha e marque **Auto Confirm User**.

### 3.5 Desativar o cadastro público

**Authentication → Providers → Email**: desligue **Enable signup**. Assim
ninguém cria conta no seu projeto mesmo conhecendo a URL.

### 3.6 Como testar se ficou certo

Com `npm run dev` rodando e logado:

- **Leitura:** a tela inicial carrega sem erro no console.
- **Escrita bloqueada:** no console do navegador,
  ```js
  const { createClient } = await import("@supabase/supabase-js");
  // usando a anon key, tente inserir direto:
  // deve falhar com "new row violates row-level security policy"
  ```
  Inserção direta em `transactions`, `accounts`, `events`, `reminders`,
  `debts`, `important_items` e `school_tasks` **tem que falhar**. Toda escrita
  passa por RPC.
- **Escrita permitida:** criar um gasto pela interface funciona e aparece em
  **Configurações → Auditoria**.
- **Auditoria:** cada criação, edição e exclusão gera uma linha.

### 3.7 Storage

O RISE **não usa Supabase Storage** nesta versão. Não precisa criar bucket.

---

## 4. Logos das instituições

Duas fontes, em cascata: **Brandfetch** (melhor qualidade) e **Logo.dev**
(cobertura). Se as duas falharem, aparece um monograma com a cor da marca —
nunca uma imagem quebrada nem um ícone genérico de banco.

O app funciona sem nenhuma das duas: só cai direto no monograma.

### Brandfetch (chave de servidor)

1. <https://developers.brandfetch.com> → crie uma conta.
2. Pegue a **API key**.
3. No `.env.local`:
   ```bash
   BRANDFETCH_SECRET_API_KEY=SEU_VALOR_AQUI
   ```

**É segredo.** Fica só no servidor (`src/lib/brands/brandfetch.ts` tem
`import "server-only"`), e o navegador só conversa com `/api/brands/[domain]`.

### Logo.dev (token público)

1. <https://logo.dev> → crie uma conta.
2. Pegue o **publishable token**.
3. No `.env.local`:
   ```bash
   NEXT_PUBLIC_LOGO_DEV_TOKEN=SEU_VALOR_AQUI
   ```

Este é **público por design** — vai na URL da imagem. Use o token
*publishable*, nunca o secreto.

---

## 5. Assistente de IA (opcional)

Hoje o "Adicionar com IA" do Adicionar rápido usa um interpretador **local de
demonstração** (`src/lib/ai/mock-provider.ts`). Nenhuma chamada externa é feita
e nenhuma chave é necessária.

Quando um provedor real for ligado, a chave vai para o servidor:

```bash
OPENAI_API_KEY=SEU_VALOR_AQUI
# ou
GEMINI_API_KEY=SEU_VALOR_AQUI
```

**São segredos.** Nunca com prefixo `NEXT_PUBLIC_`. A cobrança é separada da do
Supabase e da Netlify. Em **Configurações → Assistente** dá para ver se alguma
chave está configurada (sem exibir valor).

---

## 6. WhatsApp / Twilio (ainda não implementado)

As variáveis existem no `.env.example`, mas **não há integração ativa** nesta
versão: não existe webhook nem envio de mensagem. Pode deixar tudo em branco.

Quando for implementar, `TWILIO_ACCOUNT_SID` e `TWILIO_AUTH_TOKEN` são
**segredos de servidor**.

---

## 7. Deploy na Netlify

A Netlify detecta Next.js 16 sozinha e usa o adaptador OpenNext. **Não é
necessário `netlify.toml`** — por isso o projeto não tem um. Criar um arquivo
desatualizado só atrapalharia.

1. **Add new site → Import an existing project** e conecte o repositório.
2. Confirme o que ela detectar:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. **Site configuration → Environment variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | a mesma do `.env.local` |
    | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | a mesma do `.env.local` |
    | `SUPABASE_SECRET_KEY` | a mesma — marque como secreta |
   | `BRANDFETCH_SECRET_API_KEY` | se usar — marque como secreta |
   | `NEXT_PUBLIC_LOGO_DEV_TOKEN` | se usar |
   | `NEXT_PUBLIC_APP_URL` | `https://SEU-SITE.netlify.app` |

   > `NEXT_PUBLIC_APP_URL` é o único valor que **muda** entre local e produção.
   > Em desenvolvimento é `http://localhost:5173`.

4. **Deploy site.**
5. Em **Domain management**, configure o domínio. HTTPS é automático (Let's
   Encrypt) — só espere o certificado ficar pronto.
6. Volte ao Supabase, em **Authentication → URL Configuration**, e adicione a
   URL da Netlify em **Site URL** e **Redirect URLs**. Sem isso o login em
   produção falha.

O `npm run dev` fixa a porta 5173 (`next dev -H 0.0.0.0 -p 5173`); em produção
quem define a porta é a Netlify, então nada aponta para `localhost`.

---

## 8. GitHub e segurança

### Deixe o repositório privado

O `crdso/rise` está público. **Antes de colocar qualquer configuração real,
mude para privado**: Settings → General → Danger Zone → Change visibility.

Mesmo sem segredos no código, um repositório privado evita expor a estrutura do
banco, os nomes das RPCs e a lógica de negócio.

### O que nunca vai para o Git

O `.gitignore` já cobre: ignora `.env*` e mantém apenas o `.env.example`.
Confira antes de commitar:

```bash
git status --short   # nenhum .env.local pode aparecer
```

Se algum segredo já tiver ido para o histórico, **rotacione a chave** no
provedor — apagar o arquivo depois não resolve, o valor continua no histórico.

---

## 9. PWA

Já configurado: `public/manifest.json`, ícones 192/512/maskable, apple touch
icon, `theme-color` escuro, `display: standalone` e safe areas no CSS.

**Não há service worker** — é proposital. Um SW mal configurado serve versão
velha e cache quebrado; com o app dependendo de dados ao vivo, não compensa.

Para instalar no iPhone: abra o site no Safari → Compartilhar → **Adicionar à
Tela de Início**. Teste em 390×844 (iPhone 14/15) com o app instalado, para
validar as safe areas.

---

## 10. Quais variáveis são segredo

| Variável | Segredo? | Onde é lida |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | não | navegador + servidor |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | não | navegador + servidor |
| `SUPABASE_SECRET_KEY` | **sim** | apenas servidor |
| `BRANDFETCH_SECRET_API_KEY` | **sim** | apenas servidor |
| `NEXT_PUBLIC_LOGO_DEV_TOKEN` | não | navegador |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` | **sim** | apenas servidor |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | **sim** | apenas servidor |
| `NEXT_PUBLIC_APP_URL` | não | navegador |

A regra é o prefixo: **tudo que começa com `NEXT_PUBLIC_` vai para o navegador
e é visível para qualquer pessoa.** Se um valor não pode ser visto, ele não
pode ter esse prefixo.

> Os nomes legados `NEXT_PUBLIC_SUPABASE_ANON_KEY` e
> `SUPABASE_SERVICE_ROLE_KEY` são aceitos apenas como fallback temporário.

### Uma observação sobre "Importantes"

O módulo Importantes guarda o conteúdo em **texto puro** no banco. Há RLS por
usuário e TLS em trânsito, mas **não há criptografia de ponta a ponta** — quem
tiver acesso administrativo ao banco consegue ler. Por isso a interface avisa
para não guardar senhas, tokens ou chaves ali. **Não é um gerenciador de
senhas.**

---

## 11. Checklist final

Marque conforme for validando:

**Banco**
- [ ] Migrations 001 → 014 aplicadas, na ordem
- [ ] Usuário criado com Auto Confirm
- [ ] Cadastro público desativado
- [ ] Inserção direta pelo client falha (RLS)
- [ ] Ações pela interface aparecem na Auditoria

**Aplicação**
- [ ] Login entra e a animação de conclusão aparece
- [ ] Contas: criar conta com nome de banco conhecido traz a logo real
- [ ] Transações: criar, editar e excluir
- [ ] Dívidas: parcelamento, pagamento parcial e vencida
- [ ] Calendário: mês, semana, dia e agenda — evento às 23h cai no dia certo
- [ ] Lembretes: recorrência avança e a ocorrência vira histórico
- [ ] Importantes: fixar aparece no painel
- [ ] Escola: criar atividade, concluir, arquivar
- [ ] Resumos: números batem com os lançamentos
- [ ] Sino: mostra vencidos reais e o contador zera ao ler
- [ ] Temas: os 8 presets e o personalizado, nenhum fica claro
- [ ] Painel: reordenar, ocultar e restaurar padrão persistem

**Publicação**
- [ ] Repositório privado
- [ ] `npm run build` passa
- [ ] Variáveis configuradas na Netlify
- [ ] Deploy no ar com HTTPS
- [ ] URL da Netlify autorizada no Supabase Auth
- [ ] Instalado no celular e testado em 390×844

---

## Comandos

```bash
npm run dev     # desenvolvimento em http://localhost:5173
npm run build   # build de produção
npm run start   # servir o build local na 5173
npm run lint    # ESLint
npx tsc --noEmit  # checagem de tipos
```
