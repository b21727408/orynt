# AGENTS.md — Orynt Repository Instructions

This is the short operating guide for Codex and other coding agents in this repository.

Detailed product/engineering decisions live in `docs/` and remain the source of truth. Keep this file short enough that agents actually follow it.

## Before changing code

1. Read `docs/v1/scope.md`.
2. Read the relevant sections of `docs/v1/architecture.md` and `docs/v1/terminology.md`.
3. Read `docs/v1/quality.md` before adding dependencies, abstractions, test infrastructure, or suppressions.
4. Read `docs/v1/ux.md` for desktop/UI behavior.
5. Read `docs/v1/scaffold.md` before changing crate/module boundaries.
6. Inspect/search the existing implementation before introducing a new type, trait, helper, service, store, or module.

Do not rewrite product decisions to make an implementation easier unless the task explicitly changes the decision.

## Change discipline

- Prefer the smallest change that correctly solves the task.
- Do not perform unrelated refactors.
- Do not implement hypothetical future requirements.
- Preserve architectural seams that the docs explicitly require now.
- Reuse an existing concept before creating a second representation of it.
- Prefer deleting/replacing obsolete code over leaving parallel `new`, `v2`, `final`, or `legacy` paths.
- Do not create empty modules, placeholder services, or unused abstractions to mirror diagrams.
- Avoid generic dumping grounds such as `utils`, `helpers`, `common`, `manager`, `service`, or `factory` unless the name describes a genuinely cohesive current responsibility.
- Keep public APIs narrow.

## Dependency discipline

- Do not add a dependency if the standard library/current stack reasonably solves the problem.
- Every new dependency needs a current consumer.
- In the final summary, state every new dependency and why it was necessary.
- Do not add overlapping libraries for the same role without explicit justification.
- Remove unused dependencies introduced by the change.

## Architecture

- `core` is vendor/framework/infrastructure independent.
- Do not put Tauri, SQLx, reqwest, Jira, GitHub, HTTP DTOs, UI concepts, or persistence records into `core`.
- `orchestration` should be deterministic/pure where practical and must not reach directly into SQLite/network/provider APIs.
- `application` coordinates use cases and ports.
- `storage`, `runtime`, and `connectors` are adapters/infrastructure.
- Tauri handlers are transport/composition code, not business logic.
- Provider-specific concepts stop at adapter boundaries.
- Persistence models are not canonical domain models.
- UI code does not own orchestration/domain rules.

## Frontend state

- Rust runtime + SQLite own canonical application state.
- TanStack Query owns backend/runtime projections and cache.
- Zustand owns UI/session/workspace state.
- React local state is for truly component-local state.
- Do not duplicate entire Runs/WorkItems/backend collections into Zustand.
- Prefer URL/router state for deep-linkable navigation where appropriate.

## Code quality

- Prefer explicit readable code over clever/generic code.
- Search before creating a new abstraction.
- Do not silently convert errors into defaults/success.
- A compiling placeholder is not a completed implementation.
- Do not leave unconditional fake-success `Ok(Default::default())` behavior.
- Avoid `unwrap()` / `expect()` in production paths unless the invariant is genuinely impossible to violate and the reason is clear.
- Do not add broad lint suppressions to make generated code pass.
- Avoid unnecessary cloning, `Arc<Mutex<_>>`, boxed dynamic dispatch, and generic factories.
- Do not add comments that merely restate the code; document non-obvious invariants and decisions.
- Remove dead code/imports/files created by the change.
- AI-generated code is production code and receives the same quality bar as human-written code.

## Testing

- Test meaningful behavior/invariants, not private implementation details.
- Add regression coverage for fixed bugs when practical.
- Prefer small fakes/in-memory adapters over a mocking framework until a mock framework proves necessary.
- Do not assert exact free-form LLM prose when structured/semantic assertions can test the contract.
- Orchestration, guard, policy, routing, rewind and triage logic must gain scenario tests as they arrive.
- Never weaken a test merely to make a change pass without understanding the failure.

## Before declaring completion

Run the checks required by `docs/v1/quality.md` for the touched surface.

At minimum:

- format
- lint/typecheck
- relevant tests
- build/check

Also verify:

- no unrelated files changed
- no accidental dependency was added
- no source-of-truth product decision was silently changed
- errors remain observable
- history/audit semantics are preserved where relevant
- no fake success or hidden fallback was introduced

Final response must summarize:

1. what changed,
2. why,
3. checks/tests run and results,
4. architectural impact,
5. every new dependency and its justification.
