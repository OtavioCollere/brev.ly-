# STATE

## Decisions

### AD-001
- **Decision**: O identificador usado em rotas que operam sobre um link específico (delete, resolver+incrementar) é o `id` (UUID) — nunca o `shortUrl` — exceto a própria rota de resolução pública de redirect, que por natureza recebe o `shortUrl` vindo da URL do navegador.
- **Reason**: Instrução explícita do usuário; mantém padrão único em vez de misturar `id` e `shortUrl` como chave de operação.
- **Trade-off**: Nenhum relevante — `id` já é gerado no create.
- **Scope**: backend-api (rotas), frontend (feature futura — precisa saber que delete usa `id`, não `shortUrl`)
- **Date**: 2026-08-05
- **Status**: active

### AD-002
- **Decision**: O `shortUrl` (slug) é fornecido pelo usuário no formulário de criação, não gerado automaticamente pelo backend. Formato válido: `^[a-zA-Z0-9-_]{1,60}$`, case-sensitive.
- **Reason**: A regra de "não deve ser possível criar link com URL encurtada mal formatada" só faz sentido para input do usuário; um slug gerado internamente nunca seria mal formado.
- **Trade-off**: Usuário pode escolher slugs ruins/não amigáveis; sem geração automática de fallback.
- **Scope**: backend-api (validação de criação), frontend (formulário precisa ter campo de slug, com validação client-side espelhando esse regex)
- **Date**: 2026-08-05
- **Status**: active

### AD-003
- **Decision**: A URL original deve ser absoluta com protocolo `http://`/`https://`, até 2048 caracteres.
- **Reason**: Precisão testável para "URL mal formatada"; 2048 é o limite prático de URL adotado por navegadores.
- **Trade-off**: URLs relativas ou sem protocolo são rejeitadas mesmo que "óbvias" (ex. `www.exemplo.com`).
- **Scope**: backend-api (validação), frontend (mensagem de erro do formulário deve orientar a incluir `http(s)://`)
- **Date**: 2026-08-05
- **Status**: active

### AD-004
- **Decision**: Resolver a URL original por `shortUrl` e incrementar o contador de acessos é uma única operação atômica (uma rota, um statement de UPDATE...RETURNING), não duas chamadas separadas.
- **Reason**: O enunciado lista as duas regras como comportamento de uma mesma "visita"; evita round-trip extra e corrida entre resolve e increment.
- **Trade-off**: Não é possível "só consultar" sem contar acesso — qualquer resolução conta como visita.
- **Scope**: backend-api (endpoint de redirect), frontend (a página de redirect faz uma única chamada de resolução, que já incrementa)
- **Date**: 2026-08-05
- **Status**: active

### AD-005
- **Decision**: Listagem de links é paginada (`page`/`limit`, default `limit=10`), ordenada por `createdAt desc`.
- **Reason**: Enunciado exige explicitamente listagem performática; paginação é a técnica padrão com Postgres/Drizzle para isso.
- **Trade-off**: Frontend precisa implementar UI de paginação (ou "carregar mais") em vez de listar tudo de uma vez.
- **Scope**: backend-api (query), frontend (feature futura — tela de listagem precisa consumir paginação)
- **Date**: 2026-08-05
- **Status**: active

### AD-006
- **Decision**: CORS habilitado para qualquer origem (`origin: true`).
- **Reason**: O `.env.example` obrigatório do backend não tem variável de origem/frontend para restringir contra.
- **Trade-off**: Sem allowlist de domínio — aceitável para o escopo do desafio.
- **Scope**: backend-api
- **Date**: 2026-08-05
- **Status**: active

### AD-007
- **Decision**: Formato de erro HTTP padronizado: corpo JSON `{ message: string }` em todo 4xx/5xx.
- **Reason**: Contrato previsível para o frontend tratar erros de forma consistente.
- **Trade-off**: Nenhum relevante.
- **Scope**: backend-api, frontend (tratamento de erro deve esperar `body.message`)
- **Date**: 2026-08-05
- **Status**: active

### AD-008
- **Decision**: Contrato de rotas HTTP do backend (v1):
  - `POST /links` — body `{ originalUrl, shortUrl }` → `201 { id, originalUrl, shortUrl, accessCount, createdAt }`
  - `GET /links?page=&limit=` — → `200 { items: Link[], page, limit, total }`
  - `DELETE /links/:id` — → `204` (sem corpo)
  - `GET /links/:shortUrl` — resolve + incrementa acesso → `200 { originalUrl }`
  - `GET /links/export` — → `200 { url }` (URL pública do CSV na CDN)
  - Erros: sempre `{ message: string }` no corpo, com o status apropriado (400/404/409/500)
- **Reason**: Consolidar em um único lugar o contrato que a spec do frontend vai consumir, evitando que cada feature redescubra rota por rota.
- **Trade-off**: Qualquer mudança de rota/formato depois desta decisão precisa entrar aqui como supersessão explícita, não só mudar no código.
- **Scope**: backend-api, frontend (feature futura)
- **Date**: 2026-08-05
- **Status**: active

## Handoff

- **Feature**: frontend-web (`.specs/features/frontend-web/`)
- **Phase / Task**: Execute concluído — 18/18 tasks implementadas em 4 batches (sub-agents), Verifier achou 1 gap Major (hooks sem teste real, mascarado por mock total nos testes de componente), fix aplicado (7 testes novos em `useLinksApi.test.tsx`), re-verificação deu **PASS** ✅ (19/19 ACs, 43/43 testes, 3/3 mutações mortas)
- **Completed**:
  - backend-api: Execute concluído — 24/24 tasks, Verifier **PASS** (1 gap não-bloqueante: DEL-03 sem teste automatizado). 38/38 testes, docker build/run confirmados. Nada commitado.
  - frontend-web: Execute concluído — 18/18 tasks, Verifier **PASS** na v2 (pós-fix). 43/43 testes, build/typecheck limpos. Fluxo completo (create/list/resolve+increment/delete/404/CORS) verificado via curl direto contra o backend real. Nada commitado.
- **In-progress**: nenhum arquivo em edição
- **Next step**: usuário decide sobre deploy — front (Vercel, cogitado) e onde hospedar o back (precisa suportar Docker+Postgres; Vercel sozinho não serve pro backend). Ver nota abaixo.
- **Blockers**: nenhum funcional. Pendência conhecida: verificação visual em browser real (mobile 390px / desktop 1366px) ainda não foi feita — recomendado antes de considerar o design "confirmado"
- **Commits**: tudo commitado e pushado pro `origin/main` (12 commits: 2 docs + 6 server + 4 web, mensagens em pt-BR, ordem por dependência). Working tree limpo.
- **Nota de deploy**: usuário perguntou sobre deploy na Vercel. Front (SPA estática) dá pra hospedar lá, mas só funciona de verdade com `VITE_BACKEND_URL` apontando pra um backend real já no ar — o backend (Fastify+Postgres) ainda só rodou local/efêmero, nunca foi deployado. Vercel não serve pro backend (precisa de Postgres + processo long-running); precisa de um host tipo Railway/Render/Fly.io que suporte o Dockerfile já pronto em `server/`.
- **Branch**: main
