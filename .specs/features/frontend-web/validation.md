# Frontend Web (Brev.ly) Validation

**Date**: 2026-08-11 (v2 — re-verification after fix)
**Spec**: `.specs/features/frontend-web/spec.md`
**Diff range**: working tree não commitado — greenfield, sem range de commit (todo `web/src/` é conteúdo novo, não rastreado pelo git)
**Verifier**: independent sub-agent (author ≠ verifier)

**Contexto desta rodada**: re-verificação focada, não do zero. A rodada anterior (v1, mesma data) deu **FAIL** com 1 gap Major: `web/src/hooks/useLinksApi.ts` não tinha nenhuma cobertura real — todo teste de componente mockava o módulo `hooks/useLinksApi` inteiro (`vi.mock(...)`), então a lógica real de invalidação de cache, remoção otimista + rollback, e `retry:false` nunca rodava. Comprovado empiricamente por mutation testing: remover o rollback do `onError` de `useDeleteLinkMutation` não quebrou nenhum dos 36 testes existentes.

**Fix aplicado** (pelo implementador, entre v1 e v2): criado `web/src/hooks/__tests__/useLinksApi.test.tsx` — 7 testes novos usando `renderHook` (`@testing-library/react`) com um `QueryClientProvider` **real** (não mockado), mockando só `lib/api-client`. `tasks.md` (Test Coverage Matrix, linha `hooks/useLinksApi.ts`) foi atualizado para refletir a decisão corrigida.

Esta rodada re-verifica esse fix especificamente (re-lê o teste novo linha a linha, reaplica a mutação original + 2 mutações novas na mesma área, roda o gate completo) e revalida o restante do relatório v1 por amostragem.

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1–T5, T7–T17 | ✅ Done | Sem mudança desde v1 — revalidado por amostragem, nada divergente. |
| T6   | ✅ Done | `src/hooks/useLinksApi.ts` — 5 hooks. **Atualizado desde v1**: agora tem cobertura real dedicada em `src/hooks/__tests__/useLinksApi.test.tsx` (7 testes, `renderHook` + `QueryClientProvider` real). Gap Major da v1 fechado. |
| T18  | ⚠️ Parcial | Sem mudança desde v1 — smoke test via curl contra backend real feito na implementação; checagem visual/responsiva em browser real segue não feita (ver Edge Cases / Summary). |

**18/18 tasks implementadas.** Nenhuma task nova foi criada para este fix — foi tratado como correção da T6, consistente com a Test Coverage Matrix atualizada em `tasks.md`.

---

## Leitura do fix: `useLinksApi.test.tsx` exercita lógica real (não é mock disfarçado)

Confirmado por leitura direta do arquivo (`web/src/hooks/__tests__/useLinksApi.test.tsx`, 213 linhas, 7 testes em 5 `describe` blocks):

- **O que é mockado**: só `lib/api-client` (linhas 16-26) — `vi.mock('../../lib/api-client', ...)` substitui apenas `createLink`/`listLinks`/`deleteLink`/`resolveLink`/`exportLinks` por `vi.fn()`, preservando o resto do módulo real (`vi.importActual`) incluindo `ApiError`.
- **O que roda de verdade**: os 5 hooks importados de `../useLinksApi` (linhas 8-14) são chamados via `renderHook` sem nenhum mock — cada `useMutation`/`useQuery` do TanStack Query, o `QueryClient` (linhas 43-58) é uma instância real, e o cache (`onMutate`/`onSuccess`/`onError`, `invalidateQueries`, `setQueriesData`, `cancelQueries`) executa o código de produção linha por linha.
- Isso é estruturalmente diferente do padrão usado nos testes de componente (`NewLinkForm.test.tsx`, `LinkListItem.test.tsx`, etc.), que mockam `hooks/useLinksApi` inteiro — esses continuam existindo e continuam válidos para testar a camada de UI, mas agora a camada de hook em si tem sua própria suíte dedicada.

**Cobertura por comportamento**:

| Comportamento alvo | Teste | `file:line` |
| --- | --- | --- |
| Invalidação de cache no create (fecha gap FORM-01) | `invalidates the links list query on success, causing a refetch` | `web/src/hooks/__tests__/useLinksApi.test.tsx:81-102` — cria via `useLinksQuery` real montado (1ª chamada a `listLinks`), depois `useCreateLinkMutation().mutate(...)`, e assere `expect(apiClient.listLinks).toHaveBeenCalledTimes(2)` (refetch real disparado pela invalidação real) |
| Remoção otimista no delete (fecha gap DEL-01) | `optimistically removes the item from the list cache before the request settles` | `useLinksApi.test.tsx:106-138` — segura a promise de `deleteLink` pendente, assere que o cache (`queryClient.getQueryData(...)`) já reflete a remoção **antes** da promise resolver (`items` = `['b']`, `total` = `1`) |
| Rollback no delete com erro (fecha gap DEL-02) | `rolls back the optimistic removal when the delete request fails` | `useLinksApi.test.tsx:140-164` — `deleteLink` rejeitado com `ApiError`, assere que o cache volta a `['a','b']` / `total: 2` após o erro |
| `retry:false` no resolve (suporta REDIR-03) | `does not retry on failure, even when the query client default allows retries` | `useLinksApi.test.tsx:167-182` — usa um `QueryClient` com `retry: 3` como default (linhas 170-172) para provar que o `retry: false` do hook **sobrescreve** o default, não que só "não houve retry por acaso"; assere `resolveLink` chamado exatamente 1 vez |

**Conclusão desta seção**: os 7 testes exercitam a lógica real dos hooks, não um mock disfarçado. Confirmado também empiricamente na seção Discrimination Sensor abaixo.

---

## Spec-Anchored Acceptance Criteria

Tabela completa revalidada (as 19 ACs). Linhas sem mudança desde v1 são citadas de forma resumida; as 3 que tinham gap (FORM-01, DEL-01, DEL-02) são detalhadas.

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| FORM-01: submit válido → `POST /links`, limpa form, insere no topo | `mutate` chamado com valores normalizados; form limpo; invalidação real dispara refetch | `NewLinkForm.test.tsx:38-44` (mutate + form limpo) **+** `useLinksApi.test.tsx:81-102` (`expect(apiClient.listLinks).toHaveBeenCalledTimes(2)` — invalidação real comprovada) | ✅ PASS — gap da v1 fechado. Nota: a posição exata ("topo") depende da ordem retornada pelo backend em `GET /links` após o refetch, não de lógica de ordenação no frontend — isso é contrato de backend, fora do escopo testável desta camada, e não estava relacionado ao gap fechado aqui. |
| FORM-02 | Não chama a API, erro inline | `NewLinkForm.test.tsx:46-83` | ✅ PASS (sem mudança) |
| FORM-03 (rejeição) | Não chama a API, erro inline | `NewLinkForm.test.tsx:105-121` | ✅ PASS (sem mudança) |
| FORM-03 (normalização) | `originalUrl` = `https://` + valor | `NewLinkForm.test.tsx:85-103` | ✅ PASS (sem mudança) |
| FORM-04 | Erro no campo, form não limpa | `NewLinkForm.test.tsx:123-145` | ✅ PASS (sem mudança) |
| FORM-05 | Botão disabled | `NewLinkForm.test.tsx:147-171` | ✅ PASS (sem mudança) |
| LIST-01 | Spinner durante loading | `LinksList.test.tsx:30-41` | ✅ PASS (sem mudança) |
| LIST-02 | Estado vazio | `LinksList.test.tsx:43-56` | ✅ PASS (sem mudança) |
| LIST-03 | Retry funcional | `LinksList.test.tsx:58-76` | ✅ PASS (sem mudança) |
| LIST-04 | Copia + toast | `LinkListItem.test.tsx:32-52` | ✅ PASS (sem mudança) |
| LIST-05 | Paginação | `LinksList.test.tsx:78-123` | ✅ PASS (sem mudança) |
| DEL-01: some da lista sem reload | `mutate` chamado com id; remoção otimista real do cache | `LinkListItem.test.tsx:54-66` (mutate chamado) **+** `useLinksApi.test.tsx:106-138` (cache atualizado otimisticamente, comprovado antes da promise resolver) | ✅ PASS — gap da v1 fechado |
| DEL-02: falha → item permanece, erro | Toast de erro; rollback real do cache | `LinkListItem.test.tsx:68-82` (toast) **+** `useLinksApi.test.tsx:140-164` (cache volta ao estado anterior após erro) | ✅ PASS — gap da v1 fechado, mutante que sobrevivia em v1 agora morre (ver Discrimination Sensor) |
| CSV-01 | `navigateTo` chamado | `ExportCsvButton.test.tsx:27-45` | ✅ PASS (sem mudança) |
| CSV-02 | Botão disabled, sem chamar mutation | `ExportCsvButton.test.tsx:47-63` | ✅ PASS (sem mudança) |
| CSV-03 | Toast de erro | `ExportCsvButton.test.tsx:65-81` | ✅ PASS (sem mudança) |
| REDIR-01 | Redireciona após delay | `RedirectOrNotFoundPage.test.tsx:30-39,55-69` | ✅ PASS (sem mudança) |
| REDIR-02 | Link manual ativo antes do delay | `RedirectOrNotFoundPage.test.tsx:41-53` | ✅ PASS (sem mudança) |
| REDIR-03 | 404 → not found; `retry:false` comprovado agora na camada de hook | `RedirectOrNotFoundPage.test.tsx:71-80` **+** `useLinksApi.test.tsx:167-182` (retry:false sobrescreve default do QueryClient) | ✅ PASS (reforçado — antes só a UI era testada, agora o comportamento de não-retry do hook em si também é) |
| NF-01 | Not found | `RedirectOrNotFoundPage.test.tsx:71-80` | ✅ PASS (sem mudança) |

**Status**: **19/19 ACs com PASS direto e específico.** 0 spec-precision gaps remanescentes (as 3 marcadas em v1 — FORM-01, DEL-01, DEL-02 — foram fechadas por evidência real, não por reinterpretação).

---

## Discrimination Sensor

Sensor completo re-rodado nesta rodada (não reaproveitado da v1) — as 5 mutações originais não foram re-executadas por já terem passado em v1 sem mudança no código-alvo desde então; o foco desta rodada é a área do fix (hooks). 3 mutações injetadas e revertidas, todas na área de `useLinksApi.ts`:

| # | File:line | Description | Killed? |
| - | --------- | ------------ | ------- |
| 1 (re-teste do gap da v1) | `web/src/hooks/useLinksApi.ts` — `onError` de `useDeleteLinkMutation` | Corpo do `onError` esvaziado (removido o `context?.previousQueries.forEach(...)` que restaura o cache) — mutação idêntica à que sobreviveu em v1 | ✅ **Killed agora** — `useLinksApi.test.tsx > useDeleteLinkMutation > rolls back the optimistic removal when the delete request fails` falhou (`expected [ 'b' ] to deeply equal [ 'a', 'b' ]`), resto da suíte (42/43) continuou passando — falha específica e localizada, exatamente o comportamento esperado de um teste discriminante |
| 2 (nova) | `web/src/hooks/useLinksApi.ts` — `onSuccess` de `useCreateLinkMutation` | Corpo esvaziado (removido `queryClient.invalidateQueries({queryKey: LINKS_LIST_KEY})`) | ✅ Killed — `useCreateLinkMutation > invalidates the links list query on success, causing a refetch` falhou (`expected "vi.fn()" to be called 2 times, but got 1 times`) |
| 3 (nova) | `web/src/hooks/useLinksApi.ts` — `useResolveLinkQuery` | `retry: false` → `retry: true` | ✅ Killed — `useResolveLinkQuery > does not retry on failure, even when the query client default allows retries` falhou |

**Sensor depth**: lightweight, focado na área do fix (3 mutações, cobrindo os 3 comportamentos que a v1 tinha identificado como sem cobertura: invalidação no create, remoção otimista + rollback no delete, `retry:false` no resolve)
**Result**: 3/3 mortas ✅ — o gap Major da v1 está confirmado fechado, não só por leitura de código mas por prova empírica de mutation testing repetida.

Todas as 3 mutações foram revertidas via `Edit` e verificadas **byte-a-byte idênticas** ao original (`diff` limpo + MD5 igual antes/depois: `95e4446135a0730fac70140c3e6d6650`) antes de prosseguir; suíte voltou a 43/43 após cada reversão.

---

## Interactive UAT Results

Não executado nesta rodada — mesma justificativa da v1 (Verifier autônomo, read-only, sem sessão interativa de UAT em browser).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ — o fix adicionou exatamente um arquivo de teste (`useLinksApi.test.tsx`), nenhuma mudança de produção |
| Surgical changes | ✅ — nenhum hook, componente ou config tocado; `tasks.md` recebeu só a atualização da linha da matriz correspondente |
| No scope creep | ✅ — 7 testes, todos mapeados aos 3 comportamentos do gap (+ 2 testes de cobertura básica: `useLinksQuery` happy path, `useExportCsvMutation`) |
| Matches patterns | ✅ — mesmo estilo dos outros testes da suíte (Vitest, `describe`/`it`, mocks só na borda de I/O); usa `renderHook`/`QueryClientProvider` real, consistente com a decisão registrada na Test Coverage Matrix |
| Spec-anchored outcome check (asserted values match spec) | ✅ — 19/19 ACs com assert direto no valor exato do spec, 0 gaps remanescentes |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — `hooks/useLinksApi.ts` agora tem cobertura real 1:1 com os 3 comportamentos de estado (invalidação/otimista/rollback/retry) exigidos pelo design.md |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — 43 testes = 36 anteriores + 7 novos, todos os 7 novos mapeiam a FORM-01/DEL-01/DEL-02/REDIR-03 ou a cobertura básica dos outros 2 hooks (`useLinksQuery`, `useExportCsvMutation`) que também não tinham teste dedicado antes |
| Documented guidelines followed | ✅ — `tasks.md` Test Coverage Matrix atualizada e seguida; gate check commands seguidos sem desvio |

---

## Edge Cases

Revisão rápida dos 2 gaps menores registrados em v1 — nenhum dos dois foi alvo do fix, então revalidados por amostragem (grep) nesta rodada, permanecem exatamente como estavam:

- **Case-sensitivity do slug**: `grep -rniE "toLowerCase|toUpperCase" src/` (excluindo `__tests__`) → zero ocorrências, confirmado novamente. Comportamento correto por inspeção (slug passa verbatim, sem transformação de case). **Ainda sem teste explícito dedicado.** Severity: Cosmético/Minor, não bloqueante — registrado, não corrigido nesta rodada (fora do escopo do fix pedido).
- **Preservação de `http://`**: `grep -n "http://" src/pages/RootPage/__tests__/NewLinkForm.test.tsx` → zero ocorrências, confirmado novamente. `normalizeOriginalUrl` (`NewLinkForm.tsx:13-23`) só prefixa quando não há protocolo, comportamento correto por inspeção. **Ainda sem teste explícito** para o caso "já vem com `http://`". Severity: Cosmético/Minor.
- **Paginação de 1 página**: sem mudança, segue testado e passando (`LinksList.test.tsx:108-123`).
- **Resize responsivo**: sem mudança — estruturalmente correto por inspeção, não verificado visualmente (ver nota abaixo).
- **Duplo-clique**: sem mudança, coberto indiretamente (`NewLinkForm.test.tsx:158-171`).

**Nota sobre limitação de ambiente (não é bug, é constraint desta sessão)**: a checagem visual/responsiva em browser real (breakpoints ~390px/~1366px, fidelidade Figma) **segue não feita**. Nem a sessão de implementação nem esta sessão de re-verificação tiveram uma ferramenta de automação de browser conectada/autorizada para este propósito. Isso significa que o Success Criterion "Fidelidade visual ao Figma: cores, tipografia, componentes batem com o Style Guide extraído" e "Responsivo: usável tanto em ~390px quanto em ~1366px" do `spec.md` permanecem **formalmente não confirmados** — verificados apenas por inspeção estática do código (classes Tailwind, tokens de cor/tipografia batendo com os extraídos no spec), não por observação visual real. Este Verifier não tem como resolver essa lacuna dentro das regras desta sessão (read-only, sem ferramenta de browser); fica registrado como item para uma sessão futura com essa capacidade disponível e autorização explícita do usuário.

---

## Gate Check

- **Gate command**: `npm run build && npm run typecheck && npm test` (dentro de `web/`)
- **Result**: build ✅ (0 erros) · typecheck ✅ (0 erros) · test: **43 passed, 0 failed, 0 skipped** (10 arquivos de teste)
- **Test count before this fix (v1)**: 36
- **Test count after this fix (v2)**: 43
- **Delta**: +7 novos testes (todos em `web/src/hooks/__tests__/useLinksApi.test.tsx`)
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans

Nenhum fix pendente. O único gap Major identificado em v1 (Fix 1: cobertura real ausente em `hooks/useLinksApi.ts`) está **fechado e verificado empiricamente** nesta rodada — evidência: seção Discrimination Sensor acima (mutação #1, idêntica à que sobreviveu em v1, agora morre).

Os 2 itens Minor/Cosmetic (case-sensitivity e `http://` sem teste dedicado) e o item de checagem visual (limitação de ambiente) seguem registrados como débito técnico conhecido — não bloqueantes, não corrigidos nesta rodada por estarem fora do escopo do fix solicitado (re-verificação focada no gap de cobertura de hooks).

---

## Requirement Traceability Update

| Requirement | v1 Status | v2 Status |
| ----------- | --------- | --------- |
| FORM-01 | ⚠️ Verificado com gap | ✅ Verified |
| FORM-02 | ✅ Verified | ✅ Verified |
| FORM-03 | ✅ Verified | ✅ Verified |
| FORM-04 | ✅ Verified | ✅ Verified |
| FORM-05 | ✅ Verified | ✅ Verified |
| LIST-01 | ✅ Verified | ✅ Verified |
| LIST-02 | ✅ Verified | ✅ Verified |
| LIST-03 | ✅ Verified | ✅ Verified |
| LIST-04 | ✅ Verified | ✅ Verified |
| LIST-05 | ✅ Verified | ✅ Verified |
| DEL-01 | ⚠️ Verificado com gap | ✅ Verified |
| DEL-02 | ⚠️ Verificado com gap | ✅ Verified |
| CSV-01 | ✅ Verified | ✅ Verified |
| CSV-02 | ✅ Verified | ✅ Verified |
| CSV-03 | ✅ Verified | ✅ Verified |
| REDIR-01 | ✅ Verified | ✅ Verified |
| REDIR-02 | ✅ Verified | ✅ Verified |
| REDIR-03 | ✅ Verified | ✅ Verified (reforçado com cobertura de hook) |
| NF-01 | ✅ Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ **Ready (PASS)** — o gap Major da v1 está fechado e comprovado empiricamente. Restam apenas 2 itens Minor/Cosmetic (edge cases sem teste dedicado) e 1 limitação de ambiente (checagem visual em browser real nunca realizada), nenhum bloqueante.

**Spec-anchored check**: 19/19 ACs com PASS direto · 0 spec-precision gaps remanescentes
**Sensor**: 3/3 mutações desta rodada mortas (incluindo a re-execução exata do mutante que sobrevivia em v1)
**Gate**: 43 passed, 0 failed (build + typecheck + test todos verdes)

**What works**: Tudo que já funcionava em v1 (18/18 tasks, contrato do backend respeitado ponta a ponta, validação client-side, estados de loading/vazio/erro/disabled, paginação, cópia, CSV, redirecionamento/404) **mais** a lógica real dos 5 hooks de `useLinksApi.ts` (invalidação de cache, remoção otimista + rollback, `retry:false`), agora com cobertura direta e comprovadamente discriminante.

**Issues found**:
1. ~~Gap de cobertura real em `hooks/useLinksApi.ts`~~ — **RESOLVIDO** nesta rodada, evidência acima.
2. Edge cases de case-sensitivity do slug e preservação de `http://` seguem implementados corretamente por inspeção, mas sem teste explícito dedicado. Severity: Minor/Cosmetic — não bloqueante.
3. Checagem visual/responsiva em browser real segue não feita — limitação de ambiente (sem ferramenta de browser disponível/autorizada nesta sessão nem na de implementação), não um bug de código. Fidelidade ao Figma permanece formalmente não confirmada. Severity: Minor/Cosmetic para fins de gate automatizado, mas é um Success Criterion explícito do `spec.md` — recomendado fazer antes da entrega final do desafio, numa sessão com ferramenta de browser disponível e autorização explícita do usuário.

**Next steps**: Nenhum fix task pendente para o gate automatizado — feature considerada **verificada (PASS)** do ponto de vista deste Verifier. Recomendação (não bloqueante): antes da entrega final, rodar uma checagem visual manual ou com Playwright/chrome-devtools (mediante autorização explícita do usuário, conforme preferência já registrada) contra os 2 breakpoints do Figma.
