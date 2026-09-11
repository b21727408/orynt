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
