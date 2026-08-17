# Brev.ly — Server

API REST do encurtador de URLs Brev.ly. Feita com Fastify + TypeScript + Drizzle ORM + PostgreSQL.

Resolve o desafio prático **Backend + DevOps** da Rocketseat (trilha Fundamentos Técnicos e Estratégicos).

## Stack

- **TypeScript**
- **Fastify** — servidor HTTP
- **Drizzle ORM** + **drizzle-kit** — acesso ao banco e migrations
- **PostgreSQL**
- **Zod** — validação de payload
- **@aws-sdk/client-s3** — upload do relatório CSV pro Cloudflare R2 (API S3-compatível)
- **Vitest** — testes

## Rodando localmente

Pré-requisitos: Node.js 20+, um Postgres acessível (local, Docker ou um serviço como [Neon](https://neon.com)).

```bash
npm install
cp .env.example .env
# preencha .env com sua DATABASE_URL e as credenciais do Cloudflare R2
npm run db:migrate
npm run dev
```

O servidor sobe na porta definida em `PORT` (ex. `http://localhost:3333`).

### Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta HTTP do servidor |
| `DATABASE_URL` | Connection string do Postgres |
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta Cloudflare (usado pra montar o endpoint do R2) |
| `CLOUDFLARE_ACCESS_KEY_ID` | Access key do bucket R2 |
| `CLOUDFLARE_SECRET_ACCESS_KEY` | Secret key do bucket R2 |
| `CLOUDFLARE_BUCKET` | Nome do bucket onde o CSV é salvo |
| `CLOUDFLARE_PUBLIC_URL` | URL pública do bucket (usada pra montar o link de download do CSV) |

Sem credenciais reais do Cloudflare R2, tudo funciona normalmente exceto o endpoint de exportação de CSV (`GET /links/export`).

## Scripts

| Script | O que faz |
| --- | --- |
| `npm run dev` | Sobe o servidor em modo watch (`tsx`) |
| `npm run build` | Compila TypeScript pra `dist/` |
| `npm start` | Roda a build compilada (`dist/server.js`) |
| `npm run db:migrate` | Aplica as migrations do Drizzle no banco de `DATABASE_URL` |
| `npm test` | Roda a suíte de testes (Vitest) |
| `npm run typecheck` | Checagem de tipos sem emitir arquivos |

## Docker

```bash
docker build -t brevly-server .
docker run --env-file .env -p 3333:3333 brevly-server
```

Build multi-stage (deps → build → runtime), imagem final só com dependências de produção e usuário não-root.

## API

Todas as respostas de erro seguem o formato `{ "message": string }`, com o status HTTP apropriado (`400`, `404`, `409` ou `500`).

### `POST /links`

Cria um link encurtado.

**Body**
```json
{ "originalUrl": "https://exemplo.com/pagina-longa", "shortUrl": "meu-link" }
```

- `originalUrl` precisa ser uma URL absoluta (`http://` ou `https://`), até 2048 caracteres.
- `shortUrl` (o "apelido") precisa casar com `^[a-zA-Z0-9-_]{1,60}$` — só o slug, sem domínio.

**Respostas**: `201` com o link criado · `400` se `originalUrl`/`shortUrl` forem inválidos · `409` se `shortUrl` já existir.

### `GET /links?page=1&limit=10`

Lista os links cadastrados, paginado (`limit` default 10).

**Resposta `200`**
```json
{ "items": [ { "id": "...", "originalUrl": "...", "shortUrl": "...", "accessCount": 0, "createdAt": "..." } ], "page": 1, "limit": 10, "total": 1 }
```

### `DELETE /links/:id`

Remove um link pelo **id** (UUID) — não pelo `shortUrl`. `204` em sucesso, `404` se o id não existir.

### `GET /links/:shortUrl`

Resolve o link encurtado pra URL original **e incrementa o contador de acessos** nessa mesma chamada (é essa rota que a página de redirecionamento do frontend usa). `200` com `{ "originalUrl": "..." }`, ou `404` se o slug não existir.

### `GET /links/export`

Gera um CSV com todos os links (`URL original`, `URL encurtada`, `Contagem de acessos`, `Data de criação`), sobe pro bucket R2 com um nome de arquivo aleatório/único, e retorna a URL pública. `200` com `{ "url": "..." }`.

## Decisões de projeto

O enunciado deixa livre a escolha entre usar `id` ou `shortUrl` como identificador nas operações de deletar/incrementar acesso — a decisão tomada aqui, documentada por consistência:

- **Deletar um link usa `id`** (`DELETE /links/:id`), não o `shortUrl`.
- **Resolver + incrementar acesso usa `shortUrl`** (`GET /links/:shortUrl`) — é a rota que o navegador acessa de fato (`brev.ly/meu-link`), então precisa aceitar o slug, não o id.
- Essas duas operações são conceitualmente diferentes (uma é uma ação administrativa sobre um recurso já conhecido pelo dono; a outra é o próprio mecanismo público do encurtador), por isso usam identificadores diferentes por natureza — mas cada uma é consistente consigo mesma em toda a API.
- `shortUrl` é único (constraint no banco, não só checagem em memória — resolve corrida de criação concorrente), `originalUrl` não precisa ser único (dois slugs podem apontar pro mesmo destino).

Mais detalhes de arquitetura e das decisões (incluindo o raciocínio completo por trás de cada uma) estão em [`.specs/features/backend-api/`](../.specs/features/backend-api/) e no log de decisões em [`.specs/STATE.md`](../.specs/STATE.md).

## Testes

```bash
npm test
```

38 testes (Vitest) cobrindo regra de negócio (`links.service`), rotas HTTP (`links.routes`, `export.routes`) e o builder de CSV — API externa mockada onde aplicável (S3), sem dependência de banco real na suíte automatizada.
