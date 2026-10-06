# Persistência de Áreas da Vida

Este pacote contém somente os arquivos criados ou modificados para que avaliações e dados das Áreas da Vida sejam salvos de forma permanente. Os caminhos são relativos à raiz do repositório `iamandaprates/minha-vida-extraordinaria`: basta extrair o ZIP sobre a pasta do projeto.

## 1. Arquivos

### Criados (11)

| Arquivo | Papel |
|---|---|
| `src/services/localRepository.ts` | Repositório local que implementa o contrato `CloudRepository` já existente em `repository.ts` |
| `src/services/areasStore.ts` | Store único em memória com gravação no repositório |
| `src/domain/areaMetrics.ts` | Cálculo dos indicadores a partir dos registros |
| `src/domain/dates.ts` | Funções de data (semestre, prazo, formatação pt-BR) |
| `src/domain/ids.ts` | Geração de ID com alternativa quando `crypto.randomUUID` não existe |
| `src/components/AreaRecordDialog.tsx` | Diálogo de criar, editar e excluir registros da área |
| `src/styles/areas.css` | Estilos complementares do módulo e correção do botão no mobile |
| `tests/areas.test.tsx` | Testes do fluxo de avaliação, histórico, registros e indicadores |
| `tests/helpers.tsx` | Utilitário de testes que simula um recarregamento da página |
| `tests/units.test.ts` | Testes unitários de datas e métricas |
| `vitest.config.ts` | Configuração dos testes (jsdom) |

### Modificados (6)

| Arquivo | O que mudou |
|---|---|
| `src/components/AreasModule.tsx` | Deixou de guardar dados em `useState`. Lê tudo do store. Histórico real, visualizador somente leitura, indicadores derivados, ações com conclusão, edição de registros e textos em português |
| `src/components/MobileNav.tsx` | Novo botão "Áreas" na barra móvel (agora com 6 botões) |
| `src/main.tsx` | Uma linha: importa `styles/areas.css` depois de `app.css` |
| `src/data/areas.ts` | Mantém só as 12 áreas e o tipo `LifeAreaSeed`. Os tipos de avaliação e workspace locais foram removidos, pois o modelo passou a ser `domain/models.ts` |
| `src/domain/models.ts` | Novo tipo `AreaState` (diagnóstico por área). `Task` ganhou `description` e `completedAt`. As demais entidades não mudaram |
| `package.json` | Script `test` e devDependencies `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/dom`. Nada mais mudou |

## 2. O que mudou em cada ponto principal

- **Chave de armazenamento:** `mve:v1:<coleção>:<userId>`, por exemplo `mve:v1:life-assessments:local-user`. O `userId` é a constante `local-user` até existir autenticação.
- **Coleções persistidas:** avaliações, diagnóstico por área, notas, objetivos, ideias (objetivos futuros), projetos, ações e compromissos. Todas usam as entidades de `models.ts`, com `areaId`, `goalId` e `projectId` prontos para a cadeia Área, Objetivo, Projeto, Ação, Execução.
- **Avaliação:** cada salvamento cria um registro novo, nunca sobrescreve o anterior. A atual é a mais recente.
- **Histórico:** colapsado por padrão. Clicar em uma avaliação abre uma visualização somente leitura que não grava nada.
- **Indicadores:** recalculados a cada renderização. Sem dados mostram "Sem dados" e a execução nunca é inventada. Concluir uma ação preenche `completedAt` e atualiza os números sozinho.
- **Mobile:** `.keep-mobile` e os botões dentro de diálogos continuam visíveis em até 640px. A regra `.pink-button{display:none}` de `app.css` não foi alterada, então Central, Identidade, Visão, Agenda e Execução seguem como antes.

## 3. Por que a avaliação agora persiste ao sair e voltar

Antes, avaliações, notas e registros viviam em `useState` dentro do `AreasModule`. Ao trocar de rota o componente desmontava e o estado era perdido.

Agora:

1. `areasStore.ts` mantém os dados em um store no escopo do módulo, fora de qualquer componente. Sair de Áreas desmonta a tela, mas não o store.
2. `AreasModule` e `AreaDetail` apenas leem o store (`useSyncExternalStore`). Ao voltar, a tela remonta e lê o mesmo estado.
3. Cada alteração atualiza o store na hora e grava em seguida pelo `LocalStorageRepository`, o único arquivo que acessa o `localStorage`.
4. Ao recarregar a página, o store é preenchido a partir do `localStorage` com a mesma chave usada para gravar.
5. Se o navegador bloquear o `localStorage`, há fallback em memória e um aviso na tela. A avaliação ainda sobrevive a sair e voltar, e é perdida só no reload.

Para migrar para a nuvem, troque as instâncias de `LocalStorageRepository` em `areasStore.ts` por implementações de `CloudRepository`. Nenhum componente muda.

### Limites da persistência atual

- O `localStorage` é por navegador e por domínio. Os dados não sincronizam entre celular e computador, e cada URL do Vercel (produção e cada preview) tem armazenamento próprio.
- Limpar os dados do site apaga as avaliações.

## 4. Arquivos que NÃO precisam ser alterados

`src/app/App.tsx`, `src/app/navigation.ts`, `src/components/Sidebar.tsx`, `src/components/Button.tsx`, `src/components/Card.tsx`, `src/components/QuickCapture.tsx`, `src/data/demo.ts`, `src/services/repository.ts`, `src/styles/app.css`, `src/styles/tokens.css`, `src/vite-env.d.ts`, `index.html`, `public/manifest.webmanifest`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json` e `README.md`.

Central e Identidade não foram tocadas e não gravam nada de Áreas.

## Como aplicar

1. Extraia o ZIP na raiz do repositório, confirmando a substituição dos 6 arquivos modificados.
2. Rode `npm install` para atualizar o `package-lock.json` com as devDependencies de teste. O lockfile não está neste pacote de propósito.
3. Rode `npm run build` e `npm test`.
4. Depois do deploy, confira no site publicado: Application, Local Storage, deve existir a chave `mve:v1:life-assessments:local-user` após salvar uma avaliação.