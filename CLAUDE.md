# MIVE · Minha Vida Extraordinária

## Missão do produto
O Mive é um web app pessoal de execução. Ele não é um painel passivo: é um centro ativo
de treinamento de execução que elimina a paralisia do planejamento excessivo e força o
fechamento de ciclos no mundo real. Toda decisão de UX deve reduzir o atrito entre
"pensar" e "fazer". Interface 100% em português do Brasil.

## Stack obrigatória
- React 18 + Vite + TypeScript (strict)
- Tailwind CSS com tokens customizados (abaixo) + CSS variables para tema claro/escuro
- React Router (rotas por guia)
- Zustand com persistência em IndexedDB (via idb-keyval) para todos os dados. App funciona offline.
- Supabase é OPCIONAL: quando as chaves existirem, sincroniza os mesmos dados entre dispositivos.
  Sem chaves, tudo funciona só com o IndexedDB. A camada de persistência fica em src/store/storage.ts.
- Recharts para gráficos (linha, radar)
- lucide-react para ícones (traço fino, estilo outline, cor magenta)
- date-fns com locale pt-BR
- Framer Motion para transições sutis (nunca exageradas)
- PWA instalável (vite-plugin-pwa), ícone = logo da borboleta
- Exportar/Importar backup JSON de todos os dados (Perfil > Configurações)

## Identidade visual (inegociável)
Referências visuais em /docs/referencias. Logo em /public/logo.png (borboleta cujas linhas formam um M).
Estética: "Tech Luxury & Minimalismo Magnético": vidro lapidado, ondas fluidas magenta ao
fundo, muito respiro, cantos bem arredondados (rounded-2xl/3xl), sombras suaves violeta.

Tipografia: Sora em tudo (incluída no build via @fontsource-variable/sora, funciona offline).
- Títulos e métricas: 700 e 600
- Textos de apoio e rótulos: 400 e 500
- PROIBIDO peso 300 em texto funcional

Paleta semântica (tokens Tailwind):
- magenta  #F31991 → ação primária, botões, anéis de foco ativo, checkpoints concluídos
- violeta  #3B0A4D → texto principal, títulos, bordas de alto contraste
- lilas    #CFA3FF → destaques secundários, hover, acentos tech
- ciano    #00C9DF → tags ativas, badges de inteligência, conexões entre projetos
- rosa     #FFE6F3 → superfície suave de cards, fundos de transição
- perola   #FFFFFF → base

Glassmorphism (componente <GlassCard>):
  background: rgba(255,255,255,0.82); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.7); box-shadow: 0 16px 40px rgba(59,10,77,0.08);

Dark Luxury (classe .dark): fundo #0D0C14, vidro rgba(20,10,28,0.85), bordas com
reflexo #CFA3FF, texto claro. Alternador claro/escuro persistido.

Tom emocional: nada punitivo. Nunca usar vermelho para tarefa atrasada. Linguagem
encorajadora, curta, direta ("Vamos executar?", "Disciplina é liberdade.").
Nunca usar travessão longo em textos da interface: use ponto médio (·), barra (/), seta (→) ou texto direto.

## Navegação
Desktop (>768px): Top Navigation Bar em cápsula de vidro flutuante fixa no topo.
- Esquerda: logo + "Mive" em Sora Bold + badge luminoso de status
- Centro: 7 guias · Início, Agenda, Áreas da Vida, Projetos & Metas, Estudos, Ideias, Evolução
- Direita: botão "+ Registrar" (ação rápida global), mini-player Spotify (embed de playlist
  configurável), botão "Eu Sou", toggle de tema, avatar com upload real de foto (salvo local)

Mobile (≤768px): Bottom Navigation Bar em vidro, 5 itens: Início, Agenda, Áreas,
Evolução, Mais (onde ficam Projetos, Estudos, Ideias, Eu Sou, Configurações).
Zero rolagem horizontal. Áreas de toque ≥ 44px. Respeitar safe-area do iPhone.

## Princípios de código
- Componentes pequenos, pasta por módulo: src/modules/{inicio,agenda,areas,projetos,estudos,ideias,evolucao,financas,saude,eusou,configuracoes}
- Biblioteca de UI própria em src/ui (GlassCard, Button, Modal, Sheet, Tag, ProgressRing, Input, Tabs)
- Tipos de dados centralizados em src/types.ts
- Registrar eventos comportamentais (iniciou tarefa, pausou, retomou, concluiu, usou destrave)
  num log único: o módulo Evolução calcula tudo a partir dele
- Acessibilidade: contraste AA, foco visível com anel magenta, labels em todos os inputs
- Antes de finalizar cada fase: rodar build, corrigir erros de tipo, testar em 375px e 1440px

## Histórico
A versão anterior (7 guias com LifeStore e Supabase) está preservada na branch `mive-v1`.
Ela pode servir de referência de regras de negócio já validadas (Regra das 3 Entregas,
Preciso Começar, SM-2, métricas comportamentais, dados reais do Método CIS).

## Fases
1. Fundação · 2. Início (motor comportamental) · 3. Agenda e Projetos & Metas ·
4. Áreas da Vida, Finanças e Saúde · 5. Estudos e Ideias · 6. Evolução e Eu Sou · 7. Polimento ·
8. Sincronização opcional com Supabase.
