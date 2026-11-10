---
name: mve-calendar-optimizer
description: Propor blocos na agenda do Minha Vida Extraordinária para as metas do ciclo que mais precisam (menor progresso real), usando os horários livres e os hábitos que pedem tempo (treino, estudo PRF). Cria compromissos somente com aprovação. Use quando a pessoa pedir para organizar ou otimizar a agenda, encaixar treino ou estudo, ou "achar tempo" para uma meta.
---

# /mve-calendar-optimizer · Agenda a favor das metas

Encontra horários livres na agenda e propõe blocos para as metas com menor progresso real: a próxima ação aberta de cada meta e os hábitos de agenda (com `blockMinutes`, como Treino e Bloco de estudos PRF) que estão abaixo de 70% de constância. Nada entra na agenda sem aprovação.

Adaptado da skill `calendar-optimizer` do projeto [me-os](https://github.com/stephencweiss/me-os) (MIT). No MVE os compromissos são `CalendarEvent` do próprio sistema; a sincronização com o Google Calendar ainda não existe.

## Regras do MVE (obrigatórias)
- A ordem vem do progresso real (`goalProgress`), nunca de uma prioridade inventada.
- Um compromisso é um plano. Criar o bloco não registra que ele aconteceu.
- Nunca grave sem confirmação. Mostre a proposta, pergunte, e só então crie.
- Respeite descanso: por padrão só entre 7h e 22h, com 15 minutos de pausa entre blocos. Se a pessoa pedir outro horário, use `--from` e `--to`.
- pt-BR, tom acolhedor. Nunca use travessão longo.

## Comandos
```bash
npx tsx scripts/mve.ts optimize                          # próximos 7 dias, 7h às 22h, até 6 blocos
npx tsx scripts/mve.ts optimize --days=3 --from=6 --to=21 --max=4
npx tsx scripts/mve.ts add-event --title="..." --start=YYYY-MM-DDTHH:mm --minutes=50 [--area=<id>] [--project=<id>]
```
O `optimize` já imprime, para cada proposta, o comando `add-event` exato.

## Fluxo padrão (`/mve-calendar-optimizer`)
1. Pergunte, em uma linha, se há alguma restrição desta semana (ex.: "quinta à noite não posso"). Se houver, ajuste com `--days`, `--from`, `--to` ou descarte as propostas que colidirem.
2. Rode `optimize` e mostre a tabela com o motivo de cada bloco.
3. Pergunte: `Criar quais blocos? [todos / números / nenhum]`.
4. Para cada bloco aprovado, rode o `add-event` correspondente. Se a pessoa mudar o horário, ajuste `--start` antes de rodar.
5. Confirme o que foi criado e lembre que os blocos aparecem na Agenda e na Central.

## Status (`/mve-calendar-optimizer status`)
Rode `npx tsx scripts/mve.ts goals` e mostre, por meta, quantos blocos e ações a semana já tem.
