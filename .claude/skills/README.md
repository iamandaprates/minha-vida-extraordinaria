# Skills do Claude Code no MVE

| Skill | O que faz | Grava? |
|---|---|---|
| `/mve-weekly-goals` | Metas do ciclo vistas pela semana: progresso real, risco e planejamento de ações | Cria ações (`Task`), com aprovação |
| `/mve-time-report` | Como a semana foi vivida, por área e por dia | Não |
| `/mve-calendar-optimizer` | Blocos na agenda para as metas com menor progresso | Cria compromissos (`CalendarEvent`), com aprovação |

Adaptadas de [stephencweiss/me-os](https://github.com/stephencweiss/me-os) (licença MIT) para o modelo de domínio do MVE. Todas usam `scripts/mve.ts`, que reaproveita `src/domain/selectors.ts` e `src/domain/reports.ts`: nenhum cálculo é duplicado.

## Fonte de dados
- **Demonstração (padrão):** sem configuração, o script usa os dados de demonstração e nada é gravado.
- **Supabase:** defina em `.env.local` (ou no ambiente) `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e `MVE_ACCESS_TOKEN`.
  O `MVE_ACCESS_TOKEN` é o token de sessão (JWT) da pessoa logada no app. As requisições rodam como ela, então o Row Level Security vale, inclusive a regra de que fatos só podem ser inseridos. O token expira em cerca de 1 hora. Nunca use a chave `service_role` aqui: ela ignora o RLS.

Para pegar o token com o app aberto e logado, no console do navegador:

```js
JSON.parse(localStorage.getItem(Object.keys(localStorage).find(key => key.endsWith('-auth-token')))).access_token
```
