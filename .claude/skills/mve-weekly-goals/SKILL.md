---
name: mve-weekly-goals
description: Revisar e planejar a semana das metas do ciclo no Minha Vida Extraordinária (Shape 65 kg, CAVU, PRF, apartamento). Use quando a pessoa pedir metas da semana, revisão semanal, "como estão minhas metas", ou quiser planejar ações da semana para uma meta.
---

# /mve-weekly-goals · Metas da semana

Mostra as metas ativas do ciclo vistas pela semana atual (segunda a domingo): progresso real, o que foi planejado para a semana, constância dos hábitos e o que está em risco. Pode criar ações novas para a semana, sempre com aprovação.

Adaptado da skill `weekly-goals` do projeto [me-os](https://github.com/stephencweiss/me-os) (MIT). No MVE não existe Things 3: a fonte é o próprio LifeStore/Supabase, e "meta da semana" são ações (`Task`) com prazo nesta semana conectadas a uma meta do ciclo.

## Regras do MVE (obrigatórias)
- Não invente números. Use apenas o que o script devolver. Sem registros, diga "ainda sem registros".
- Planejar não é executar: esta skill só cria planos (`add-task`). Nunca registre conclusões, check-ins ou valores em nome da pessoa.
- Nada é gravado sem confirmação explícita, item por item ou "todos".
- Microcopy em pt-BR, tom acolhedor e sem cobrança. Nunca use travessão longo: use `·`, `→` ou texto direto.

## Comandos
Rodar a partir da raiz do repositório:

```bash
npx tsx scripts/mve.ts goals                 # semana atual
npx tsx scripts/mve.ts goals --week=2026-11-16
npx tsx scripts/mve.ts ids                   # ids de áreas, metas, projetos e hábitos
npx tsx scripts/mve.ts add-task --title="..." --goal=<id> --due=YYYY-MM-DD[THH:mm] [--priority=high] [--minutes=50]
```

Acrescente `--json` quando precisar dos dados estruturados. Sem Supabase configurado o script usa os dados de demonstração e não grava nada (ele avisa no topo).

## Fluxo padrão (`/mve-weekly-goals`)
1. Rode `npx tsx scripts/mve.ts goals` e apresente a tabela.
2. Destaque em 2 ou 3 frases:
   - metas **Em risco** (ação vencida ou hábitos abaixo de 60% dos dias já passados) e a próxima ação de cada uma;
   - metas **Sem plano na semana**;
   - uma vitória real, se houver (ex.: hábito com boa constância).
3. Ofereça: `[1] Planejar ações da semana` · `[2] Propor blocos na agenda` (chama a skill mve-calendar-optimizer) · `[3] Ver relatório da semana` (mve-time-report).

## Planejar a semana (`/mve-weekly-goals plan` ou opção 1)
1. Para cada meta sem plano ou em risco, sugira de 1 a 3 ações concretas e pequenas, com dia sugerido. Baseie-se na próxima ação e no "porquê" da meta.
2. Mostre a lista numerada e pergunte: `Criar quais? [todos / números / nenhum]`.
3. Para cada item aprovado, rode `add-task` com `--goal` (use `ids` se precisar do id) e `--due`.
4. Rode `goals` de novo e mostre como a semana ficou.

## Adicionar uma meta da semana (`/mve-weekly-goals add <texto>`)
1. Interprete o pedido (ex.: "estudar 2 blocos de PRF na quinta") em título, meta, dia e duração.
2. Confirme em uma linha antes de gravar: `Criar "Estudar PRF · Bloco 2" na meta PRF para qui, 12 de nov às 19:00 (50 min)? [s/n]`.
3. Rode `add-task` e confirme o resultado.
