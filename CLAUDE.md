@AGENTS.md

# RISE — protocolo de checkpoint

Este repositório usa um **watcher local** para transformar o trabalho de um agente
em commit. O agente não roda `git` nem `npm` — ele sinaliza, o watcher executa.

## O sinal

Quando um lote de trabalho estiver pronto para validação, crie o arquivo:

```
.claude-done
```

Conteúdo: **apenas a mensagem de commit**, nada mais.

```
feat: implement reminders module
```

## O que o sinal significa

`.claude-done` significa exatamente isto:

> "Terminei minhas alterações e considero este lote pronto para validação automática."

E **não** significa:

> ~~"O build já foi executado e passou."~~

O agente não precisa (e normalmente não consegue) rodar o build antes de sinalizar.
Quem valida é o watcher.

## Divisão de responsabilidades

**Agente:**

1. termina a implementação;
2. revisa os arquivos alterados e o estado lógico da tarefa;
3. se considerar o lote pronto para validação, cria `.claude-done` com a mensagem de commit.

**Watcher local:**

4. detecta `.claude-done`;
5. roda `npm run build`;
6. só faz `git add` / `commit` / `push` **se o build passar**;
7. se o build falhar, não commita e não faz push.

## Regras

- **Não** crie `.claude-done` enquanto ainda estiver trabalhando. Ele é o último passo,
  depois da revisão — nunca no meio de uma implementação parcial.
- **Um lote por sinal.** Se a tarefa tem várias fases, sinalize quando o lote inteiro
  estiver concluído, não a cada arquivo.
- **Nunca coloque secrets** no `.claude-done` — nem chaves, nem tokens, nem URLs com
  credencial. É só a mensagem de commit.
- Alterações apenas em `CLAUDE.md` / `AGENTS.md` não justificam um sinal por si só.
- Se o watcher reportar falha de build, corrija e sinalize de novo.

## Mensagem de commit

Uma linha de assunto no imperativo (`feat:`, `fix:`, `refactor:`, `chore:`), opcionalmente
seguida de corpo explicando o porquê. Descreva o lote inteiro, não o último arquivo tocado.
