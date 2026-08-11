# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — When a project defers repository/DB-layer tests to manual smoke testing, persist the smoke test's evidence (log/script output) so a later AC covering DB-only behavior (e.g. unique-constraint release after delete) isn't left with zero auditable evidence.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `backend-api` · harmful: 0
- features: backend-api
- evidence: DEL-03 / .specs/features/backend-api/validation.md (backend-api)
- last seen: 2026-08-10T21:45:06Z

### L-002 — When a component test mocks the entire hooks/data-layer module, add at least one test that exercises the real hook (e.g. via renderHook + a real QueryClientProvider) so optimistic-update and rollback logic isn't left with zero real coverage.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `frontend-web,hooks,react-query` · harmful: 0
- features: frontend-web
- evidence: web/src/hooks/useLinksApi.ts:58-62 (mutation #6, validation.md Discrimination Sensor) (frontend-web,hooks,react-query)
- last seen: 2026-08-11T23:01:09Z

### L-003 — A test coverage matrix that claims a layer is 'exercised indirectly' by component tests must be verified against whether those component tests actually mock that layer away — if they do, the claim is false and the layer has zero real coverage.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `frontend-web,test-coverage-matrix` · harmful: 0
- features: frontend-web
- evidence: validation.md — FORM-01/DEL-01/DEL-02 spec-anchored AC table (frontend-web,test-coverage-matrix)
- last seen: 2026-08-11T23:01:09Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
