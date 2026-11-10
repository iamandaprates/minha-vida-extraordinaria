# Minha Vida Extraordinária — Batch 0

Fundação do sistema pessoal que conecta identidade, visão, planejamento, execução e reflexão.

## Decisões técnicas

- **React + TypeScript + Vite:** interface modular, rápida e preparada para crescimento.
- **Design system por tokens:** cores, sombras, raios e tipografia centralizados em `src/styles/tokens.css`; componentes fundamentais em `src/components`.
- **Cloud-first por contrato:** `src/services/repository.ts` define repositórios, autenticação e calendário como interfaces assíncronas. Nenhum dado de vida é salvo no navegador como fonte de verdade.
- **Integrações futuras:** o contrato `GoogleCalendarSync` preserva IDs externos, recorrência e operações de pull/push para uma sincronização bidirecional posterior. `AuthService` prevê login Google sem implementar autenticação improvisada.
- **PWA:** o manifest e metadados de instalação já estão incluídos. O service worker e a estratégia offline serão conectados quando a camada de autenticação/dados for definida, para não cachear dados pessoais indevidamente neste batch.

## Estrutura

```text
src/
  app/          shell e navegação
  components/   componentes reutilizáveis
  domain/       entidades e relações do domínio
  services/     contratos cloud, autenticação e Google Calendar
  styles/       tokens e estilos responsivos
```

## Modelo de dados

`models.ts` separa Área, Visão, Meta, Projeto, Tarefa, Demanda, Hábito, Check-in, Compromisso, Registro de Execução, Estudo, Finança, Biblioteca, Nota, Ideia, Decisão, Revisão e Identidade. Todas as entidades são de propriedade do usuário e possuem metadados de criação/atualização. Planejamento (`Task`) e realidade (`ExecutionRecord`) são entidades distintas: uma tarefa nunca guarda "concluída"; a conclusão é um registro de execução do tipo `completion`. Demandas são tarefas com `origin: 'captured'`, na mesma lista de execução.

## Preparado para próximos batches

- Persistência cloud e sincronização em tempo real por meio de adaptadores concretos.
- Login Google e isolamento de dados por `userId`.
- Importação/sincronização bidirecional do Google Calendar, incluindo IDs externos e recorrência.
- Central baseada em sinais registrados; os cartões atuais são direção visual, não cálculos ou pontuações inventadas.
- Avaliações periódicas via `Review` com ciclo `maas`.

## Executar localmente

```bash
npm install
npm run dev
```

Verificações:

```bash
npm run check
npm run build
```

## Batch 1 — Minha Vida

Central, Identidade e Visão são experiências navegáveis e conectadas a um único estado de demonstração. A Central é uma camada de leitura: tarefas e demandas são criadas e concluídas em **Execução**, e a mudança é refletida imediatamente na Central. Os dados de demonstração ficam isolados em `src/data/demo.ts` e a interface informa explicitamente quando uma edição é apenas desta sessão; uma implementação cloud substituirá esse adaptador no próximo batch.

Também foram incluídos: busca global por registros demonstrativos, captura rápida de demanda, agenda com preparação visual para Google Calendar, sinais derivados da relevância dos registros de demonstração, manifesto de Identidade editável e versão histórica recolhível, além do mapa macro de Visão.

## Lote 1: estado único e base Supabase

- **Estado central (`src/state/LifeStore.tsx`):** um único `LifeSnapshot` alimenta Central, Execução, Agenda e Áreas da Vida. O antigo estado isolado `workspace` das Áreas deixou de existir: objetivos são `Goal`, projetos são `Project`, ações são `Task`, compromissos são `CalendarEvent`, notas são `AreaNote` e a percepção é `LifeArea.diagnostic`. Uma ação criada em Saúde é a mesma tarefa que aparece em Execução e na Central.
- **Planejamento e realidade:** concluir uma tarefa cria um `ExecutionRecord` (`kind: 'completion'`); reabrir remove esse registro. Progresso de projeto, última atividade e contagens de área são derivados em `src/domain/selectors.ts`, nunca armazenados.
- **Serviço de dados:** `src/services/supabase.ts` (cliente, mapeamento de tabelas, conversão camelCase/snake_case, repositório por tabela, login Google). `src/services/dataService.ts` escolhe Supabase quando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` existem e, sem elas, o modo demonstração em memória.
- **Esquema:** `supabase/migrations/0001_lote1_base.sql` cria as tabelas com chave `(user_id, id)` e Row Level Security por `auth.uid()`. As 12 áreas são semeadas no primeiro acesso.

```bash
cp .env.example .env.local
```
