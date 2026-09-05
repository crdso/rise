@AGENTS.md

# RISE — protocolo de conclusão

OpenCode é responsável por concluir cada lote de trabalho.

## Fluxo obrigatório

1. Revisar `git status`, o diff e o histórico remoto antes do staging.
2. Preservar alterações existentes; nunca usar `reset`, `checkout` ou `revert` sem solicitação explícita.
3. Executar `tsc --noEmit` e `npm run build`; corrigir qualquer falha antes de continuar.
4. Garantir que `.env.local`, tokens, cookies, logs, credenciais e chaves de provedores não entrem no staged diff.
5. Executar `git add -A`, revisar o staged diff, criar um commit coerente e fazer `git push origin main`.
6. Manter o servidor de desenvolvimento em `localhost:5173` oculto, usando `scripts/start-rise-dev-hidden.ps1` quando necessário.

## Segurança

- `.env.example` pode ser versionado somente com placeholders ou valores vazios.
- Nunca versionar `OPENAI_API_KEY`, `SUPABASE_SECRET_KEY`, tokens de Brandfetch/Logo.dev, credenciais Twilio ou cookies.
- Não registrar valores de secrets em logs, commits ou relatórios.

`.claude-done` e watchers de commit não fazem parte do fluxo atual.
