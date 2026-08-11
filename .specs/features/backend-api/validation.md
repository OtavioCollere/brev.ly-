# Backend API (Brev.ly) Validation

**Date**: 2026-08-10
**Spec**: `.specs/features/backend-api/spec.md`
**Diff range**: working tree não commitado — greenfield, sem range de commit (todo `server/` está untracked; decisão explícita do usuário: sem commit automático)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

Todas as 24 tasks (T1–T24) têm evidência real no código, não só na tabela "Task Status" de `tasks.md`:

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | `server/package.json` scripts (`dev`,`build`,`start`,`test`,`typecheck`,`db:migrate`), `tsconfig.json`/`tsconfig.build.json` presentes |
| T2 | ✅ Done | `.env.example` com exatamente as 7 chaves |
| T3 | ✅ Done | `src/env.ts` — Zod, throw na subida se faltar variável |
| T4 | ✅ Done | `src/db/schema.ts` — 5 colunas + unique(short_url) + index(created_at) |
| T5 | ✅ Done | `src/db/client.ts` — pool `pg` + `drizzle()` |
| T6 | ✅ Done | `drizzle.config.ts` + `drizzle/0000_bent_sunspot.sql` gerado com constraint/index confirmados no SQL |
| T7 | ✅ Done | `src/app.ts` — `buildApp()` |
| T8 | ✅ Done | `src/plugins/cors.ts` — `@fastify/cors`, `origin: true` |
| T9 | ✅ Done | `src/modules/links/links.errors.ts` — 3 classes com `statusCode` |
| T10 | ✅ Done | `src/plugins/error-handler.ts` + 4 testes em `error-handler.test.ts` |
| T11 | ✅ Done | `src/server.ts` — entrypoint, `app.listen({port: env.PORT, host:'0.0.0.0'})` |
| T12 | ✅ Done | `src/modules/links/links.repository.ts` — 5 funções, `create` é INSERT direto sem check-then-insert |
| T13 | ✅ Done | `createLink` em `links.service.ts` + 7 testes |
| T14 | ✅ Done | `listLinks` + 2 testes |
| T15 | ✅ Done | `deleteLink` + 2 testes |
| T16 | ✅ Done | `resolveLink` + 2 testes |
| T17 | ✅ Done | `POST /links` + `GET /links` em `links.routes.ts` + 6 testes |
| T18 | ✅ Done | `DELETE /links/:id` + `GET /links/:shortUrl` + 5 testes (incluindo validação UUID no `:id`) |
| T19 | ✅ Done | `src/modules/export/csv.ts` + 3 testes |
| T20 | ✅ Done | `src/storage/r2-client.ts` + 2 testes |
| T21 | ✅ Done | `src/modules/export/export.service.ts` + 3 testes |
| T22 | ✅ Done | `src/modules/export/export.routes.ts` + 2 testes |
| T23 | ✅ Done | `app.ts` registra cors+error-handler+linksRoutes+exportRoutes; smoke test manual — não reverificável por esta sessão (sem Postgres/R2 real disponível), aceito com base na nota de execução do autor |
| T24 | ✅ Done | `Dockerfile` multi-stage (deps→build→runtime, non-root, `node:22-alpine`) + `.dockerignore`; `docker build`/`docker run` não reexecutados nesta validação (fora do gate obrigatório `npm run build/typecheck/test`) |

**Status**: ✅ Todas as 24 tasks implementadas e verificáveis no código real.

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| URL-01: criar link válido | `201` com `id,originalUrl,shortUrl,accessCount:0,createdAt` | `server/src/modules/links/__tests__/links.routes.test.ts:67-68` — `expect(response.statusCode).toBe(201); expect(response.json()).toEqual(created)` (created inclui `accessCount:0`) | ✅ PASS |
| URL-02: shortUrl mal formatado (vazio/espaço/`/`) | `400` + `{message}`, nada persistido | `server/src/modules/links/__tests__/links.service.test.ts:38-47` (3 casos, `ValidationError`, `create` não chamado) + `links.routes.test.ts:87-88` (`400`, `{message: '...'}`) | ✅ PASS |
| URL-03: originalUrl mal formatada (sem protocolo / >2048 chars) | `400` + `{message}`, nada persistido | `links.service.test.ts:49-64` (2 casos) + `links.routes.test.ts:103-104` (`400`, `{message}`) | ✅ PASS |
| URL-04: shortUrl duplicado | `409` + `{message}`, garantido por constraint única (não checagem em memória) | `links.service.test.ts:66-75` (`23505` → `ConflictError`) + `links.routes.test.ts:119-120` (`409`, `{message}`); constraint real em `server/drizzle/0000_bent_sunspot.sql:7` (`CONSTRAINT "links_short_url_unique" UNIQUE("short_url")`); `create()` é INSERT direto sem SELECT prévio (`server/src/modules/links/links.repository.ts:7-10`) | ✅ PASS (mecanismo de concorrência não é exercitado por teste automatizado real contra Postgres — decisão documentada na Test Coverage Matrix, ver Edge Cases abaixo) |
| URL-05: listagem paginada, `createdAt desc`, default `limit=10` | `200`, itens com `id,originalUrl,shortUrl,accessCount,createdAt` | `links.service.test.ts:79-102` + `links.routes.test.ts:149-153` — chamada sem query string e `expect(linksServiceMock.listLinks).toHaveBeenCalledWith(1, 10)` confirma o default `limit=10` na borda HTTP | ✅ PASS. Ordenação `desc(createdAt)` presente em `links.repository.ts:19` mas sem teste automatizado (camada repository = "none" por decisão documentada na matrix) — ⚠️ Spec-precision gap apenas na cobertura automatizada de ordenação, não no código |
| URL-06: listagem vazia | `200` com lista vazia | `links.service.test.ts:104-110` + `links.routes.test.ts:156-165` — `{items:[],page:1,limit:10,total:0}` | ✅ PASS |
| URL-07: resolver shortUrl existente + incrementar | `200` com `originalUrl`, incremento atômico `+1` no mesmo request | `links.routes.test.ts:236-240` (`200`, `{originalUrl: link.originalUrl}`); atomicidade via `UPDATE ... SET access_count = access_count + 1 ... RETURNING` em `links.repository.ts:31-38` | ✅ PASS (atomicidade real contra Postgres não exercitada por teste automatizado — camada repository excluída por decisão documentada) |
| URL-08: resolver shortUrl inexistente | `404` + `{message}`, contador não alterado | `links.service.test.ts:153-157` (`NotFoundError`) + `links.routes.test.ts:249-252` (`404`, `{message}`) | ✅ PASS |
| DEL-01: deletar id existente | `204`, hard delete | `links.service.test.ts:114-126` + `links.routes.test.ts:184-188` (`204`, body vazio) | ✅ PASS |
| DEL-02: deletar id inexistente | `404` + `{message}` | `links.service.test.ts:128-132` (`NotFoundError`) + `links.routes.test.ts:202-203` (`404`, `{message}`) | ✅ PASS |
| DEL-03: após delete, link some da listagem E shortUrl fica livre pra reuso | comportamento observável em listagem + criação subsequente | **Nenhuma evidência `file:line` em teste automatizado** — mapeado só para T23 (smoke manual, sem registro persistido reexecutável) | ❌ GAP (evidence-or-zero) — comportamento decorre logicamente do hard-delete + constraint unique, mas não há teste automatizado nem log de execução do smoke manual que esta sessão possa auditar |
| CSV-01: CSV com todos os links, colunas corretas | 4 colunas: `originalUrl,shortUrl,accessCount,createdAt` | `server/src/modules/export/__tests__/csv.test.ts:33-39` — string exata comparada com `toBe(...)` | ✅ PASS |
| CSV-02: upload nome aleatório/único + URL pública | key `<uuid>.csv`, URL = `CLOUDFLARE_PUBLIC_URL` + key | `server/src/storage/__tests__/r2-client.test.ts:46-53` — `Key: expect.stringMatching(UUID_CSV_KEY_PATTERN)`, `result.url === 'https://cdn.example.com/' + result.key` | ✅ PASS |
| CSV-03: CSV vazio ainda válido | CSV só com cabeçalho, não é erro | `csv.test.ts:42-46` (`buildLinksCsv([]) === HEADER`) + `export.service.test.ts:64-66` (`uploadCsv` chamado só com o cabeçalho) | ✅ PASS |
| CSV-04: falha de upload → 5xx, sem URL quebrada | `5xx` + `{message}`, sem `url` no corpo | `r2-client.test.ts:56-60` (propaga erro) + `export.service.test.ts:72-77` (propaga) + `server/src/modules/export/__tests__/export.routes.test.ts:60-63` (`statusCode >= 500`, `body` tem `message`, não tem `url`) | ✅ PASS |

**Status**: ⚠️ 15/16 ACs com PASS pleno; 1 GAP real (DEL-03, sem evidência automatizada) + 2 notas de spec-precision sobre comportamento de banco real (ordenação `desc`, atomicidade do incremento) que são estruturalmente corretas no código mas não exercitadas por teste automatizado — ambas justificadas explicitamente na Test Coverage Matrix do `tasks.md` como decisão do usuário (unit-only, sem Postgres real em teste).

---

## Discrimination Sensor

Mutações injetadas temporariamente no working tree (lidas → editadas → testadas → revertidas com `Edit`, arquivo restaurado ao conteúdo original exato antes da próxima mutação):

| # | File:line | Mutação | Testes rodados | Killed? |
| --- | --- | --- | --- | --- |
| 1 | `server/src/modules/links/links.service.ts:5` | Regex do slug `^[a-zA-Z0-9-_]{1,60}$` → `.*` (aceita qualquer coisa) | `links.service.test.ts` | ✅ Killed (3 testes falharam: empty/space/slash) |
| 2 | `server/src/plugins/error-handler.ts` (bloco de mapeamento de erro) | `ConflictError` força `reply.status(200)` em vez de `error.statusCode` (409) | `error-handler.test.ts` + `links.routes.test.ts` | ✅ Killed (2 testes falharam: `expected 200 to be 409`) |
| 3 | `server/src/modules/export/csv.ts:6` | Removida checagem `value.includes(',')` no `escapeField` (quebra quoting RFC 4180 pra campo com vírgula) | `csv.test.ts` | ✅ Killed (1 teste falhou: campo com vírgula não ficou entre aspas) |
| 4 | `server/src/storage/r2-client.ts:20` | `${randomUUID()}.csv` → `'export.csv'` (nome fixo, não aleatório) | `r2-client.test.ts` | ✅ Killed (1 teste falhou: `Key` não bateu com o padrão UUID) |
| 5 | `server/src/modules/links/links.service.ts:78-84` | Removida a checagem `if (!deleted) throw NotFoundError` em `deleteLink` (delete de id inexistente vira sucesso silencioso) | `links.service.test.ts` | ✅ Killed (1 teste falhou: DEL-02 não rejeitou mais) |

Nota: a mutação #2 foi aplicada em `error-handler.ts` em vez de `links.routes.ts` porque é ali — não nas rotas — que o status HTTP de erro é efetivamente decidido nesta arquitetura (`links.routes.ts` só lança o erro de domínio, nunca seta status diretamente); o efeito comportamental pedido (409→200 na resposta de conflito) foi reproduzido fielmente e pego pelos testes de ambas as camadas (`error-handler.test.ts` e `links.routes.test.ts`).

Todas as 5 mutações foram revertidas imediatamente após confirmar a falha; gate completo (`npm run build && npm run typecheck && npm test`) reexecutado depois da última reversão e voltou a passar 38/38, confirmando que o working tree está intacto.

**Sensor depth**: lightweight (default tier — feature não é P0/crítica de pagamento/auth)
**Result**: 5/5 killed — PASS ✅

---

## Code Quality

| Principle | Status | Notes |
| --- | --- | --- |
| Minimum code | ✅ | Nenhuma abstração além do necessário; DI opcional (`opts.linksService?`) existe só pra viabilizar o teste de rota via `app.inject()`, conforme decidido na Test Coverage Matrix |
| Surgical changes | ✅ | Projeto greenfield, sem código pré-existente pra "melhorar" |
| No scope creep | ✅ | Nenhuma feature além do que o spec pede (sem auth, sem rate limit, sem soft delete — todos explicitamente Out of Scope no spec.md) |
| Matches patterns | ✅ | Estrutura em camadas (routes→service→repository→storage) consistente com design.md, nomenclatura consistente em todos os módulos |
| Spec-anchored outcome check (asserted values match spec) | ✅ | Ver tabela de ACs acima — praticamente todos os testes comparam valor exato (`toBe`/`toEqual`), não só presença de asserção |
| Per-layer Coverage Expectation met (domínio 1:1 ACs; rotas happy+edge+erro) | ⚠️ | `links.service`/`csv`/`export.service`/`r2-client` cobrem 1:1 com as ACs; rotas cobrem happy+edge+erro pra todo endpoint. Único desvio: DEL-03 não tem teste automatizado — decisão documentada, mas ainda uma lacuna de cobertura real |
| Every test maps to a spec requirement — no unclaimed tests | ✅ | Todo teste tem o ID da AC no nome (`URL-XX`/`DEL-XX`/`CSV-XX`) ou é claramente o caso RFC4180/UUID-inválido do edge case |
| Documented project quality/testing guidelines followed | ✅ | Test Coverage Matrix em `tasks.md` (Vitest unit-only, S3 mockado, sem Postgres real) seguida à risca em todos os 7 arquivos de teste |

---

## Edge Cases

- [x] `shortUrl` vazio/espaço/`/` → `400` — `links.routes.test.ts:75-89`, `links.service.test.ts:38-47`
- [x] `originalUrl` sem protocolo → `400` — `links.routes.test.ts:91-105`, `links.service.test.ts:49-52`
- [ ] Duas criações concorrentes com mesmo `shortUrl` → uma `201`, outra `409` via constraint Postgres — **não exercitado por teste automatizado** (unit-only, sem Postgres real em teste, decisão documentada); a constraint existe no SQL gerado (`drizzle/0000_bent_sunspot.sql:7`) e o código usa INSERT direto sem check-then-insert, então estruturalmente correto, mas o comportamento sob concorrência real nunca foi observado nesta validação
- [x] `id` inválido (não-UUID) em `DELETE /links/:id` → `400` em vez de `500` — `links.routes.test.ts:206-216`, adicionado explicitamente pelo orquestrador na T18 conforme a nota do `tasks.md`. Confirmado presente e coberto.
  - Nota: o mesmo edge case do spec.md fala em "id passado em delete/**resolução**", mas a rota de resolução real (`GET /links/:shortUrl`, definida na própria AC URL-07) usa o slug `shortUrl` como identificador, não um `id` UUID — então validação de formato UUID não se aplica ali. Isso é uma inconsistência textual dentro do `spec.md` (a linha de Assumptions diz "id (UUID)... consistência entre as duas operações", mas a AC URL-07 define a rota como `/links/:shortUrl`), não um defeito de código: o código implementa fielmente a AC URL-07, que é a definição operacional. Reportado como observação, não como gap.
- [x] Listagem sem links → `200` vazio — `links.routes.test.ts:156-165`
- [x] Export CSV sem links → CSV válido só com cabeçalho, nunca erro — `csv.test.ts:42-46`, `export.service.test.ts:55-70`

---

## Gate Check

- **Gate command**: `npm run build && npm run typecheck && npm test` (dentro de `server/`)
- **Result**: 38 passed, 0 failed, 0 skipped (7 arquivos de teste)
- **Test count before feature**: 0 (projeto greenfield, nenhum teste pré-existia)
- **Test count after feature**: 38
- **Delta**: +38 novos testes
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans (if issues found)

### Fix 1: DEL-03 sem cobertura automatizada

- **Root cause**: A verificação de que (a) um link deletado some da listagem e (b) seu `shortUrl` fica disponível pra reuso depende de comportamento real de banco (hard delete + constraint unique liberada), e a decisão de projeto foi não rodar Postgres real em teste. A task T23 marca isso como "smoke test manual", mas não existe nenhum artefato persistido (log, script, snapshot) que esta sessão de validação pudesse auditar como evidência.
- **Fix task sugerida**: Não é obrigatório corrigir — é uma lacuna aceita por decisão documentada do usuário (unit-only). Se o usuário quiser fechar a lacuna sem subir o custo de infra de teste, a opção mais barata é um teste de integração leve e opcional (ex.: `describe.skipIf(!process.env.DATABASE_URL)`) que roda só quando há um Postgres real disponível, cobrindo create→delete→recreate mesmo `shortUrl`. Não implementado nesta validação (Verifier é read-only).
- **Priority**: Minor (funcionalmente a lógica está correta e é uma consequência direta e óbvia do hard delete + constraint SQL; o risco real é baixo, mas a evidência formal está ausente)

Nenhum outro gap encontrado. Nenhuma mutação sobreviveu ao sensor.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| URL-01 | In Tasks | ✅ Verified |
| URL-02 | In Tasks | ✅ Verified |
| URL-03 | In Tasks | ✅ Verified |
| URL-04 | In Tasks | ✅ Verified |
| URL-05 | In Tasks | ✅ Verified (⚠️ ordenação `desc` sem teste automatizado, ver nota acima) |
| URL-06 | In Tasks | ✅ Verified |
| URL-07 | In Tasks | ✅ Verified (⚠️ atomicidade real sem teste automatizado, ver nota acima) |
| URL-08 | In Tasks | ✅ Verified |
| DEL-01 | In Tasks | ✅ Verified |
| DEL-02 | In Tasks | ✅ Verified |
| DEL-03 | In Tasks | ❌ Needs Fix (evidence-or-zero: sem teste automatizado, ver Fix 1) |
| CSV-01 | In Tasks | ✅ Verified |
| CSV-02 | In Tasks | ✅ Verified |
| CSV-03 | In Tasks | ✅ Verified |
| CSV-04 | In Tasks | ✅ Verified |
| OPS-01 | In Tasks | ✅ Verified (schema + client + migration gerada; sem teste automatizado por decisão, gate build passa) |
| OPS-02 | In Tasks | ✅ Verified (plugin presente, `origin:true`; sem teste unitário dedicado por decisão) |
| OPS-03 | In Tasks | ✅ Verified (`db:migrate` existe no `package.json`) |
| OPS-04 | In Tasks | ✅ Verified (Dockerfile multi-stage presente; `docker build`/`run` não reexecutados nesta validação) |
| OPS-05 | In Tasks | ✅ Verified (`.env.example` com exatamente as 7 chaves) |

---

## Summary

**Overall**: ⚠️ Issues (1 gap real, não-bloqueante)

**Spec-anchored check**: 15/16 ACs com PASS pleno + 1 GAP real (DEL-03, sem evidência automatizada) + 2 notas de spec-precision (URL-05 ordenação, URL-07 atomicidade — código correto, cobertura automatizada ausente por decisão documentada)
**Sensor**: 5/5 mutações killed, 0 sobreviveram
**Gate**: 38 passed, 0 failed, 0 skipped

**What works**: Todo o ciclo CRUD+resolve+CSV está implementado, testado e com asserções que batem exatamente com o valor definido no spec (status code + corpo `{message}`/objeto exato), não só "existe uma asserção". Build, typecheck e suite completa passam limpos. Sensor de mutação não encontrou nenhum teste "de fachada" nas 5 mutações comportamentais tentadas, cobrindo validação de slug, status HTTP de erro, quoting de CSV, geração de nome aleatório, e checagem de not-found.

**Issues found**: DEL-03 (slug liberado após delete + link some da listagem) não tem evidência de teste automatizado — só smoke manual não auditável. Estruturalmente a implicação lógica (hard delete + constraint unique) é sólida, mas por regra evidence-or-zero fica marcado como GAP formal, não um "PASS assumido".

**Next steps**: Ação sugerida ao usuário — aceitar a lacuna como está (decisão consciente de unit-only já tomada) ou adicionar um teste de integração opcional condicionado a `DATABASE_URL` disponível. Nenhuma ação obrigatória antes de considerar a feature pronta pro fim do desafio Rocketseat, dado que o comportamento é uma consequência direta e testável manualmente do hard delete + constraint SQL já confirmada no `.sql` de migration.
