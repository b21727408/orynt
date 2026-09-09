# V1 Development Workflow & Repository Governance

## Core rule

`main` is PR-only.

- never develop directly on `main`
- never commit implementation changes directly to `main`
- never push implementation changes directly to `main`
- every change reaches `main` through a pull request
- required CI checks must pass before merge
- force-push and deletion of `main` are disabled
- emergency fixes still use branch + PR

For a solo repository, required approval count may initially be zero to avoid self-approval deadlock. The PR boundary and required checks remain mandatory.

Configure the GitHub ruleset/branch protection after the first CI run establishes stable check names.

## Branch convention

Human branches:

```text
<type>/<short-kebab-description>
```

Codex branches:

```text
codex/<type>/<short-kebab-description>
```

Examples:

```text
feat/work-run-backbone
fix/stage-history-rewind
codex/chore/foundation-scaffold
codex/feat/work-run-backbone
security/process-boundary-hardening
```

Common types:

```text
feat
fix
chore
refactor
test
build
ci
perf
security
```

`docs` branches are human-owned because repository coding agents may not modify documentation.

Avoid vague names such as `misc`, `changes`, `wip`, `final`, or `new`.

## Commit convention

Use Conventional Commits:

```text
<type>(<optional-scope>): <imperative summary>
```

Examples:

```text
chore(scaffold): establish Cargo workspace
feat(work): persist work items
fix(runtime): preserve cancellation result
test(storage): cover migration recovery
security(runtime): validate workspace paths
```

Prefer one logical concern per commit. Do not create meaningless micro-commits or vague `WIP` commits.

## Pull request title

Use the same Conventional Commit form.

Example:

```text
chore(scaffold): establish Orynt foundation workspace
```

Default merge strategy: **Squash and Merge**.

The squash commit title should match the PR title.

## Pull request description

Every PR uses this format:

```markdown
## Summary
What changed?

## Why
Why is this change needed?

## Scope
What is intentionally included?

## Non-goals
What is intentionally not implemented?

## Verification
- [ ] formatting
- [ ] lint/typecheck
- [ ] Rust tests
- [ ] frontend tests
- [ ] build/check
- [ ] dependency/security checks where relevant
- [ ] E2E where relevant

List the actual commands run and their results.

## Architecture & Decisions
- Which documented boundaries were exercised?
- Did this introduce a new abstraction/port/module?
- Did any unresolved architectural/product decision appear?
- Documentation changed: **No** for Codex-authored PRs.

## Security & Trust Impact
State `None` or describe new/changed filesystem, process, network, secret, model-data, connector, or destructive-action surface.

## Persistence / Migration Impact
State `None` or describe schema/migration behavior and recovery implications.

## New Dependencies
State `None` or list every dependency and why the existing stack was insufficient.

## Risks / Known Limitations
Meaningful risks, tradeoffs, follow-up items, or limitations.

## UI Evidence
For user-visible UI changes: screenshots/recording and affected flow.
Otherwise: `Not applicable`.

## Checklist
- [ ] Existing implementation was inspected before adding abstractions.
- [ ] No unrelated refactor is included.
- [ ] No direct commit/push to `main` was made.
- [ ] Required checks pass.
- [ ] No fake success path or silent fallback was introduced.
- [ ] No unused dependency/file/export was introduced.
- [ ] Repository documentation was not modified by a coding agent.
- [ ] Important unresolved decisions were raised to the user instead of being invented.
```

PR descriptions should be useful, not padded with generic prose.

## Documentation ownership

These paths are **read-only to Codex and all repository coding agents**:

```text
AGENTS.md
FOUNDATION.md
docs/**
```

A coding agent must never edit, create, delete, rename, auto-format, regenerate, or "keep in sync" those paths, even when it believes documentation is outdated.

If implementation conflicts with documentation:

1. stop before implementing the conflicting decision
2. explain the conflict
3. identify the exact decision needed
4. present concise options/tradeoffs
5. recommend one option
6. wait for the user

After the user decides, implementation may continue within the decision. The coding agent still does not modify repository documentation.

## Important-decision gate

Codex should not interrupt for routine implementation details.

It **must stop and ask** before an undocumented lasting decision involving:

- V1 scope or terminology
- crate/dependency direction
- foundational technology/framework changes
- frontend state ownership
- Run/history/revision semantics
- policy/guard/human-control behavior
- local/cloud/security trust boundaries
- persistence strategy or destructive migration semantics
- a broad new cross-cutting abstraction
- a new unrestricted filesystem/process/network capability
- weakening a required quality/security check

Use:

```text
Decision required: <short title>

Context:
<why this cannot proceed safely without a decision>

Options:
A. ...
B. ...
C. ...

Tradeoffs:
...

Recommendation:
...

Blocked work:
<what remains untouched until the decision is made>
```

## Codex repository workflow

For implementation tasks, Codex should:

1. confirm the working tree is clean
2. create the requested `codex/...` branch from current `main`
3. implement only the requested scope
4. run required checks
5. inspect the final diff
6. create focused commit(s)
7. push the branch
8. open a pull request
9. fill the required PR description completely
10. never auto-merge

If push/PR creation is unavailable because of GitHub auth/tooling, stop after local commits and report the exact blocker. Never fall back to committing to `main`.

## CI and hooks

CI is authoritative.

Local hooks are convenience only and should call the same repository commands as CI, not duplicate quality logic in a custom framework.

Plan:

- GitHub Actions in Milestone 0
- fast local hooks after scaffold is green
- branch protection/ruleset after CI check names exist
- dependency update automation after the baseline repo is stable

A self-hosted runner may supplement CI for platform-specific workloads, but core CI should not depend exclusively on one developer machine.

## Merge policy

Default:

- PR
- required checks green
- unresolved decision requests resolved
- human review
- squash merge
- delete source branch after merge

No direct push to `main`.
No initial auto-merge for Codex-created PRs.
