# Mive

Centro de comando de execução da Mands: transforma planejamento em ação física e fecha ciclos.

## Princípios

- **Fonte única de verdade.** Cada ação, meta, hábito, ideia ou compromisso é um único registro no `LifeStore` (e no Supabase). As 7 guias leem o mesmo estado.
- **Planejar não é executar.** Planos são editáveis. Fatos só são acrescentados e nunca apagados: conclusão, reabertura (`reversal`), adiamento (`postponement`), sessão de foco, check-in de hábito, exame, peso, transação, sessão de estudo, revisão de flashcard, autoavaliação, versão de identidade e evidência. No Supabase, as tabelas de fatos aceitam apenas `SELECT` e `INSERT`.
- **Sem dados fictícios.** O estado inicial traz só os dados reais da Mands (Método CIS, Eu Sou, 5 Metas Magnas e próximas ações). Todo percentual vem de `src/domain/selectors.ts`; sem registros, a interface mostra `·`.
- **Trava antidispersão.** Uma tarefa adiada três vezes ou mais vira **tarefa parada** e aparece em destaque. O Foco de Hoje aceita no máximo 3 ações, cada uma física e com tempo estimado.

## As 7 guias

| Guia | O que tem |
|---|---|
| Início | Hero editorial, Assistente Mive, prioridades do ciclo, Foco de Hoje (3 inegociáveis), Modo Execução 50:00, agenda de hoje, hábitos, alertas de saúde e tarefas paradas |
| Agenda | Timeblocking por dia e semana, novo compromisso por área, sincronização do Google Calendar |
| Áreas da Vida | Radar com percepção (1 a 10) e movimento real, autoavaliação do ciclo, 12 áreas, Finanças (saldo, mês, cofres) e Saúde (exames e peso) |
| Projetos & Metas | 5 Metas Magnas com progresso real, projetos ativos, hábitos e lista de execução com filtro de tarefas paradas |
| Estudos | PRF por matéria (tempo, questões, acertos), cronômetro, espaço para PAT e Short List, flashcards com repetição espaçada |
| Ideias | Captura rápida (CAVU, Café Baiano, Geral), transformar em tarefa ou arquivar |
| Evolução | Índice Mands S.A. de 30 dias (Execução, Estudos, Negócios, Saúde) e instrumentos do CIS em abas separadas |

Na barra superior: **+ Registrar**, mini-player do Spotify (API oficial de embed), **Eu Sou** (declarações MAVI, SER · FAZER · TER, referências e banco de evidências), tema claro ou escuro e perfil. No celular, a barra vira uma barra inferior com gaveta de vidro.

## Estrutura

```text
src/
  app/          App e navegação das 7 guias
  pages/        uma página por guia
  components/   TopNav, Logo, FocusTimer, SpotifyMini, IdentityDrawer, painéis e primitivos
  domain/       models.ts, selectors.ts, reports.ts, catalog.ts
  data/         seed.ts (estado inicial real), areas.ts, demo.ts (modo local)
  services/     Supabase, modo local, Google Calendar
  state/        LifeStore
  styles/       tokens.css e app.css (glassmorphism e Dark Luxury)
supabase/migrations/  0001_lote1_base.sql, 0002_lote2_expansao.sql
scripts/mive.ts       linha de comando usada pelas skills do Claude Code
.claude/skills/       mive-weekly-goals, mive-time-report, mive-calendar-optimizer
```

## Executar

```bash
npm install
```

```bash
npm run dev
```

Verificações:

```bash
npm run check
```

```bash
npm run build
```

## Configuração

Copie `.env.example` para `.env.local`.

- Sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, a Mive abre em **modo local**: o mesmo estado inicial real, em memória, só nesta sessão.
- Com o Supabase: rode `supabase/migrations/0001_lote1_base.sql` e depois `0002_lote2_expansao.sql`, ative o login Google no painel do Supabase e preencha as chaves. No primeiro acesso a Mive grava o estado inicial.
- **Google Calendar:** com `VITE_GOOGLE_CLIENT_ID` (cliente OAuth do tipo Aplicativo da Web) o botão Conectar abre o consentimento do Google. Sem ele, dá para colar um token OAuth com escopo `calendar.readonly`. Tokens nunca são salvos.
