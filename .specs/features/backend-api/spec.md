# Backend API (Brev.ly) Specification

## Problem Statement

Brev.ly precisa de uma API que permita cadastrar, listar, resolver e remover URLs encurtadas, contar acessos por link e gerar um relatório em CSV desses links, hospedado em uma CDN. Essa API é consumida pelo frontend (spec futura) e é avaliada por um checklist fixo do desafio Rocketseat — logo o contrato dela (rotas, IDs, formatos de erro) precisa ficar estável antes do front ser especificado.

## Goals

- [ ] Implementar todas as regras funcionais obrigatórias do desafio (criar, listar, deletar, resolver+contar acesso, exportar CSV) com Fastify + Drizzle + Postgres
- [ ] Contrato de API estável e consistente (baseado em `id`) para o frontend consumir sem ambiguidade
- [ ] CSV de relatório acessível publicamente via CDN (Cloudflare R2), com nome de arquivo aleatório e único
- [ ] Projeto executável via Docker e migrável via `db:migrate`, pronto para avaliação

## Out of Scope

Explicitamente excluído desta feature. Documentado para não crescer escopo.

| Feature | Reason |
| --- | --- |
| Autenticação / autorização | Não exigida pelo enunciado; ferramenta pública |
| Rate limiting / anti-abuso | Não exigido pelo enunciado |
| Edição de link existente (trocar URL original ou short URL) | Regras funcionais só citam criar/listar/deletar/resolver/incrementar/exportar — não citam update |
| Expiração / TTL de link | Não exigido |
| Analytics detalhado (IP, geolocalização, referrer por clique) | Enunciado só pede "quantidade de acessos" (contador agregado) |
| Soft delete / lixeira / restauração | Não exigido; delete é definitivo |
| Operações em lote (bulk delete, import) | Não exigido |
| Domínio customizado / múltiplos domínios de short URL | Um único domínio de frontend por ambiente, via env |
| Frontend (React/Vite) | Feature separada, especificada depois desta (conforme pedido do usuário) |
| Metadados OpenGraph, upload de imagem, SSR, interface otimista | Seção "Quer ir além?" do enunciado — explicitamente fora da correção obrigatória |

---

## Assumptions & Open Questions

Toda ambiguidade foi resolvida ou registrada aqui — nada fica implícito sem registro. Itens marcados com ⭐ são decisões **cross-feature** (o frontend vai depender delas) e foram promovidas para `STATE.md` como AD-NNN.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Identificador usado em delete e em resolver/incrementar | `id` (UUID) na URL da rota, ex. `DELETE /links/:id` | Instrução explícita do usuário nesta tarefa; enunciado deixa a critério do dev, mas pede consistência entre as duas operações | y |
| Quem gera o "short URL" (slug) | Fornecido pelo usuário no cadastro (não gerado pelo sistema) | A regra "não deve ser possível criar link com URL encurtada mal formatada" só faz sentido se o slug for input do usuário — um slug gerado pelo próprio sistema nunca seria mal formado | n ⭐ |
| Formato válido de slug ("mal formatado" = ?) | Regex `^[a-zA-Z0-9-_]{1,60}$`, case-sensitive, sem barra/domínio/espaços | Precisa de uma regra objetiva e testável; charset restrito evita problemas de URL-encoding no redirect | n ⭐ |
| Validação da URL original | Deve ser uma URL absoluta válida (`http://` ou `https://`), até 2048 caracteres | 2048 é o limite prático de URL adotado por navegadores; protocolo explícito evita ambiguidade no redirect | n ⭐ |
| Unicidade da URL original | Não é única — vários short links podem apontar pra mesma URL original | Enunciado só exige unicidade da URL *encurtada*; nada impede reaproveitar a mesma URL de destino | n |
| Resolver URL original + incrementar acesso | Uma única operação/rota: ao resolver o short URL (ex. `GET /links/:shortUrl`) o contador de acessos é incrementado no mesmo statement atômico | O enunciado lista as duas regras juntas como comportamento de uma "visita"; evitar 2 chamadas (resolve + increment) evita round-trip extra e corrida entre elas | n ⭐ |
| Tipo de delete | Hard delete (remove a linha do banco) | Enunciado não menciona retenção/auditoria de links deletados | n |
| Paginação da listagem | `GET /links` paginado (`page`/`limit`, default limit=10), ordenado por `created_at desc`, coluna indexada | Enunciado exige explicitamente listagem performática; paginação é a técnica padrão pra isso com Postgres/Drizzle | n ⭐ |
| Escopo do export CSV | Exporta **todos** os links cadastrados (ignora paginação), um snapshot completo por request | "Exportar os links criados em um CSV" lido como o dataset completo, não a página atual | n |
| Execução do export CSV | Síncrono por request (sem fila/job em background); nome do arquivo aleatório (UUID) + `.csv`, sobe pro bucket R2, resposta retorna a URL pública da CDN | Enunciado não pede infraestrutura de fila; volume de dados do desafio é pequeno o suficiente pra gerar na hora | n |
| CSV com zero links | Exporta normalmente um CSV só com cabeçalho (não é erro) | Comportamento previsível, consistente com o empty-state do front | n |
| CORS | Liberado para qualquer origem (`origin: true` / `*`) | O `.env.example` obrigatório do backend não tem nenhuma variável de origem/frontend pra restringir contra — não há como configurar allowlist a partir do que foi pedido | n ⭐ |
| Gerenciador de pacotes | npm | Enunciado só exige a chave exata `db:migrate` no script, não um gerenciador específico; npm maximiza compatibilidade de quem for rodar/avaliar | n |
| Formato de erro HTTP | Corpo JSON `{ message: string }` em todo 4xx/5xx (mais os campos padrão do Fastify) | Precisa de um contrato previsível pro frontend tratar erro; enunciado não especifica formato | n ⭐ |
| Timestamp de criação | `created_at` como `timestamptz`, default `now()` do Postgres, imutável | CSV exige "data de criação"; timestamptz é o padrão seguro no Postgres | n |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Ciclo de vida principal do link (criar, listar, resolver + contar acesso) ⭐ MVP

**User Story**: Como usuário do Brev.ly, quero cadastrar uma URL longa com um apelido curto, ver todos os links cadastrados e ser redirecionado corretamente ao acessar o link curto, para poder compartilhar e usar links encurtados de forma confiável.

**Why P1**: É o loop central do produto — sem criar/listar/resolver não existe encurtador. Delete e export dependem de já existir esse ciclo.

**Acceptance Criteria**:

1. WHEN o cliente faz POST para criar um link com `originalUrl` válida e `shortUrl` (slug) que casa com o padrão `^[a-zA-Z0-9-_]{1,60}$` e ainda não existe THEN o sistema SHALL persistir o link, retornando `201` com `id`, `originalUrl`, `shortUrl`, `accessCount: 0` e `createdAt`.
2. WHEN o cliente tenta criar um link cujo `shortUrl` não casa com o padrão `^[a-zA-Z0-9-_]{1,60}$` (ex. contém espaço, `/`, ou está vazio) THEN o sistema SHALL responder `400` com corpo `{ message }` e SHALL NOT persistir nada.
3. WHEN o cliente tenta criar um link cujo `originalUrl` não é uma URL absoluta válida (`http://`/`https://`) ou excede 2048 caracteres THEN o sistema SHALL responder `400` com corpo `{ message }` e SHALL NOT persistir nada.
4. WHEN o cliente tenta criar um link cujo `shortUrl` já existe no banco THEN o sistema SHALL responder `409` com corpo `{ message }`, mesmo sob duas criações concorrentes com o mesmo slug (garantido por constraint única no banco, não só checagem em memória).
5. WHEN o cliente faz GET na listagem THEN o sistema SHALL retornar todos os links cadastrados, paginados (`page`/`limit`, default `limit=10`), ordenados por `createdAt desc`, cada item com `id`, `originalUrl`, `shortUrl`, `accessCount`, `createdAt`.
6. WHEN não há nenhum link cadastrado THEN o GET de listagem SHALL retornar `200` com lista vazia (nunca erro).
7. WHEN o cliente faz GET pra resolver um `shortUrl` existente (ex. `GET /links/:shortUrl`) THEN o sistema SHALL retornar `200` com a `originalUrl` correspondente E SHALL incrementar `accessCount` em +1 atomicamente no mesmo request (via `UPDATE ... SET access_count = access_count + 1 ... RETURNING`).
8. WHEN o cliente tenta resolver um `shortUrl` que não existe THEN o sistema SHALL responder `404` com corpo `{ message }` e SHALL NOT alterar nenhum contador.

**Independent Test**: Criar um link via POST, chamá-lo via GET de resolução repetidas vezes e conferir que `accessCount` sobe a cada chamada, e que ele aparece corretamente na listagem paginada.

---

### P2: Remoção de link

**User Story**: Como usuário do Brev.ly, quero deletar um link que cadastrei por engano ou que não uso mais, para manter minha lista de links limpa.

**Why P2**: Depende de já existir criação (P1); é uma operação simples e isolada, sem dependência de CSV.

**Acceptance Criteria**:

1. WHEN o cliente faz DELETE em `/links/:id` de um link existente THEN o sistema SHALL remover a linha do banco (hard delete) e responder `204`.
2. WHEN o cliente faz DELETE em `/links/:id` de um `id` que não existe THEN o sistema SHALL responder `404` com corpo `{ message }`.
3. WHEN um link é deletado THEN ele SHALL deixar de aparecer na listagem E o `shortUrl` dele SHALL voltar a estar disponível para uso em uma nova criação.

**Independent Test**: Criar um link, deletá-lo por `id`, confirmar `404` ao tentar deletar de novo, confirmar que sumiu da listagem, e confirmar que dá pra recriar um novo link com o mesmo `shortUrl`.

---

### P3: Exportação de relatório em CSV via CDN

**User Story**: Como usuário do Brev.ly, quero baixar um relatório CSV de todos os meus links cadastrados, para analisar ou arquivar meus dados fora da aplicação.

**Why P3**: É a funcionalidade mais "pesada" (depende de infra externa — bucket R2) e não bloqueia o uso básico do encurtador; naturalmente a última peça a implementar.

**Acceptance Criteria**:

1. WHEN o cliente solicita a exportação THEN o sistema SHALL gerar um CSV com todos os links cadastrados (ignorando paginação), com colunas `originalUrl`, `shortUrl`, `accessCount`, `createdAt`.
2. WHEN o CSV é gerado THEN o sistema SHALL fazer upload dele pro bucket configurado (Cloudflare R2) com um nome de arquivo aleatório e único (ex. `<uuid>.csv`) e SHALL responder com a URL pública (`CLOUDFLARE_PUBLIC_URL` + chave do objeto).
3. WHEN não há nenhum link cadastrado THEN o sistema SHALL ainda gerar e subir um CSV válido contendo só o cabeçalho das colunas (não é erro).
4. WHEN o upload para o bucket falhar (erro de rede/credencial) THEN o sistema SHALL responder `5xx` com corpo `{ message }` e SHALL NOT retornar uma URL de CDN quebrada/inexistente.

**Independent Test**: Com pelo menos um link cadastrado, chamar o endpoint de export, baixar a URL retornada e conferir que o CSV tem as 4 colunas corretas e os valores batem com o que está no banco.

---

## Edge Cases

- WHEN o `shortUrl` de criação vem vazio, só com espaços, ou contendo `/` THEN o sistema SHALL responder `400` (coberto por URL-02).
- WHEN o `originalUrl` não tem protocolo (`www.exemplo.com` sem `http`) THEN o sistema SHALL responder `400` (coberto por URL-03).
- WHEN duas requisições de criação com o mesmo `shortUrl` chegam simultaneamente THEN apenas uma SHALL suceder (`201`) e a outra SHALL falhar com `409`, garantido por constraint única no Postgres (não apenas checagem prévia em memória).
- WHEN o `id` passado em delete/resolução não é um UUID válido THEN o sistema SHALL responder `400` (formato inválido) em vez de `500`.
- WHEN a listagem é chamada sem nenhum link cadastrado THEN o sistema SHALL retornar lista vazia com `200` — esse é o estado que a página inicial do front usa pro empty state.
- WHEN o export CSV é chamado sem nenhum link cadastrado THEN o sistema SHALL ainda retornar um CSV válido (só cabeçalho), nunca erro.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status | Task(s) |
| --- | --- | --- | --- | --- |
| URL-01 | P1: Criar link | Tasks | In Tasks | T13, T17 |
| URL-02 | P1: Rejeitar slug mal formatado | Tasks | In Tasks | T13, T17 |
| URL-03 | P1: Rejeitar URL original mal formatada | Tasks | In Tasks | T13, T17 |
| URL-04 | P1: Rejeitar slug duplicado | Tasks | In Tasks | T4, T13, T17 |
| URL-05 | P1: Listar (paginado) | Tasks | In Tasks | T4, T14, T17 |
| URL-06 | P1: Listagem vazia | Tasks | In Tasks | T14, T17 |
| URL-07 | P1: Resolver short URL + incrementar acesso | Tasks | In Tasks | T12, T16, T18 |
| URL-08 | P1: Resolver short URL inexistente → 404 | Tasks | In Tasks | T16, T18 |
| DEL-01 | P2: Deletar por id | Tasks | In Tasks | T12, T15, T18 |
| DEL-02 | P2: Deletar id inexistente → 404 | Tasks | In Tasks | T15, T18 |
| DEL-03 | P2: Slug liberado após delete | Tasks | In Tasks | T23 (smoke manual) |
| CSV-01 | P3: Gerar CSV de todos os links | Tasks | In Tasks | T12, T19, T21 |
| CSV-02 | P3: Upload com nome aleatório/único na CDN | Tasks | In Tasks | T20, T21, T22 |
| CSV-03 | P3: CSV vazio ainda é válido | Tasks | In Tasks | T19, T21 |
| CSV-04 | P3: Falha de upload → 5xx sem link quebrado | Tasks | In Tasks | T20, T21, T22 |
| OPS-01 | Infra: Postgres via Drizzle | Tasks | In Tasks | T4, T5, T6, T12 |
| OPS-02 | Infra: CORS habilitado | Tasks | In Tasks | T8, T23 |
| OPS-03 | Infra: script `db:migrate` | Tasks | In Tasks | T6 |
| OPS-04 | Infra: Dockerfile builda imagem executável | Tasks | In Tasks | T24 |
| OPS-05 | Infra: `.env.example` com as chaves exigidas | Tasks | In Tasks | T2, T3 |

**ID format:** `[CATEGORY]-[NUMBER]` — `URL` (ciclo de vida do link), `DEL` (remoção), `CSV` (exportação), `OPS` (infra/devops)

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 20 total, 20 mapped to tasks (`.specs/features/backend-api/tasks.md`), 0 unmapped ✅

---

## Success Criteria

- [ ] Todas as regras funcionais obrigatórias do desafio (criar, rejeitar mal formatado, rejeitar duplicado, deletar, resolver, listar, incrementar, exportar CSV, CSV via CDN, nome aleatório/único, listagem performática, campos do CSV) passam em teste manual/automatizado
- [ ] `npm run db:migrate` roda as migrations do Drizzle contra `DATABASE_URL` limpo, sem erro
- [ ] `docker build` gera imagem; `docker run` sobe a API na porta de `PORT`
- [ ] Uma origem diferente (ex. frontend em outra porta) consegue chamar a API sem erro de CORS
- [ ] `.env.example` contém exatamente as chaves exigidas pelo enunciado (`PORT`, `DATABASE_URL`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ACCESS_KEY_ID`, `CLOUDFLARE_SECRET_ACCESS_KEY`, `CLOUDFLARE_BUCKET`, `CLOUDFLARE_PUBLIC_URL`)
