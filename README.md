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

`models.ts` separa Área, Visão, Meta, Projeto, Tarefa, Demanda, Hábito, Check-in, Compromisso, Registro de Execução, Estudo, Finança, Biblioteca, Nota, Ideia, Decisão, Revisão e Identidade. Todas as entidades são de propriedade do usuário e possuem metadados de criação/atualização. Planejamento (`Task`) e realidade (`ExecutionRecord`) são entidades distintas.

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
