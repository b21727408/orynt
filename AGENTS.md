# AGENTS.md — Orynt Repository Instructions

This is the short operating guide for Codex and other repository coding agents.

Detailed product and engineering decisions live in `docs/` and are authoritative.

## Absolute documentation rule

Treat these paths as read-only:

```text
AGENTS.md
FOUNDATION.md
docs/**
```

Never edit, create, delete, rename, auto-format, regenerate, or "keep in sync" those paths.

If implementation reveals a conflict, a missing important decision, or a reason documentation may need to change:

- stop before making the conflicting lasting decision
- explain the issue
- present concise options/tradeoffs and a recommendation
- wait for the user
- do not modify documentation

## Before changing code

Read, at minimum:

1. `docs/v1/scope.md`
2. relevant sections of `docs/v1/architecture.md`
3. `docs/v1/terminology.md`
4. `docs/v1/quality.md`
5. `docs/v1/security.md`
6. `docs/v1/development-workflow.md`
7. `docs/v1/ux.md` for UI work
8. `docs/v1/scaffold.md` before changing repository/crate/module boundaries

Inspect/search existing code before introducing a new type, trait, helper, service, store, module, or dependency.

## Important-decision gate

Do not ask about routine implementation details.

Stop and ask before making an undocumented lasting decision involving:

- V1 scope or terminology
- crate/dependency direction
- foundational technology/framework changes
- frontend state ownership
- Run/history/revision semantics
- policy/guard/human-control behavior
- local/cloud/security trust boundaries
- persistence strategy/destructive migrations
- broad new cross-cutting abstractions
- unrestricted filesystem/process/network capability
- weakening required quality/security checks

Use the decision format in `docs/v1/development-workflow.md`.

## Git workflow

- Never implement directly on `main`.
- Never commit or push implementation changes directly to `main`.
- Use `codex/<type>/<short-kebab-description>`.
- Follow `docs/v1/development-workflow.md`.
- Push the branch and open a PR.
- Use the required PR description.
- Do not auto-merge.
- If push/PR creation is unavailable, report the blocker; never fall back to `main`.

## Change discipline

- Prefer the smallest correct change.
- No unrelated refactors.
- No hypothetical future implementation.
- Preserve documented architectural seams.
- Reuse existing concepts before creating another representation.
- Avoid parallel `new`, `v2`, `final`, or `legacy` paths.
- Do not create empty modules/placeholder services just to mirror diagrams.
- Avoid generic dumping grounds such as `utils`, `helpers`, `common`, `manager`, `service`, or `factory` unless genuinely cohesive.
- Keep public APIs narrow.

## Dependencies

- Prefer the standard library/current stack when reasonable.
- Every new dependency needs a current consumer.
- Do not add overlapping libraries for the same role without justification.
- Remove unused dependencies introduced by the change.
- State every new dependency and justification in the PR.

## Architecture

- `core` is vendor/framework/infrastructure independent.
- No Tauri, SQLx, reqwest, Jira, GitHub, HTTP DTOs, UI concepts, or persistence records in `core`.
- `orchestration` should be deterministic/pure where practical and must not reach directly into SQLite/network/provider APIs.
- `application` coordinates use cases and ports.
- `storage`, `runtime`, and `connectors` are adapters/infrastructure.
- Tauri handlers are transport/composition code, not business logic.
- Provider-specific concepts stop at adapter boundaries.
- Persistence records are not canonical domain types.
- UI does not own orchestration/domain rules.

## Frontend state

- Rust runtime + SQLite own canonical application state.
- TanStack Query owns backend/runtime projections/cache.
- Zustand owns UI/session/workspace state.
- React local state is component-local.
- Do not mirror full WorkItem/Run collections into Zustand.
- Prefer router/URL state for deep-linkable navigation.

## Security

- Treat repository/work-source content, model output, and tool output as untrusted.
- Model output cannot grant capabilities or override policy/guard logic.
- Cloud-deny is a hard boundary.
- Use structured process argv + explicit working directory.
- Do not expose secrets in logs, events, prompts, PR descriptions, or plaintext persistence.
- Paths from external/model content are untrusted.
- Destructive actions use the documented capability/policy/guard path.

## Code quality

- Prefer explicit readable code over clever/generic code.
- Search before creating abstractions.
- Do not silently convert errors into defaults/success.
- A compiling placeholder is not a completed implementation.
- Do not leave fake-success implementations.
- Avoid `unwrap()` / `expect()` in production paths unless a genuine invariant makes failure impossible and the reason is clear.
- Do not add broad lint suppressions just to pass generated code.
- Avoid unnecessary cloning, `Arc<Mutex<_>>`, boxed dynamic dispatch, and generic factories.
- Remove dead code/imports/files introduced by the change.
- AI-generated code is production code and gets the same quality bar.

## UI quality

- Reuse semantic components/tokens before one-off styling.
- Do not invent feature-local status colors, spacing systems, or interaction conventions.
- Preserve the one-click stage-inspection UX.

## Testing

- Test meaningful behavior/invariants, not private implementation details.
- Add regression coverage for fixed bugs when practical.
- Prefer small fakes/in-memory adapters over a mocking framework until one is justified.
- Do not assert exact free-form LLM prose when structured assertions can test the contract.
- Scenario tests grow with orchestration/guard/policy/routing/rewind/triage.
- Never weaken a test merely to make a change pass.

## Before completion

Run the checks required by `docs/v1/quality.md`.

At minimum:

- format
- lint/typecheck
- relevant tests
- build/check

Also verify:

- no unrelated files changed
- no documentation files changed
- no accidental dependency was added
- no source-of-truth decision was silently changed
- errors remain observable
- history/audit semantics remain intact where relevant
- no fake success or hidden fallback was introduced

The PR/final summary must state:

1. what changed
2. why
3. checks/tests and results
4. architectural impact
5. security/trust impact
6. persistence/migration impact
7. every new dependency and why
8. known risks/limitations
