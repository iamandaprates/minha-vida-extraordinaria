# Mive · Minha Vida Extraordinária

Web app pessoal de execução: um centro ativo que transforma planejamento em ação e fecha ciclos.
As regras do produto, da identidade visual e do código estão no [`CLAUDE.md`](./CLAUDE.md).
Referências visuais em `docs/referencias/` e logo em `public/logo.png`.

## Rodar

```bash
npm install
```

```bash
npm run dev
```

Abra o endereço que aparecer no terminal (normalmente http://localhost:5173). No primeiro acesso,
as boas-vindas pedem seu nome e sua foto.

Verificar tipos e gerar a versão de produção:

```bash
npm run check
```

```bash
npm run build
```

```bash
npm run preview
```

O `preview` serve a versão de produção com o service worker ativo: é onde dá para instalar a Mive
como app (PWA) e testar o funcionamento offline.

## Dados

Tudo fica salvo no navegador (IndexedDB) e sobrevive ao recarregar a página. Em Perfil >
Configurações dá para exportar e importar um backup JSON. A sincronização opcional entre
dispositivos com Supabase está prevista para a Fase 8 (`.env.example`).

## Estrutura

```text
src/
  ui/            biblioteca própria: GlassCard, Button, Modal, Sheet, Tag, ProgressRing, Input, Tabs
  layout/        Top Nav, navegação de celular, ondas, logo, avatar, Spotify, + Registrar
  modules/       uma pasta por guia (inicio, agenda, areas, projetos, estudos, ideias, evolucao, eusou, configuracoes)
  store/         Zustand + IndexedDB e backup JSON
  types.ts       tipos centrais
```

## Fases

1. Fundação (pronta) · 2. Início · 3. Agenda e Projetos & Metas · 4. Áreas da Vida, Finanças e Saúde ·
5. Estudos e Ideias · 6. Evolução e Eu Sou · 7. Polimento · 8. Sincronização com Supabase

A versão anterior, com as 7 guias completas sobre LifeStore e Supabase, está preservada na branch `mive-v1`.
