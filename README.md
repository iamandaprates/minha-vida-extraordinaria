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

## Design

- **Tipografia:** Sora em toda a interface (auto-hospedada, peso mínimo 400; títulos 600/700). Só o logotipo "Mive" mantém a serifada editorial.
- **Cor:** magenta `#F31991` nas ações primárias (os botões usam `#DE1487` para o texto branco passar em contraste AA), lilás `#CFA3FF` em hover e acentos, sem vermelho: atraso e cuidado falam em magenta e âmbar.
- **Tema escuro:** fundo `#0D0C14`, vidro `rgba(20, 10, 28, 0.85)` e bordas com reflexo lilás. Todos os tokens ficam em `src/styles/tokens.css`.
- **Acessibilidade:** contraste AA nos dois temas, anel de foco magenta, alvos de toque de 44 px no celular e no tablet, diálogos com foco preso e Esc.

## App instalável e offline

A Mive é um PWA: no celular, "Adicionar à tela de início"; no computador, o ícone de instalar na barra de endereço.

- O build gera `dist/sw.js` (plugin em `vite.config.ts`, modelo em `src/pwa/sw.template.js`), que guarda o app inteiro. Depois da primeira visita, a Mive abre sem internet.
- **Modo local:** os registros ficam no IndexedDB do aparelho (`src/services/lifeStorage.ts`).
- **Com Supabase:** a nuvem continua sendo a fonte da verdade; cada carga e cada gravação é espelhada no aparelho. Sem conexão, a Mive abre a última cópia e avisa. Alterações feitas sem internet ainda não são enviadas depois: isso é o motor de sincronização da próxima fase.
- O service worker só existe no build de produção (`npm run build` e `npm run preview`), nunca no `npm run dev`.
- Atalhos do app instalado abrem uma guia direto: `/?guia=agenda`, `metas`, `estudos`, `ideias`.

## Estrutura

```text
src/
  app/          App, navegação das 7 guias e rotas carregadas sob demanda (routes.ts)
  pages/        uma página por guia
  components/   TopNav, Logo, FocusTimer, SpotifyMini, IdentityDrawer, painéis e primitivos
  domain/       models.ts, selectors.ts, reports.ts, catalog.ts
  data/         seed.ts (estado inicial real), areas.ts, demo.ts (modo local)
  services/     Supabase, modo local (IndexedDB), Google Calendar
  pwa/          registro e modelo do service worker
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

- Sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, a Mive abre em **modo local**: o mesmo estado inicial real, salvo neste aparelho (IndexedDB). Os registros continuam lá depois de recarregar e sem internet. Limpar os dados do site no navegador apaga esses registros.
- Com o Supabase: rode `supabase/migrations/0001_lote1_base.sql` e depois `0002_lote2_expansao.sql` (idempotente: pode rodar de novo numa base que já tinha a versão anterior), ative o login Google no painel do Supabase e preencha as chaves. No primeiro acesso a Mive grava o estado inicial.
- **Google Calendar:** com `VITE_GOOGLE_CLIENT_ID` (cliente OAuth do tipo Aplicativo da Web) o botão Conectar abre o consentimento do Google. Sem ele, dá para colar um token OAuth com escopo `calendar.readonly`. Tokens nunca são salvos.
