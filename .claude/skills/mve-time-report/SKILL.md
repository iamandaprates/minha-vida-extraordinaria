---
name: mve-time-report
description: Relatório de como a semana foi vivida no Minha Vida Extraordinária, a partir de registros reais (sessões de foco, ações concluídas, hábitos checados, compromissos), por área e por dia, com áreas sem movimento. Use quando a pessoa pedir relatório da semana, "como foi minha semana", tempo por área ou comparação entre semanas.
---

# /mve-time-report · Relatório da semana

Mostra como a semana aconteceu de verdade, por área da vida e por dia. Tudo vem de fatos registrados no MVE: sessões de foco (`ExecutionRecord` do tipo `session`), conclusões, check-ins de hábitos e compromissos da agenda.

Adaptado da skill `time-report` do projeto [me-os](https://github.com/stephencweiss/me-os) (MIT). No MVE as categorias são as 12 Áreas da Vida, não as cores do Google Calendar.

## Regras do MVE (obrigatórias)
- Só fatos registrados. Se algo não foi registrado, não aconteceu para o relatório: diga isso com gentileza, sem cobrança.
- Esta skill só lê. Não grava nada.
- pt-BR, tom acolhedor. Nunca use travessão longo: use `·`, `→` ou texto direto.

## Comandos
```bash
npx tsx scripts/mve.ts report                    # semana atual (segunda a domingo)
npx tsx scripts/mve.ts report --week=2026-11-02  # qualquer dia da semana desejada
npx tsx scripts/mve.ts report --json
```

## Fluxo padrão (`/mve-time-report`)
1. Rode `report` e apresente o resultado.
2. Destaque de 3 a 4 leituras, cada uma com o número que a sustenta:
   - a área com mais tempo (foco + agenda) e o dia mais cheio;
   - quantas conclusões ficaram fora das metas do ciclo;
   - as **áreas com planos e sem movimento** (são as que pedem cuidado);
   - se o foco registrado está em zero, sugira usar "Iniciar agora" no Foco do Dia, que registra o tempo.
3. Ofereça: `[1] Comparar com a semana passada` · `[2] Revisar metas da semana` (mve-weekly-goals) · `[3] Propor blocos para as áreas paradas` (mve-calendar-optimizer).

## Comparar semanas (`/mve-time-report compare`)
1. Rode `report --json` para a semana atual e para `--week=<segunda da semana anterior>`.
2. Mostre só as diferenças relevantes, por exemplo: `Foco +1h30 · Saúde ganhou 3 check-ins · Financeiro continua sem movimento`.
