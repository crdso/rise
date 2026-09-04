<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# RISE — protocolo de checkpoint (versão curta)

O agente não roda `git` nem `npm` neste projeto. Um **watcher local** faz isso.

Ao concluir um lote de trabalho e revisá-lo, crie o arquivo `.claude-done` na raiz do
repositório contendo **apenas a mensagem de commit**:

```
feat: implement reminders module
```

`.claude-done` quer dizer *"terminei minhas alterações e considero este lote pronto para
validação automática"* — **não** quer dizer que o build já rodou. O watcher é quem roda
`npm run build` e só faz `git add` / `commit` / `push` **se o build passar**; se falhar,
não commita nada.

Regras: não crie o arquivo enquanto ainda estiver trabalhando; um sinal por lote (não por
arquivo); nunca coloque secrets nele; alterar só `CLAUDE.md` / `AGENTS.md` não justifica um
sinal. Se o build falhar, corrija e sinalize de novo.

A versão completa deste protocolo está em `CLAUDE.md`.
