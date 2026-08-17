# Brev.ly

Encurtador de URLs — desafio prático **FullStack** da [Rocketseat](https://www.rocketseat.com.br) (trilha Fundamentos Técnicos e Estratégicos).

Permite cadastrar, listar e remover links encurtados, contar os acessos de cada um, exportar um relatório em CSV e redirecionar corretamente de um link curto pro seu destino original.

## Demo

- **App**: https://brev-ly-xi.vercel.app/
- **API**: _(link após o deploy no Render)_

## Estrutura

Monorepo com duas aplicações independentes, como exigido pelo desafio:

```
server/   → API (Backend + DevOps) — Fastify, TypeScript, Drizzle, Postgres
web/      → SPA (Frontend) — React, Vite, TypeScript
.specs/   → especificação, design, tasks e relatórios de validação de cada parte
```

Cada pasta tem seu próprio README com detalhes de setup, variáveis de ambiente, scripts e decisões de projeto:

- [`server/README.md`](server/README.md)
- [`web/README.md`](web/README.md)

## Rodando localmente (as duas partes)

```bash
# backend
cd server
npm install
cp .env.example .env   # preencha DATABASE_URL e as credenciais do Cloudflare R2
npm run db:migrate
npm run dev             # http://localhost:3333

# frontend (em outro terminal)
cd web
npm install
cp .env.example .env   # VITE_BACKEND_URL=http://localhost:3333
npm run dev             # http://localhost:5173
```

Também é possível subir o backend via Docker — veja [`server/README.md`](server/README.md#docker).

## Requisitos do desafio

### Backend

- [x] Criar link
- [x] Rejeitar URL encurtada mal formatada
- [x] Rejeitar URL encurtada já existente
- [x] Deletar link
- [x] Obter URL original por meio da URL encurtada
- [x] Listar todas as URLs cadastradas
- [x] Incrementar a quantidade de acessos de um link
- [x] Exportar os links em CSV
- [x] CSV acessível via CDN (Cloudflare R2)
- [x] Nome de arquivo aleatório e único
- [x] Listagem performática (paginada)
- [x] CSV com URL original, URL encurtada, contagem de acessos e data de criação
- [x] Postgres
- [x] `.env.example` com as chaves exigidas
- [x] Script `db:migrate`
- [x] Dockerfile
- [x] CORS habilitado
- [x] TypeScript, Fastify, Drizzle, Postgres

### Frontend

- [x] Criar link
- [x] Rejeitar encurtamento mal formatado
- [x] Rejeitar encurtamento já existente
- [x] Deletar link
- [x] Obter URL original por meio do encurtamento
- [x] Listar todas as URLs cadastradas
- [x] Incrementar a quantidade de acessos
- [x] Baixar CSV do relatório
- [x] SPA React com Vite
- [x] Fiel ao layout do Figma (Style Guide extraído: cores, tipografia, componentes)
- [x] Boa UX (empty state, loading, ações bloqueadas por estado)
- [x] Responsivo (mobile e desktop)
- [x] 3 páginas: raiz, redirecionamento (`/:url-encurtada`), não encontrado
- [x] `.env.example`
- [x] TypeScript, React, Vite sem framework

### Decisão de identificador (id vs. URL encurtada)

O enunciado deixa a critério do desenvolvedor usar `id` ou `shortUrl` como identificador nas operações de deletar/incrementar acesso. Aqui: **deletar usa `id`**, **resolver/incrementar usa `shortUrl`** (é a própria rota pública que o navegador acessa). Cada operação é consistente com ela mesma em toda a aplicação — o raciocínio completo está documentado em [`server/README.md`](server/README.md#decisões-de-projeto).

## Stack

TypeScript de ponta a ponta · Fastify · Drizzle ORM · PostgreSQL · Cloudflare R2 · React · Vite · React Router · TanStack React Query · React Hook Form · Zod · Tailwind CSS · Vitest.
