# V1 Quality Strategy

## 1. Principle

> **Build a quality system, not a quality framework.**

Orynt targets enterprise-grade reliability, but that does not mean reimplementing linters, scanners or CI systems.

Use mature standard tools for generic software quality.

Write Orynt-specific tests for Orynt-specific invariants.

```text
Generic software quality
    → compiler + standard tools

Orynt product correctness
    → unit/integration/scenario/eval tests
```

A custom generic checker/framework is not part of V1.

## 2. Why this is the enterprise choice

A custom linter/checker creates its own:

- false positives
- parser/version maintenance
- IDE/CI integration burden
- documentation burden
- test suite
- security surface

Fortune-100 quality comes from enforceable controls, evidence, reproducibility and disciplined architecture—not from owning every tool.

We only automate a custom rule after the real codebase repeatedly proves that standard boundaries/tools do not enforce an important invariant.

> **Repeated architectural mistakes may earn automated enforcement. Speculative mistakes do not.**

## 3. AI-generated code policy

There is no lower standard for AI-generated code.

If code can merge, it is production code.

Codex or another coding agent must not be allowed to "complete" work by:

- creating fake success paths
- swallowing errors
- disabling lint rules without a narrow documented reason
- introducing duplicate domain concepts
- adding unused dependencies
- inventing speculative abstractions
- creating parallel `new`, `v2`, `final`, `legacy` implementations instead of resolving the existing design
- performing unrelated refactors
- moving domain/orchestration logic into the UI
- leaking provider DTOs into `core`

`AGENTS.md` carries the short agent-facing directives. This file is the detailed source of truth.

## 4. Rust baseline

Required from scaffold:

### Formatting

```bash
cargo fmt --all --check
```

### Lint

```bash
cargo clippy --workspace --all-targets --all-features -- -D warnings
```

Do not globally enable every pedantic Clippy lint for appearance. Add targeted lints when they provide proven value.

### Tests

Use `cargo-nextest` for the main Rust test run.

```bash
cargo nextest run --workspace
```

Run doc tests separately when meaningful because nextest does not replace every Cargo test mode.

### Dependency and supply-chain policy

```text
cargo-deny
cargo-machete
```

`cargo-deny` covers Rust advisories/license/source policy. We do not run a second identical Rust advisory scanner merely to increase tool count.

`cargo-machete` detects unused Cargo dependencies and helps prevent AI-generated dependency residue.

### Safe Rust

Application-owned code is safe by default.

- `core`, `orchestration`, `application`: forbid unsafe code
- aim to forbid unsafe in all Orynt-owned crates
- if a future native integration requires unsafe, isolate it in a narrow dedicated boundary and explicitly review/document it

## 5. TypeScript / React baseline

Required from scaffold:

- TypeScript strict
- ESLint
- Prettier
- Vitest
- React Testing Library
- Knip

Recommended compiler strictness includes:

```text
strict
noUncheckedIndexedAccess
exactOptionalPropertyTypes
noImplicitOverride
noFallthroughCasesInSwitch
```

Enable other strict options when compatible with the selected toolchain.

Do not relax type safety simply to satisfy generated code.

### Knip

Use to catch:

- unused files
- unused exports
- unused dependencies

This is particularly useful against AI-created dead surface area.

## 6. Playwright

Add with the first real user-facing vertical slice, not to an empty shell.

First critical flow should cover something like:

```text
Create Work
→ Start Run
→ stage state progresses
→ inspect a stage
→ restart/reopen
→ history remains
```

Over time Playwright covers a small set of business-critical flows rather than every visual detail.

## 7. Coverage

Add `cargo-llvm-cov` in early V1 / Milestone 1.

Initially:

- measure
- publish/report
- inspect risk gaps

Do not immediately set an arbitrary repository-wide 90% gate.

High percentage targets often cause low-value tests, especially when coding agents optimize for the metric.

Critical modules may later receive explicit stronger expectations:

- guard
- policy enforcement
- rewind/history invariants
- routing constraints
- security-sensitive execution logic

The objective is **risk coverage**, not vanity coverage.

## 8. Mutation testing

`cargo-mutants` is deferred until critical deterministic logic exists.

Best targets later:

- guard
- policy evaluation
- routing
- rewind/downstream invalidation
- triage/planning deterministic rules

It is not an architectural dependency and can be added safely later.

## 9. Architecture enforcement

We do not build a custom architecture checker at scaffold time.

Primary enforcement:

1. Cargo crate dependency direction
2. Rust visibility/public API design
3. `AGENTS.md`
4. code review
5. focused regression tests for repeated important violations

Examples:

- `core` simply does not depend on Tauri, SQLx, reqwest, Jira or GitHub
- Tauri handlers call application use cases rather than owning orchestration
- persistence DTOs are mapped at adapter boundaries

If a rule repeatedly escapes these controls, add the smallest automated test/check that proves the invariant. Do not start by building a DSL or checker platform.

## 10. Dependency policy

A dependency has operational and security cost.

Before adding one:

- search the current stack for an existing solution
- prefer standard library/simple code for small problems
- verify a present consumer exists
- justify why it is needed
- avoid overlapping libraries for the same role

Lockfiles are committed.

Dependency updates should be deliberate and reviewable. Automated update tooling can be enabled when the repository exists, but the repository should not accept unreviewed automatic merges.

## 11. Error quality

Forbidden pattern:

> turn an unexpected failure into a default/success value merely to keep execution going.

Errors should:

- preserve context
- remain observable through logs/events
- distinguish retryable vs terminal cases where it matters
- avoid leaking secrets
- map cleanly to user-facing state when crossing the application boundary

## 12. Testing strategy

### Unit tests

For local deterministic behavior and invariants.

### Integration tests

For boundaries such as:

- SQLite repositories
- migrations
- application use case + repository adapter
- runtime process execution
- connector mapping

Prefer small fakes/in-memory adapters over a mocking framework until mocks prove useful.

### Frontend tests

React Testing Library tests user-visible behavior and interaction, not implementation details.

### End-to-end tests

Playwright for critical desktop flows.

### Scenario tests

Begin when orchestration/triage/policies arrive.

Do not invent a scenario engine first.

Example:

```text
Input
- high-risk auth change
- cloud implementation denied

Expected
- security-sensitive verification/review required
- forbidden cloud model never selected
- failure cannot be marked complete
```

Plain structured fixtures + normal Rust tests are sufficient.

### Golden runs / eval regression

Later, selected real executions can become sanitized regression fixtures.

Compare dimensions such as:

- success
- cost
- stage count
- rewinds
- review findings
- human interventions

The **feature** is deferred, but V1 preserves structured Run/Stage/Event/Decision/ModelCall/ToolCall history so the data required later is not lost.

## 13. Definition of Done

For every change, run checks relevant to the touched surface.

Baseline:

```text
Formatting                    PASS
Lint / typecheck              PASS
Relevant tests                PASS
Build/check                   PASS
Dependency policy             PASS where dependencies changed
```

Then apply risk-specific checks.

Examples:

```text
DB change
→ migration/integration test

orchestration change
→ scenario/regression test

guard/policy change
→ negative-path tests

UI critical flow
→ Playwright when applicable

new dependency
→ cargo-deny/Knip/machete + justification
```

## 14. CI philosophy

CI is authoritative; local hooks are convenience only.

Start with a small understandable pipeline rather than dozens of jobs.

Conceptual groups:

```text
quality
- rustfmt
- clippy
- TypeScript typecheck
- ESLint
- Prettier
- Knip

tests
- cargo-nextest
- Vitest
- builds
- later Playwright

dependency/security
- cargo-deny
- cargo-machete
- appropriate JS dependency advisory check
```

Do not create an internal CI abstraction/framework.

## 15. Agent completion checklist

Before an agent says a task is complete:

1. inspect existing implementation before introducing abstractions
2. make the smallest correct change
3. format
4. lint/typecheck
5. run relevant tests
6. run dependency checks if dependency files changed
7. verify no unrelated changes
8. verify no silent fallback/fake success
9. summarize architecture impact
10. state every new dependency and why it was required
