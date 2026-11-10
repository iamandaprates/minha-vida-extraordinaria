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
| Início | Central de execução: Regra das 3 Entregas (1 Prioridade Magna + até 2 secundárias, sem vermelho de culpa), botão **Preciso Começar** com 6 gatilhos de desbloqueio, Modo Foco (50 min e micro-sprints de 5 a 15 min, pausas e retomada), agenda, hábitos e alertas preventivos |
| Agenda | Timeblocking por dia e semana, novo compromisso por área, sincronização do Google Calendar |
| Áreas da Vida | As 12 áreas oficiais (com Bem-estar & Imagem e Conjugal), Diagnóstico MAAS retrátil, Finanças 100% manuais com cofres, Saúde (exames e peso, meta 65 kg) e rituais de Bem-estar & Imagem |
| Projetos & Metas | 5 Metas Magnas com progresso real, projetos ativos com ideias vinculadas por tag (#CAVU), hábitos e lista de execução com tarefas paradas |
| Estudos | Trilhas cadastráveis (Concurso PRF, Inglês, Administração...), matérias, questões e acertos, flashcards Anki com SM-2 (Novamente, Difícil, Bom, Fácil), retenção e espaço para Ciclo PAT e Short List |
| Ideias | Captura rápida com categoria e projeto, modal com descrição longa, links, imagens e tags livres |
| Evolução | Taxas de Iniciação, Foco, Retomada e Finalização por período (7, 30, 90 dias ou mês fechado), índice por pilar e instrumentos do CIS em abas separadas |

Na barra superior: **+ Registrar** (Transação, Peso, Demanda Rápida, Check-in de Hábitos), mini-player do Spotify (API oficial de embed, com gestão de playlists), **Eu Sou** (declarações MAVI, Dossiê de Imagem Pessoal, SER · FAZER · TER, referências e banco de evidências), tema claro ou escuro e perfil com foto. No celular, a barra vira uma barra inferior com gaveta de vidro.

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
- Com o Supabase: rode `supabase/migrations/0001_lote1_base.sql` e depois `0002_lote2_expansao.sql` (idempotente: pode rodar de novo numa base que já tinha a versão anterior), ative o login Google no painel do Supabase e preencha as chaves. No primeiro acesso a Mive grava o estado inicial.
- **Google Calendar:** com `VITE_GOOGLE_CLIENT_ID` (cliente OAuth do tipo Aplicativo da Web) o botão Conectar abre o consentimento do Google. Sem ele, dá para colar um token OAuth com escopo `calendar.readonly`. Tokens nunca são salvos.
